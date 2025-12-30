#!/bin/bash
# Scenario 01: Low-Rate Storm (< 1k PPS)
# Target: Web server (172.21.0.42:80)
# Storm Type: TCP SYN flood
# PPS: 500
# Duration: 30s
# Expected: Host stays online, detection triggers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test_common.sh"

# Test configuration
TEST_NAME="Low-Rate Storm (500 PPS)"
TARGET_CONTAINER="nop-custom-web"
TARGET_PORT=80
STORM_PPS=500
DURATION=30
THRESHOLD_PPS=1000  # Higher than storm, so no shutdown expected

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
LOG_FILE="$RESULTS_DIR/scenario_01_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "Test started at $(date)"
log_info "Configuration:"
log_info "  - Storm PPS: $STORM_PPS"
log_info "  - Duration: ${DURATION}s"
log_info "  - Monitor Threshold: $THRESHOLD_PPS PPS"
log_info "  - Expected: No shutdown (PPS below threshold)"
echo ""

# Start monitoring in background
start_monitor "$TARGET_IP" "$THRESHOLD_PPS" "$TARGET_CONTAINER" "$TARGET_PORT"

# Wait for monitor to stabilize
sleep 3

# Execute storm
execute_storm "$TARGET_IP" "$TARGET_PORT" "$STORM_PPS" "$DURATION" "tcp" "SYN"

# Wait for final metrics
sleep 5

# Validate results
log_step "Validation"
log_info "Expected: Host should remain online (500 PPS < 1000 PPS threshold)"

if docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
    log_success "✓ Host is still running"
    log_success "✓ Test PASSED: Low-rate storm did not trigger shutdown"
else
    log_error "✗ Host stopped unexpectedly"
    log_error "✗ Test FAILED"
    exit 1
fi

log_info "Test completed at $(date)"
log_success "Full results saved to: $LOG_FILE"
