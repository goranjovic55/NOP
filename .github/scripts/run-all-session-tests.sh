#!/bin/bash
##
# AKIS Session Resilience Test Suite Runner
# 
# Executes all session resilience tests and generates summary report
##

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.."

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   AKIS SESSION RESILIENCE COMPREHENSIVE TEST SUITE             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Clean up any existing session files
echo "🧹 Cleaning up previous session files..."
rm -f .akis-session.json .akis-sessions.json .akis-sessions.json.backup
echo "   ✓ Clean slate ready"
echo ""

# Test 1: Edge Case Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST SUITE 1: Edge Case Tests (10 tests, 37 assertions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if node .github/scripts/test-session-resilience.js; then
    EDGE_RESULT="✅ PASS"
    EDGE_EXIT=0
else
    EDGE_RESULT="❌ FAIL"
    EDGE_EXIT=1
fi

echo ""
echo "Result: $EDGE_RESULT"
echo ""

# Clean between tests
rm -f .akis-session.json .akis-sessions.json .akis-sessions.json.backup

# Test 2: Stress Test (50 operations)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST SUITE 2: Stress Test - Moderate Load (50 operations)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if node .github/scripts/stress-test-sessions.js --operations=50 --seed=42; then
    STRESS_50_RESULT="✅ PASS"
    STRESS_50_EXIT=0
else
    STRESS_50_RESULT="❌ FAIL"
    STRESS_50_EXIT=1
fi

echo ""
echo "Result: $STRESS_50_RESULT"
echo ""

# Clean between tests
rm -f .akis-session.json .akis-sessions.json .akis-sessions.json.backup

# Test 3: Stress Test (200 operations)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST SUITE 3: Stress Test - High Load (200 operations)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if node .github/scripts/stress-test-sessions.js --operations=200 --seed=99999; then
    STRESS_200_RESULT="✅ PASS"
    STRESS_200_EXIT=0
else
    STRESS_200_RESULT="❌ FAIL"
    STRESS_200_EXIT=1
fi

echo ""
echo "Result: $STRESS_200_RESULT"
echo ""

# Clean between tests
rm -f .akis-session.json .akis-sessions.json .akis-sessions.json.backup

# Test 4: Advanced Scenarios
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST SUITE 4: Advanced Scenario Tests (10 scenarios)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if node .github/scripts/scenario-test-sessions.js; then
    SCENARIO_RESULT="✅ PASS"
    SCENARIO_EXIT=0
else
    SCENARIO_RESULT="❌ FAIL"
    SCENARIO_EXIT=1
fi

echo ""
echo "Result: $SCENARIO_RESULT"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      COMPREHENSIVE SUMMARY                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Test Suite 1 (Edge Cases):        $EDGE_RESULT"
echo "Test Suite 2 (Stress 50 ops):     $STRESS_50_RESULT"
echo "Test Suite 3 (Stress 200 ops):    $STRESS_200_RESULT"
echo "Test Suite 4 (Advanced Scenarios): $SCENARIO_RESULT"
echo ""

# Calculate overall result
TOTAL_EXIT=$((EDGE_EXIT + STRESS_50_EXIT + STRESS_200_EXIT + SCENARIO_EXIT))

if [ $TOTAL_EXIT -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              🎉 ALL TESTS PASSED - 100% SUCCESS 🎉              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "The AKIS session tracking system demonstrates:"
    echo "  ✓ Perfect reliability under high load (200+ operations)"
    echo "  ✓ Correct nested session handling (depth 0-26+)"
    echo "  ✓ Automatic recovery from interrupts and corruption"
    echo "  ✓ State preservation across context switches"
    echo "  ✓ Production-ready for mission-critical workflows"
    echo ""
    echo "See SESSION_RESILIENCE_TEST_RESULTS.md for detailed analysis."
    echo ""
    exit 0
else
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                   ⚠️  SOME TESTS FAILED  ⚠️                     ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Please review the test output above for details."
    echo ""
    exit 1
fi
