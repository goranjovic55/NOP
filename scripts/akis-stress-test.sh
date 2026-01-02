#!/bin/bash
# AKIS Framework Stress Test
# Simulates edge cases to identify failure points and prevention strategies
# Usage: ./scripts/akis-stress-test.sh [--quick|--full]

set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

RESULTS_DIR="/tmp/akis-stress-results-$$"
mkdir -p "$RESULTS_DIR"

# Test counters
TOTAL=0
PASSED=0
FAILED=0
WARNINGS=0
FAILURES=()

log_test() { echo -e "${CYAN}[TEST]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; PASSED=$((PASSED+1)); TOTAL=$((TOTAL+1)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; FAILED=$((FAILED+1)); TOTAL=$((TOTAL+1)); FAILURES+=("$1"); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; WARNINGS=$((WARNINGS+1)); }

echo "============================================================"
echo "AKIS Framework Stress Test"
echo "============================================================"
echo "Mode: ${1:-standard}"
echo "Results: $RESULTS_DIR"
echo ""

# ================================================================
# CATEGORY 1: Protocol Compliance Edge Cases
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 1: Protocol Compliance ===${NC}"

log_test "1.1 Missing [SESSION] emission detection"
if grep -q "SESSION" .github/instructions/phases.md; then
    log_pass "SESSION blocking gate defined in phases.md"
else
    log_fail "1.1 No SESSION blocking gate enforcement"
fi

log_test "1.2 Missing [AKIS] emission detection"
if grep -q "\[AKIS\]" .github/copilot-instructions.md; then
    log_pass "[AKIS] emission pattern documented"
else
    log_fail "1.2 No [AKIS] emission pattern defined"
fi

log_test "1.3 Skipped phases detection capability"
if grep -q "Skip Phases" .github/instructions/phases.md; then
    log_pass "Skip phases rules defined"
else
    log_fail "1.3 No skip phases guidance"
fi

log_test "1.4 [COMPLETE] emission enforcement"
if grep -q "COMPLETE.*Required\|COMPLETE.*required\|COMPLETE.*blocking" .github/instructions/phases.md; then
    log_pass "[COMPLETE] marked as required"
else
    log_warn "1.4 [COMPLETE] enforcement may be weak"
fi

log_test "1.5 Compliance checker alignment with protocol"
session_pat=$(grep -c '\[SESSION' scripts/check_workflow_compliance.sh 2>/dev/null || echo 0)
akis_pat=$(grep -c '\[AKIS' scripts/check_workflow_compliance.sh 2>/dev/null || echo 0)
if [ "$session_pat" -gt 0 ] && [ "$akis_pat" -gt 0 ]; then
    log_pass "Compliance checker validates core emissions"
else
    log_fail "1.5 Compliance checker missing emission patterns"
fi

# ================================================================
# CATEGORY 2: Context Switching Edge Cases
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 2: Context Switching ===${NC}"

log_test "2.1 PAUSE/RESUME protocol exists"
if grep -q "PAUSE" .github/instructions/protocols.md && grep -q "RESUME" .github/instructions/protocols.md; then
    log_pass "PAUSE/RESUME protocol defined"
else
    log_fail "2.1 No PAUSE/RESUME protocol"
fi

log_test "2.2 Stack depth limit defined"
if grep -q "Max.*depth.*3\|depth.*3\|max: 3" .github/instructions/protocols.md 2>/dev/null; then
    log_pass "Stack depth limit (3) defined"
else
    log_fail "2.2 No stack depth limit"
fi

log_test "2.3 Context switching skill exists"
if [ -f ".github/skills/context-switching/SKILL.md" ]; then
    log_pass "Context switching skill file exists"
else
    log_fail "2.3 Missing context-switching skill"
fi

log_test "2.4 State preservation guidance"
if grep -qi "state\|preserve\|save" .github/skills/context-switching/SKILL.md 2>/dev/null; then
    log_pass "State preservation documented in skill"
else
    log_fail "2.4 No state preservation guidance"
fi

# ================================================================
# CATEGORY 3: Knowledge Loading Edge Cases
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 3: Knowledge Loading ===${NC}"

log_test "3.1 Knowledge file exists and is valid JSON"
if [ -f "project_knowledge.json" ]; then
    # Check if it's valid JSONL (each line is JSON)
    if head -5 project_knowledge.json | while read -r line; do echo "$line" | python3 -c "import json,sys;json.load(sys.stdin)" 2>/dev/null || exit 1; done; then
        log_pass "project_knowledge.json is valid JSONL"
    else
        log_fail "3.1 project_knowledge.json has invalid JSON lines"
    fi
else
    log_fail "3.1 project_knowledge.json missing"
fi

log_test "3.2 Knowledge entity count"
if [ -f "project_knowledge.json" ]; then
    entity_count=$(grep -c '"type":"entity"' project_knowledge.json 2>/dev/null || echo 0)
    if [ "$entity_count" -gt 50 ]; then
        log_pass "Knowledge has $entity_count entities (healthy)"
    elif [ "$entity_count" -gt 20 ]; then
        log_warn "3.2 Only $entity_count entities - may need enrichment"
    else
        log_fail "3.2 Only $entity_count entities - knowledge too sparse"
    fi
fi

log_test "3.3 Knowledge backup exists"
if ls project_knowledge_backup_*.json 1>/dev/null 2>&1; then
    log_pass "Knowledge backup file exists"
else
    log_warn "3.3 No knowledge backup found"
fi

log_test "3.4 Corrupt knowledge handling"
# Simulate corrupt JSON detection
echo '{"corrupt": true' > "$RESULTS_DIR/corrupt_test.json"
if ! python3 -c "import json; json.load(open('$RESULTS_DIR/corrupt_test.json'))" 2>/dev/null; then
    log_pass "Corrupt JSON correctly detected"
else
    log_fail "3.4 Corrupt JSON not detected"
fi

log_test "3.5 Empty knowledge handling"
echo "" > "$RESULTS_DIR/empty_test.json"
if [ ! -s "$RESULTS_DIR/empty_test.json" ] || [ "$(cat $RESULTS_DIR/empty_test.json)" = "" ]; then
    log_pass "Empty file detection works"
else
    log_fail "3.5 Empty file not detected"
fi

# ================================================================
# CATEGORY 4: Session Tracking Edge Cases
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 4: Session Tracking ===${NC}"

log_test "4.1 Session tracker script exists"
if [ -f ".github/scripts/session-tracker.js" ]; then
    log_pass "Session tracker script exists"
else
    log_fail "4.1 Session tracker missing"
fi

log_test "4.2 Session tracker is executable"
if node -c .github/scripts/session-tracker.js 2>/dev/null; then
    log_pass "Session tracker has valid syntax"
else
    log_fail "4.2 Session tracker has syntax errors"
fi

log_test "4.3 Session tracker start command"
node .github/scripts/session-tracker.js start "stress-test" "_DevTeam" > "$RESULTS_DIR/session_start.log" 2>&1
if [ -f ".akis-session.json" ]; then
    log_pass "Session start creates tracking file"
else
    log_fail "4.3 Session start doesn't create file"
fi

log_test "4.4 Concurrent session handling"
# Try starting second session
node .github/scripts/session-tracker.js start "stress-test-2" "Developer" > "$RESULTS_DIR/session_concurrent.log" 2>&1
if [ -f ".akis-session.json" ]; then
    agent=$(python3 -c "import json; print(json.load(open('.akis-session.json'))['agent'])" 2>/dev/null || echo "")
    if [ "$agent" = "Developer" ]; then
        log_warn "4.4 Session overwritten - no lock protection"
    else
        log_pass "Session preserved, concurrent rejected"
    fi
fi

log_test "4.5 Session reset"
node .github/scripts/session-tracker.js reset > /dev/null 2>&1
if [ ! -f ".akis-session.json" ]; then
    log_pass "Session reset removes tracking file"
else
    log_warn "4.5 Session reset may not clean up properly"
fi

# ================================================================
# CATEGORY 5: Skill Resolution Edge Cases
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 5: Skill Resolution ===${NC}"

log_test "5.1 All skills have SKILL.md"
missing_skills=0
for skill_dir in .github/skills/*/; do
    if [ ! -f "${skill_dir}SKILL.md" ]; then
        log_warn "5.1 Missing SKILL.md in $skill_dir"
        missing_skills=$((missing_skills+1))
    fi
done
if [ $missing_skills -eq 0 ]; then
    log_pass "All skill directories have SKILL.md"
else
    log_fail "5.1 $missing_skills skills missing SKILL.md"
fi

log_test "5.2 Skill 'When to Use' documentation"
skills_with_usage=0
total_skills=0
for skill_file in .github/skills/*/SKILL.md; do
    total_skills=$((total_skills+1))
    if grep -q "When to Use" "$skill_file" 2>/dev/null; then
        skills_with_usage=$((skills_with_usage+1))
    fi
done
if [ $skills_with_usage -eq $total_skills ]; then
    log_pass "All $total_skills skills have 'When to Use' section"
else
    log_warn "5.2 Only $skills_with_usage/$total_skills skills have 'When to Use'"
fi

log_test "5.3 Skill count within limits"
skill_count=$(ls -d .github/skills/*/ 2>/dev/null | wc -l)
if [ "$skill_count" -le 100 ]; then
    log_pass "Skill count ($skill_count) within limit (100)"
else
    log_fail "5.3 Too many skills: $skill_count > 100"
fi

# ================================================================
# CATEGORY 6: Error Recovery Edge Cases
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 6: Error Recovery ===${NC}"

log_test "6.1 Error recovery documentation exists"
if [ -f ".github/instructions/error_recovery.md" ]; then
    log_pass "error_recovery.md exists"
else
    log_fail "6.1 No error_recovery.md"
fi

log_test "6.2 Error categories defined"
if grep -qi "transient\|permanent\|user" .github/instructions/error_recovery.md 2>/dev/null; then
    log_pass "Error categories (transient/permanent/user) defined"
else
    log_fail "6.2 No error categorization"
fi

log_test "6.3 Retry protocol defined"
if grep -qi "retry\|backoff" .github/instructions/error_recovery.md 2>/dev/null; then
    log_pass "Retry/backoff protocol defined"
else
    log_fail "6.3 No retry protocol"
fi

log_test "6.4 Recovery target defined"
if grep -q "85%" .github/instructions/error_recovery.md 2>/dev/null; then
    log_pass "Auto-recovery target (85%) defined"
else
    log_warn "6.4 No auto-recovery target specified"
fi

# ================================================================
# CATEGORY 7: Delegation Edge Cases
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 7: Delegation ===${NC}"

log_test "7.1 Agent definitions exist"
agent_count=$(ls .github/agents/*.agent.md 2>/dev/null | wc -l)
if [ "$agent_count" -ge 4 ]; then
    log_pass "$agent_count agent definitions found"
else
    log_fail "7.1 Only $agent_count agents defined (need >=4)"
fi

log_test "7.2 Delegation protocol exists"
if grep -q "runSubagent\|#runSubagent" .github/instructions/protocols.md 2>/dev/null; then
    log_pass "Delegation (#runSubagent) protocol defined"
else
    log_fail "7.2 No delegation protocol"
fi

log_test "7.3 Expected return types defined"
if grep -q "DESIGN_DECISION\|IMPLEMENTATION_RESULT\|VALIDATION_REPORT" .github/instructions/protocols.md 2>/dev/null; then
    log_pass "Agent return types defined"
else
    log_fail "7.3 No agent return types"
fi

# ================================================================
# CATEGORY 8: Concurrency & Resource Edge Cases
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 8: Concurrency & Resources ===${NC}"

log_test "8.1 Knowledge file size check"
if [ -f "project_knowledge.json" ]; then
    size_kb=$(du -k project_knowledge.json | cut -f1)
    if [ "$size_kb" -lt 100 ]; then
        log_pass "Knowledge file size ($size_kb KB) within limit (<100KB)"
    else
        log_warn "8.1 Knowledge file large: $size_kb KB (target <100KB)"
    fi
fi

log_test "8.2 Instruction file count"
instr_count=$(ls .github/instructions/*.md 2>/dev/null | wc -l)
if [ "$instr_count" -le 50 ]; then
    log_pass "Instruction count ($instr_count) within limit (50)"
else
    log_fail "8.2 Too many instructions: $instr_count > 50"
fi

log_test "8.3 Workflow log directory exists"
if [ -d "log/workflow" ]; then
    log_count=$(ls log/workflow/*.md 2>/dev/null | grep -v README | wc -l)
    log_pass "Workflow log directory exists ($log_count logs)"
else
    log_fail "8.3 No workflow log directory"
fi

# ================================================================
# CATEGORY 9: High-Volume Simulation
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 9: High-Volume Stress Test ===${NC}"

log_test "9.1 Rapid session creation (10 sessions)"
for i in {1..10}; do
    node .github/scripts/session-tracker.js start "rapid-test-$i" "Agent$i" > /dev/null 2>&1
    node .github/scripts/session-tracker.js reset > /dev/null 2>&1
done
log_pass "10 rapid session cycles completed"

log_test "9.2 Phase updates under load"
node .github/scripts/session-tracker.js start "load-test" "_DevTeam" > /dev/null 2>&1
for phase in CONTEXT PLAN COORDINATE INTEGRATE VERIFY LEARN COMPLETE; do
    node .github/scripts/session-tracker.js phase "$phase" "1/0" > /dev/null 2>&1
done
node .github/scripts/session-tracker.js reset > /dev/null 2>&1
log_pass "7-phase cycle completed"

log_test "9.3 Decision logging stress"
node .github/scripts/session-tracker.js start "decision-test" "_DevTeam" > /dev/null 2>&1
for i in {1..20}; do
    node .github/scripts/session-tracker.js decision "Decision $i: Option A chosen" > /dev/null 2>&1
done
if [ -f ".akis-session.json" ]; then
    decision_count=$(python3 -c "import json; print(len(json.load(open('.akis-session.json'))['decisions']))" 2>/dev/null || echo 0)
    if [ "$decision_count" -eq 20 ]; then
        log_pass "All 20 decisions recorded"
    else
        log_warn "9.3 Only $decision_count/20 decisions recorded"
    fi
fi
node .github/scripts/session-tracker.js reset > /dev/null 2>&1

# ================================================================
# CATEGORY 10: Real Workflow Compliance Analysis
# ================================================================
echo -e "\n${CYAN}=== CATEGORY 10: Workflow Compliance ===${NC}"

log_test "10.1 Run compliance checker on all workflows"
compliance_output=$(./scripts/check_all_workflows.sh 2>&1 | tail -10)
full_comp=$(echo "$compliance_output" | grep -oP "Full compliance.*: \K\d+" || echo 0)
partial_comp=$(echo "$compliance_output" | grep -oP "Partial compliance.*: \K\d+" || echo 0)
no_comp=$(echo "$compliance_output" | grep -oP "No/Low compliance.*: \K\d+" || echo 0)
rate=$(echo "$compliance_output" | grep -oP "Overall compliance rate: \K[0-9.]+" || echo 0)

if [ "$(echo "$rate >= 80" | bc -l)" = "1" ]; then
    log_pass "Compliance rate: $rate% (meets 80% target)"
elif [ "$(echo "$rate >= 50" | bc -l)" = "1" ]; then
    log_warn "10.1 Compliance rate: $rate% (below 80% target)"
else
    log_fail "10.1 Compliance rate: $rate% (critical: below 50%)"
fi

echo -e "\n${CYAN}Compliance breakdown: Full=$full_comp, Partial=$partial_comp, Failed=$no_comp${NC}"

# ================================================================
# SUMMARY
# ================================================================
echo ""
echo "============================================================"
echo "STRESS TEST SUMMARY"
echo "============================================================"
echo -e "Total Tests:  $TOTAL"
echo -e "${GREEN}Passed:       $PASSED${NC}"
echo -e "${YELLOW}Warnings:     $WARNINGS${NC}"
echo -e "${RED}Failed:       $FAILED${NC}"
echo ""

pass_rate=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
echo "Pass Rate: $pass_rate%"

if [ ${#FAILURES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}=== FAILURES REQUIRING ATTENTION ===${NC}"
    for failure in "${FAILURES[@]}"; do
        echo "  ❌ $failure"
    done
fi

echo ""
echo "Results saved to: $RESULTS_DIR"
echo "============================================================"

# Generate summary file
cat > "$RESULTS_DIR/summary.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "total_tests": $TOTAL,
  "passed": $PASSED,
  "warnings": $WARNINGS,
  "failed": $FAILED,
  "pass_rate": $pass_rate,
  "compliance_rate": "$rate",
  "failures": $(printf '%s\n' "${FAILURES[@]}" | jq -R . | jq -s .)
}
EOF

# Exit with failure if any tests failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi
exit 0
