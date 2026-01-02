#!/bin/bash
# Scenario 02: Medium-Rate Storm (1k-10k PPS)
# Target: Web server (172.21.0.42:80)
# Storm Type: TCP SYN flood
# PPS: 5000
# Duration: 20s
# Expected: Host shuts down when threshold exceeded

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test_common.sh"

# Test configuration
TEST_NAME="Medium-Rate Storm (5000 PPS)"
TARGET_CONTAINER="nop-custom-web"
TARGET_PORT=80
STORM_PPS=5000
DURATION=20
THRESHOLD_PPS=2000  # Lower than storm, shutdown expected

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
log_info "Target: $TARGET_CONTAINER ($TARGET_IP:$TARGET_PORT)"

# Create test log
LOG_FILE="$RESULTS_DIR/scenario_02_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "Test started at $(date)"
log_info "Configuration:"
log_info "  - Storm PPS: $STORM_PPS"
log_info "  - Duration: ${DURATION}s"
log_info "  - Monitor Threshold: $THRESHOLD_PPS PPS"
log_info "  - Expected: Shutdown when threshold exceeded"
echo ""

# Start monitoring in background
start_monitor "$TARGET_IP" "$THRESHOLD_PPS" "$TARGET_CONTAINER" "$TARGET_PORT"

# Wait for monitor to stabilize
sleep 3

# Execute storm
execute_storm "$TARGET_IP" "$TARGET_PORT" "$STORM_PPS" "$DURATION" "tcp" "SYN"

# Wait for monitor to react
sleep 5

# Validate results
log_step "Validation"
log_info "Expected: Host should be stopped (5000 PPS > 2000 PPS threshold)"

if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
    log_success "✓ Host was stopped by monitor"
    log_success "✓ Test PASSED: Storm detection triggered shutdown"
    
    # Restart the container for next tests
    log_info "Restarting container for future tests..."
    docker start "$TARGET_CONTAINER" > /dev/null
    sleep 2
else
    log_warning "✗ Host is still running"
    log_warning "✗ Test outcome unclear - check monitor logs"
fi

log_info "Test completed at $(date)"
log_success "Full results saved to: $LOG_FILE"
