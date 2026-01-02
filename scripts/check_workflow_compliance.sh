#!/bin/bash
# AKIS Protocol Compliance Checker
# Validates that workflow logs contain required emissions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if file argument provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <workflow-log-file>"
    echo "Example: $0 log/workflow/2025-12-31_120000_my-task.md"
    exit 1
fi

log_file=$1

if [ ! -f "$log_file" ]; then
    echo -e "${RED}❌ File not found: $log_file${NC}"
    exit 1
fi

echo "============================================================"
echo "AKIS Protocol Compliance Check"
echo "============================================================"
echo "File: $log_file"
echo ""

# Initialize counters
compliance_score=0
total_checks=5
issues=()

# Check 1: [SESSION] emission
if grep -q "\[SESSION" "$log_file"; then
    echo -e "${GREEN}✅ [SESSION] emission found${NC}"
    compliance_score=$((compliance_score + 1))
else
    echo -e "${RED}❌ [SESSION] emission missing${NC}"
    issues+=("[SESSION] emission required at start of workflow")
fi

# Check 2: [AKIS] emission (knowledge loaded)
if grep -q "\[AKIS" "$log_file"; then
    echo -e "${GREEN}✅ [AKIS] emission found${NC}"
    compliance_score=$((compliance_score + 1))
else
    echo -e "${RED}❌ [AKIS] emission missing${NC}"
    issues+=("[AKIS] emission required in CONTEXT phase")
fi

# Check 3: [PHASE:] emissions (at least one)
phase_count=$(grep -c "\[PHASE:" "$log_file" || true)
if [ "$phase_count" -gt 0 ]; then
    echo -e "${GREEN}✅ [PHASE:] emissions found ($phase_count)${NC}"
    compliance_score=$((compliance_score + 1))
else
    echo -e "${RED}❌ [PHASE:] emissions missing${NC}"
    issues+=("[PHASE:] emissions required for progress tracking")
fi

# Check 4: [SKILLS_USED], [SKILLS:], [METHOD:], or Skills Used section
if grep -q "\[SKILLS_USED\]" "$log_file" || grep -q "\[SKILLS:" "$log_file" || grep -q "\[METHOD:" "$log_file" || grep -qi "skills used" "$log_file"; then
    echo -e "${GREEN}✅ Skills tracking emission found${NC}"
    compliance_score=$((compliance_score + 1))
else
    echo -e "${RED}❌ Skills tracking emission missing${NC}"
    issues+=("Skills tracking required (use [SKILLS:], [SKILLS_USED], [METHOD:], or 'Skills Used' section)")
fi

# Check 5: [COMPLETE] emission (with or without colon)
if grep -q "\[COMPLETE" "$log_file"; then
    echo -e "${GREEN}✅ [COMPLETE] emission found${NC}"
    compliance_score=$((compliance_score + 1))
else
    echo -e "${YELLOW}⚠️  [COMPLETE] emission missing (may be in progress)${NC}"
    issues+=("[COMPLETE] emission required at end of workflow")
fi

# Calculate percentage
compliance_percent=$((compliance_score * 100 / total_checks))

echo ""
echo "============================================================"
echo "Compliance Score: $compliance_score/$total_checks ($compliance_percent%)"
echo "============================================================"

# Show issues if any
if [ ${#issues[@]} -gt 0 ]; then
    echo ""
    echo "Issues Found:"
    for issue in "${issues[@]}"; do
        echo "  - $issue"
    done
fi

echo ""

# Exit code based on compliance
if [ $compliance_score -eq $total_checks ]; then
    echo -e "${GREEN}✅ PASS - Full compliance${NC}"
    exit 0
elif [ $compliance_score -ge 3 ]; then
    echo -e "${YELLOW}⚠️  PARTIAL - Minimum compliance met${NC}"
    exit 0
else
    echo -e "${RED}❌ FAIL - Insufficient compliance${NC}"
    exit 1
fi
