#!/bin/bash
# Scenario 04: Broadcast Storm
# Storm Type: Broadcast packets
# PPS: 2000
# Duration: 15s
# Expected: Network-wide impact, multiple hosts detect

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test_common.sh"

# Test configuration
TEST_NAME="Broadcast Storm (2000 PPS)"
STORM_PPS=2000
DURATION=15

# Print banner
print_banner "$TEST_NAME"

# Check prerequisites
check_prerequisites

# Create test log
LOG_FILE="$RESULTS_DIR/scenario_04_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "Test started at $(date)"
log_info "Configuration:"
log_info "  - Storm Type: Broadcast"
log_info "  - Storm PPS: $STORM_PPS"
log_info "  - Duration: ${DURATION}s"
log_info "  - Expected: All hosts on network affected"
echo ""

log_warning "⚠️  Broadcast storm affects entire network segment"

# Execute broadcast storm (no specific target)
log_step "Executing broadcast storm..."

payload=$(cat <<EOF
{
  "interface": "eth0",
  "packet_type": "broadcast",
  "pps": $STORM_PPS
}
EOF
)

curl -s -X POST http://localhost:8000/api/v1/traffic/storm/start \
    -H "Content-Type: application/json" \
    -d "$payload"

log_success "Broadcast storm started"

# Monitor for duration
for i in $(seq 1 $DURATION); do
    sleep 1
    metrics=$(curl -s http://localhost:8000/api/v1/traffic/storm/metrics)
    current_pps=$(echo "$metrics" | grep -o '"current_pps":[0-9]*' | cut -d: -f2)
    packets=$(echo "$metrics" | grep -o '"packets_sent":[0-9]*' | cut -d: -f2)
    log_info "Progress: ${i}/${DURATION}s | PPS: $current_pps | Packets: $packets"
done

# Stop storm
curl -s -X POST http://localhost:8000/api/v1/traffic/storm/stop > /dev/null
log_success "Storm stopped"

# Validation
log_step "Validation"
log_info "Check network-wide impact by inspecting multiple hosts"

# List all test containers
log_info "Test containers status:"
docker ps --filter "name=nop-" --format "table {{.Names}}\t{{.Status}}"

log_warning "Manual verification required:"
log_info "  1. Check packet capture on multiple hosts"
log_info "  2. Verify broadcast packets reached all network segments"
log_info "  3. Review switch/network device logs if available"

log_info "Test completed at $(date)"
log_success "Full results saved to: $LOG_FILE"
