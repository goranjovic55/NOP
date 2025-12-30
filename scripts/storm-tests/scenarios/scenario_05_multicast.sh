#!/bin/bash
# Scenario 05: Multicast Storm
# Storm Type: Multicast UDP
# Target: 224.0.0.1
# PPS: 3000
# Duration: 20s
# Expected: Multiple hosts affected

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test_common.sh"

# Test configuration
TEST_NAME="Multicast Storm (3000 PPS)"
MULTICAST_ADDR="224.0.0.1"
STORM_PPS=3000
DURATION=20

# Print banner
print_banner "$TEST_NAME"

# Check prerequisites
check_prerequisites

# Create test log
LOG_FILE="$RESULTS_DIR/scenario_05_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log_info "Test started at $(date)"
log_info "Configuration:"
log_info "  - Storm Type: Multicast"
log_info "  - Target: $MULTICAST_ADDR"
log_info "  - Storm PPS: $STORM_PPS"
log_info "  - Duration: ${DURATION}s"
log_info "  - Expected: Multicast group members affected"
echo ""

# Execute multicast storm
log_step "Executing multicast storm..."

payload=$(cat <<EOF
{
  "interface": "eth0",
  "packet_type": "multicast",
  "dest_ip": "$MULTICAST_ADDR",
  "pps": $STORM_PPS
}
EOF
)

curl -s -X POST http://localhost:8000/api/v1/traffic/storm/start \
    -H "Content-Type: application/json" \
    -d "$payload"

log_success "Multicast storm started"

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
log_info "Multicast packets sent to $MULTICAST_ADDR"

# Get final metrics
final_metrics=$(curl -s http://localhost:8000/api/v1/traffic/storm/metrics)
total_packets=$(echo "$final_metrics" | grep -o '"packets_sent":[0-9]*' | cut -d: -f2)
log_success "Total packets sent: $total_packets"

log_warning "Manual verification suggested:"
log_info "  1. Check if hosts subscribed to multicast group"
log_info "  2. Verify multicast routing/forwarding"
log_info "  3. Check packet capture for multicast traffic"

log_info "Test completed at $(date)"
log_success "Full results saved to: $LOG_FILE"
