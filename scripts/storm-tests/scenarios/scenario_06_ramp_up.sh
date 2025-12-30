#!/bin/bash
# Scenario 06: Ramp-Up Test
# Target: Custom web server
# Storm Type: TCP SYN
# PPS: 100 → 500 → 1000 → 5000 (escalating)
# Expected: Shutdown triggers at configured threshold (2000 PPS)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test_common.sh"

# Test configuration
TEST_NAME="Ramp-Up Storm Test"
TARGET_CONTAINER="nop-custom-web"
TARGET_PORT=80
THRESHOLD_PPS=2000
PPS_LEVELS=(100 500 1000 2000 5000)
DURATION_PER_LEVEL=10

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
LOG_FILE="$RESULTS_DIR/scenario_06_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "Test started at $(date)"
log_info "Configuration:"
log_info "  - Monitor Threshold: $THRESHOLD_PPS PPS"
log_info "  - PPS Ramp: ${PPS_LEVELS[*]}"
log_info "  - Duration per level: ${DURATION_PER_LEVEL}s"
log_info "  - Expected: Shutdown when >= $THRESHOLD_PPS PPS"
echo ""

# Start monitoring in background
start_monitor "$TARGET_IP" "$THRESHOLD_PPS" "$TARGET_CONTAINER" "$TARGET_PORT"

# Wait for monitor to stabilize
sleep 3

# Ramp up through PPS levels
for pps in "${PPS_LEVELS[@]}"; do
    log_step "Level: ${pps} PPS"
    
    # Check if container still running
    if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
        log_warning "Container stopped at PPS level: $pps"
        log_info "Previous level likely exceeded threshold"
        break
    fi
    
    # Execute storm at this level
    execute_storm "$TARGET_IP" "$TARGET_PORT" "$pps" "$DURATION_PER_LEVEL" "tcp" "SYN"
    
    log_info "Completed ${pps} PPS level"
    
    # Brief pause between levels
    sleep 2
done

# Validate results
log_step "Validation"

if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
    log_success "✓ Host was stopped during ramp-up"
    log_success "✓ Test PASSED: Threshold detection worked"
    
    # Restart
    log_info "Restarting container..."
    docker start "$TARGET_CONTAINER" > /dev/null
    sleep 2
else
    log_warning "✗ Host still running after all levels"
    log_warning "✗ Monitor may not have detected threshold breach"
fi

log_info "Test completed at $(date)"
log_success "Full results saved to: $LOG_FILE"
