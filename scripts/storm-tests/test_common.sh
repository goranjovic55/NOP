#!/bin/bash
# Common functions for STORM test scenarios

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_CONTAINER="nop-backend-1"
RESULTS_DIR="$(dirname "$0")/../results"
MONITOR_PIDS=()

# Logging functions
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Banner function
print_banner() {
    local scenario_name="$1"
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${CYAN}STORM TEST SCENARIO${NC}                                   ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  ${scenario_name}                                                 ${BLUE}║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if backend container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
        log_error "Backend container '$BACKEND_CONTAINER' not running"
        log_info "Start it with: docker-compose up -d backend"
        exit 1
    fi
    
    # Check if backend has NET_RAW capability
    if ! docker exec "$BACKEND_CONTAINER" capsh --print | grep -q "cap_net_raw"; then
        log_warning "Backend container may not have NET_RAW capability"
        log_info "This may limit storm functionality"
    fi
    
    # Check API is accessible
    if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
        log_error "Backend API not accessible at http://localhost:8000"
        exit 1
    fi
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    log_success "Prerequisites validated"
}

# Check if target container exists and is running
check_target() {
    local container_name="$1"
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_error "Target container '$container_name' not found or not running"
        log_info "Start test environment with: ./setup_storm_test_env.sh"
        return 1
    fi
    
    return 0
}

# Get container IP
get_container_ip() {
    local container_name="$1"
    docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$container_name"
}

# Start background monitor
start_monitor() {
    local target_ip="$1"
    local threshold_pps="$2"
    local container_name="$3"
    local target_port="${4:-80}"
    local log_file="${5:-$RESULTS_DIR/monitor_${container_name}_$(date +%Y%m%d_%H%M%S).log}"
    
    log_step "Starting monitor for $container_name ($target_ip:$target_port) with threshold ${threshold_pps} PPS"
    
    # Use the enhanced storm_monitor.sh
    ../../storm_monitor.sh "$threshold_pps" "$container_name" "$target_port" > "$log_file" 2>&1 &
    
    local monitor_pid=$!
    MONITOR_PIDS+=($monitor_pid)
    
    log_info "Monitor started (PID: $monitor_pid, log: $log_file)"
    
    # Give monitor time to initialize
    sleep 2
    
    return 0
}

# Execute storm via API
execute_storm() {
    local target_ip="$1"
    local target_port="$2"
    local pps="$3"
    local duration="$4"
    local packet_type="${5:-tcp}"
    local tcp_flags="${6:-SYN}"
    
    log_step "Executing STORM: $packet_type to $target_ip:$target_port at ${pps} PPS for ${duration}s"
    
    # Build JSON payload
    local payload=$(cat <<EOF
{
  "interface": "eth0",
  "packet_type": "$packet_type",
  "dest_ip": "$target_ip",
  "dest_port": $target_port,
  "pps": $pps,
  "tcp_flags": ["$tcp_flags"]
}
EOF
)
    
    # Start storm
    log_info "Starting storm..."
    local response=$(curl -s -X POST http://localhost:8000/api/v1/traffic/storm/start \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | grep -q "error"; then
        log_error "Failed to start storm: $response"
        return 1
    fi
    
    log_success "Storm started"
    
    # Monitor progress
    local elapsed=0
    while [ $elapsed -lt $duration ]; do
        sleep 5
        elapsed=$((elapsed + 5))
        
        # Get current metrics
        local metrics=$(curl -s http://localhost:8000/api/v1/traffic/storm/metrics)
        local current_pps=$(echo "$metrics" | grep -o '"current_pps":[0-9]*' | cut -d: -f2)
        local packets_sent=$(echo "$metrics" | grep -o '"packets_sent":[0-9]*' | cut -d: -f2)
        
        if [ -n "$current_pps" ]; then
            log_info "Progress: ${elapsed}/${duration}s | PPS: $current_pps | Packets: $packets_sent"
        fi
    done
    
    # Stop storm
    log_info "Stopping storm..."
    curl -s -X POST http://localhost:8000/api/v1/traffic/storm/stop > /dev/null
    
    log_success "Storm completed"
    
    # Get final metrics
    sleep 1
    local final_metrics=$(curl -s http://localhost:8000/api/v1/traffic/storm/metrics)
    echo "$final_metrics" > "$RESULTS_DIR/storm_metrics_$(date +%Y%m%d_%H%M%S).json"
    
    return 0
}

# Execute storm using direct Python call (alternative method)
execute_storm_direct() {
    local target_ip="$1"
    local target_port="$2"
    local pps="$3"
    local duration="$4"
    local packet_type="${5:-tcp}"
    
    log_step "Executing STORM (direct): $packet_type to $target_ip:$target_port at ${pps} PPS for ${duration}s"
    
    local python_script=$(cat <<'EOF'
import sys
from scapy.all import *
import time
import threading

target_ip = sys.argv[1]
target_port = int(sys.argv[2])
pps = int(sys.argv[3])
duration = int(sys.argv[4])
packet_type = sys.argv[5] if len(sys.argv) > 5 else "tcp"

packets_sent = 0
running = True

def send_packets():
    global packets_sent, running
    interval = 1.0 / pps
    
    while running and time.time() < start_time + duration:
        if packet_type == "tcp":
            pkt = IP(dst=target_ip)/TCP(dport=target_port, flags="S")
        elif packet_type == "udp":
            pkt = IP(dst=target_ip)/UDP(dport=target_port)
        else:
            pkt = IP(dst=target_ip)
        
        send(pkt, verbose=0)
        packets_sent += 1
        time.sleep(interval)

start_time = time.time()
thread = threading.Thread(target=send_packets)
thread.start()
thread.join()

print(f"Sent {packets_sent} packets in {duration} seconds")
EOF
)
    
    docker exec "$BACKEND_CONTAINER" python3 -c "$python_script" \
        "$target_ip" "$target_port" "$pps" "$duration" "$packet_type"
    
    return 0
}

# Validate test results
validate_results() {
    local expected_outcome="$1"
    
    log_step "Validating test results..."
    
    # Check if monitors detected anything
    local detections=0
    for pid in "${MONITOR_PIDS[@]}"; do
        if ! kill -0 $pid 2>/dev/null; then
            detections=$((detections + 1))
            log_info "Monitor (PID: $pid) terminated - likely detected threshold breach"
        fi
    done
    
    if [ "$expected_outcome" == "shutdown" ] && [ $detections -gt 0 ]; then
        log_success "Test PASSED: Expected shutdown detected"
        return 0
    elif [ "$expected_outcome" == "no_shutdown" ] && [ $detections -eq 0 ]; then
        log_success "Test PASSED: No unexpected shutdowns"
        return 0
    else
        log_warning "Test result unclear - review logs"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_step "Cleaning up..."
    
    # Stop all monitors
    for pid in "${MONITOR_PIDS[@]}"; do
        if kill -0 $pid 2>/dev/null; then
            log_info "Stopping monitor (PID: $pid)"
            kill $pid 2>/dev/null || true
        fi
    done
    
    # Ensure storm is stopped
    curl -s -X POST http://localhost:8000/api/v1/traffic/storm/stop > /dev/null 2>&1 || true
    
    # Restart any stopped containers
    log_info "Restarting stopped test containers..."
    docker-compose -f ../../docker-compose.test.yml start > /dev/null 2>&1 || true
    
    log_success "Cleanup complete"
}

# Trap cleanup on exit
trap cleanup EXIT INT TERM

# Export functions
export -f log_info log_success log_warning log_error log_step
export -f print_banner check_prerequisites check_target get_container_ip
export -f start_monitor execute_storm execute_storm_direct validate_results cleanup
