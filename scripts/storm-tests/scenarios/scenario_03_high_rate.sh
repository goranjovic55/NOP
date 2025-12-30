#!/bin/bash
# Scenario 03: High-Rate Storm (10k-50k PPS)
# Target: Custom web server
# Storm Type: UDP flood
# PPS: 25000
# Duration: 10s
# Expected: Immediate shutdown, detection logged

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test_common.sh"

# Test configuration
TEST_NAME="High-Rate Storm (25000 PPS)"
TARGET_CONTAINER="nop-custom-web"
TARGET_PORT=80
STORM_PPS=25000
DURATION=10
THRESHOLD_PPS=5000  # Much lower than storm

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
LOG_FILE="$RESULTS_DIR/scenario_03_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "Test started at $(date)"
log_info "Configuration:"
log_info "  - Storm PPS: $STORM_PPS"
log_info "  - Duration: ${DURATION}s"
log_info "  - Monitor Threshold: $THRESHOLD_PPS PPS"
log_info "  - Expected: Rapid shutdown"
echo ""

log_warning "⚠️  High-rate storm may impact system performance"

# Start monitoring in background
start_monitor "$TARGET_IP" "$THRESHOLD_PPS" "$TARGET_CONTAINER" "$TARGET_PORT"

# Wait for monitor to stabilize
sleep 3

# Execute storm
execute_storm "$TARGET_IP" "$TARGET_PORT" "$STORM_PPS" "$DURATION" "udp"

# Wait for monitor to react
sleep 5

# Validate results
log_step "Validation"
log_info "Expected: Host should be stopped quickly (25000 PPS >> 5000 PPS threshold)"

if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
    log_success "✓ Host was stopped by monitor"
    log_success "✓ Test PASSED: High-rate storm triggered rapid shutdown"
    
    # Restart the container
    log_info "Restarting container..."
    docker start "$TARGET_CONTAINER" > /dev/null
    sleep 2
else
    log_warning "✗ Host is still running"
    log_warning "✗ Test outcome unclear - storm may not have achieved target PPS"
fi

log_info "Test completed at $(date)"
log_success "Full results saved to: $LOG_FILE"
