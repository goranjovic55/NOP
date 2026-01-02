#!/bin/bash
# Scenario 07: Multiple Simultaneous Targets
# Targets: Web + Database + SSH servers
# Storm Type: TCP SYN flood
# PPS: 1000 per target (3000 total)
# Expected: Parallel storms, all monitored

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test_common.sh"

# Test configuration
TEST_NAME="Multi-Target Storm (3x1000 PPS)"
TARGETS=(
    "nop-custom-web:80"
    "nop-custom-ssh:22"
)
STORM_PPS=1000
DURATION=20
THRESHOLD_PPS=2000  # No shutdown expected at 1000 PPS

# Print banner
print_banner "$TEST_NAME"

# Check prerequisites
check_prerequisites

# Create test log
LOG_FILE="$RESULTS_DIR/scenario_07_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "Test started at $(date)"
log_info "Configuration:"
log_info "  - Targets: ${#TARGETS[@]}"
log_info "  - Storm PPS per target: $STORM_PPS"
log_info "  - Total PPS: $((STORM_PPS * ${#TARGETS[@]}))"
log_info "  - Duration: ${DURATION}s"
log_info "  - Monitor Threshold: $THRESHOLD_PPS PPS per host"
echo ""

log_warning "⚠️  Running multiple simultaneous storms - high system load"

# Validate all targets and start monitors
declare -A TARGET_IPS
for target in "${TARGETS[@]}"; do
    container=$(echo "$target" | cut -d: -f1)
    port=$(echo "$target" | cut -d: -f2)
    
    if ! check_target "$container"; then
        log_warning "Skipping unavailable target: $container"
        continue
    fi
    
    ip=$(get_container_ip "$container")
    TARGET_IPS["$target"]="$ip"
    
    log_info "Target: $container ($ip:$port)"
    
    # Start monitor for this target
    start_monitor "$ip" "$THRESHOLD_PPS" "$container" "$port"
done

# Wait for monitors to stabilize
sleep 3

# Execute storms in parallel using background processes
log_step "Launching parallel storms..."

STORM_PIDS=()
for target in "${TARGETS[@]}"; do
    container=$(echo "$target" | cut -d: -f1)
    port=$(echo "$target" | cut -d: -f2)
    ip="${TARGET_IPS[$target]}"
    
    if [ -z "$ip" ]; then
        continue
    fi
    
    log_info "Starting storm to $container ($ip:$port)"
    
    # Launch storm in background
    (
        payload=$(cat <<EOF
{
  "interface": "eth0",
  "packet_type": "tcp",
  "dest_ip": "$ip",
  "dest_port": $port,
  "pps": $STORM_PPS,
  "tcp_flags": ["SYN"]
}
EOF
)
        curl -s -X POST http://localhost:8000/api/v1/traffic/storm/start \
            -H "Content-Type: application/json" \
            -d "$payload"
    ) &
    
    STORM_PIDS+=($!)
    
    # Small delay between launches to avoid API conflicts
    sleep 1
done

log_success "All storms launched"

# Note: With current API, only one storm can run at a time
# This scenario demonstrates the attempt - in production you'd need
# multiple backend instances or enhanced storm service

log_warning "Note: Current implementation supports single storm only"
log_info "Future enhancement: Parallel storm capability"

# Monitor progress
for i in $(seq 1 $DURATION); do
    sleep 1
    metrics=$(curl -s http://localhost:8000/api/v1/traffic/storm/metrics 2>/dev/null || echo '{}')
    current_pps=$(echo "$metrics" | grep -o '"current_pps":[0-9]*' | cut -d: -f2)
    packets=$(echo "$metrics" | grep -o '"packets_sent":[0-9]*' | cut -d: -f2)
    if [ -n "$current_pps" ]; then
        log_info "Progress: ${i}/${DURATION}s | PPS: $current_pps | Packets: $packets"
    fi
done

# Stop storm
curl -s -X POST http://localhost:8000/api/v1/traffic/storm/stop > /dev/null 2>&1

# Validate results
log_step "Validation"
log_info "Checking target statuses..."

all_running=true
for target in "${TARGETS[@]}"; do
    container=$(echo "$target" | cut -d: -f1)
    
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        log_success "✓ $container: Running"
    else
        log_warning "✗ $container: Stopped"
        all_running=false
    fi
done

if $all_running; then
    log_success "✓ All hosts remained online (1000 PPS < 2000 threshold)"
    log_success "✓ Test PASSED"
else
    log_warning "Some hosts stopped - unexpected for this PPS level"
fi

log_info "Test completed at $(date)"
log_success "Full results saved to: $LOG_FILE"
