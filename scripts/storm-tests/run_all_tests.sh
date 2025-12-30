#!/bin/bash
# Master Test Orchestrator for STORM Testing
# Runs all test scenarios in sequence with reporting

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test_common.sh"

# Colors
BOLD='\033[1m'

# Configuration
RUN_ALL=false
SCENARIOS=()
SUMMARY_FILE="$RESULTS_DIR/test_summary_$(date +%Y%m%d_%H%M%S).md"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            RUN_ALL=true
            shift
            ;;
        --scenario)
            SCENARIOS+=("$2")
            shift 2
            ;;
        --help)
            cat <<EOF
STORM Test Orchestrator

Usage: $0 [OPTIONS]

Options:
    --all                   Run all test scenarios
    --scenario <number>     Run specific scenario (1-8)
    --help                  Show this help message

Examples:
    $0 --all                        # Run all 8 scenarios
    $0 --scenario 1 --scenario 2    # Run scenarios 1 and 2
    $0 --scenario 6                 # Run only scenario 6

Scenarios:
    1. Low-Rate Storm (500 PPS)
    2. Medium-Rate Storm (5000 PPS) 
    3. High-Rate Storm (25000 PPS)
    4. Broadcast Storm
    5. Multicast Storm
    6. Ramp-Up Test
    7. Multi-Target Storm
    8. Port Scan Storm

EOF
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Default to all if nothing specified
if [ "$RUN_ALL" = false ] && [ ${#SCENARIOS[@]} -eq 0 ]; then
    log_info "No scenarios specified, running all tests"
    RUN_ALL=true
fi

# Build scenario list
if [ "$RUN_ALL" = true ]; then
    SCENARIOS=(1 2 3 4 5 6 7 8)
fi

# Print banner
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}${BOLD}STORM TEST ORCHESTRATOR${NC}                              ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Running ${#SCENARIOS[@]} scenario(s)                                    ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
check_prerequisites

# Initialize summary file
cat > "$SUMMARY_FILE" <<EOF
# STORM Test Summary

**Date**: $(date '+%Y-%m-%d %H:%M:%S')  
**Scenarios Run**: ${#SCENARIOS[@]}

## Results

| # | Scenario | Status | Duration | Notes |
|---|----------|--------|----------|-------|
EOF

# Track overall results
PASSED=0
FAILED=0
SKIPPED=0

# Run each scenario
for scenario_num in "${SCENARIOS[@]}"; do
    scenario_file="$SCRIPT_DIR/scenarios/scenario_0${scenario_num}_*.sh"
    
    # Find matching scenario file
    matching_files=($(ls $scenario_file 2>/dev/null || true))
    
    if [ ${#matching_files[@]} -eq 0 ]; then
        log_error "Scenario $scenario_num not found"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    scenario_path="${matching_files[0]}"
    scenario_name=$(basename "$scenario_path" .sh | sed 's/scenario_[0-9]*_//' | tr '_' ' ')
    
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Running: Scenario $scenario_num - $scenario_name"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Make executable
    chmod +x "$scenario_path"
    
    # Run scenario and capture result
    start_time=$(date +%s)
    
    if bash "$scenario_path"; then
        status="✓ PASSED"
        PASSED=$((PASSED + 1))
        status_icon="✅"
    else
        status="✗ FAILED"
        FAILED=$((FAILED + 1))
        status_icon="❌"
    fi
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    # Append to summary
    echo "| $scenario_num | $scenario_name | $status_icon $status | ${duration}s | - |" >> "$SUMMARY_FILE"
    
    log_info ""
    log_info "Scenario $scenario_num: $status (${duration}s)"
    log_info ""
    
    # Brief pause between scenarios
    if [ $scenario_num -ne ${SCENARIOS[-1]} ]; then
        log_info "Cooling down for 10 seconds..."
        sleep 10
    fi
done

# Add summary statistics
cat >> "$SUMMARY_FILE" <<EOF

## Summary Statistics

- **Total**: ${#SCENARIOS[@]}
- **Passed**: ✅ $PASSED
- **Failed**: ❌ $FAILED
- **Skipped**: ⚠️ $SKIPPED

## Test Environment

- Backend Container: $BACKEND_CONTAINER
- Test Network: test-network (172.21.0.0/24)
- Storm API: http://localhost:8000/api/v1/traffic/storm

## Logs

Individual test logs are stored in: \`results/\`

EOF

# Print final summary
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}${BOLD}TEST SUMMARY${NC}                                          ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Total Scenarios: ${#SCENARIOS[@]}                                     ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}Passed: $PASSED${NC}                                             ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${RED}Failed: $FAILED${NC}                                             ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ${YELLOW}Skipped: $SKIPPED${NC}                                           ${BLUE}║${NC}"
echo -e "${BLUE}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Summary: $SUMMARY_FILE                                 ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    log_success "All tests completed successfully!"
    exit 0
else
    log_error "Some tests failed - review logs for details"
    exit 1
fi
