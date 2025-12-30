#!/bin/bash
# Scenario 08: Port Scan Storm
# Target: Custom web server
# Storm Type: TCP SYN across multiple ports
# PPS: 10000
# Expected: Detection of scan pattern

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test_common.sh"

# Test configuration
TEST_NAME="Port Scan Storm (10000 PPS)"
TARGET_CONTAINER="nop-custom-web"
STORM_PPS=10000
DURATION=15
THRESHOLD_PPS=5000
PORT_RANGE="1-1024"

# Print banner
print_banner "$TEST_NAME"

# Check prerequisites
check_prerequisites

# Verify target container
if ! check_target "$TARGET_CONTAINER"; then
    exit 1
fi

# Get target IP
TARGET_IP=$(get_container_ip "$TARGET_CONTAINER")
log_info "Target: $TARGET_CONTAINER ($TARGET_IP)"

# Create test log
LOG_FILE="$RESULTS_DIR/scenario_08_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "Test started at $(date)"
log_info "Configuration:"
log_info "  - Storm Type: Port scan (TCP SYN)"
log_info "  - Port Range: $PORT_RANGE"
log_info "  - Storm PPS: $STORM_PPS"
log_info "  - Duration: ${DURATION}s"
log_info "  - Monitor Threshold: $THRESHOLD_PPS PPS"
echo ""

# Start monitoring
start_monitor "$TARGET_IP" "$THRESHOLD_PPS" "$TARGET_CONTAINER" "80"

# Wait for monitor to stabilize
sleep 3

# Execute port scan storm using direct Python
log_step "Executing port scan storm..."

python_script=$(cat <<'EOF'
from scapy.all import *
import random
import time

target_ip = sys.argv[1]
pps = int(sys.argv[2])
duration = int(sys.argv[3])

packets_sent = 0
start_time = time.time()
interval = 1.0 / pps

print(f"Starting port scan storm: {target_ip} ports 1-1024 at {pps} PPS for {duration}s")

while time.time() < start_time + duration:
    # Random port between 1-1024
    port = random.randint(1, 1024)
    
    pkt = IP(dst=target_ip)/TCP(dport=port, flags="S")
    send(pkt, verbose=0)
    
    packets_sent += 1
    
    if packets_sent % 1000 == 0:
        elapsed = time.time() - start_time
        actual_pps = packets_sent / elapsed if elapsed > 0 else 0
        print(f"Sent {packets_sent} packets | Actual PPS: {actual_pps:.0f}")
    
    time.sleep(interval)

total_time = time.time() - start_time
print(f"\nCompleted: {packets_sent} packets in {total_time:.2f}s")
print(f"Average PPS: {packets_sent/total_time:.0f}")
EOF
)

# Execute via backend container
docker exec "$BACKEND_CONTAINER" python3 -c "$python_script" \
    "$TARGET_IP" "$STORM_PPS" "$DURATION"

# Wait for monitor reaction
sleep 5

# Validate results
log_step "Validation"
log_info "Expected: Host shutdown due to high PPS from port scanning"

if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
    log_success "✓ Host stopped - storm detected"
    log_success "✓ Test PASSED: Port scan storm triggered shutdown"
    
    # Restart
    log_info "Restarting container..."
    docker start "$TARGET_CONTAINER" > /dev/null
    sleep 2
else
    log_warning "✗ Host still running"
    log_warning "Monitor may not have detected threshold or storm didn't achieve target PPS"
fi

log_info "Test completed at $(date)"
log_success "Full results saved to: $LOG_FILE"
