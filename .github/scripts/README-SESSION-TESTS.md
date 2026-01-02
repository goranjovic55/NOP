# AKIS Session Resilience Testing

Comprehensive edge case simulation and stress testing suite for AKIS session tracking system.

## Quick Start

### Run All Tests
```bash
./.github/scripts/run-all-session-tests.sh
```

This runs all 4 test suites:
1. Edge Case Tests (37 assertions)
2. Stress Test - 50 operations
3. Stress Test - 200 operations  
4. Advanced Scenario Tests (10 scenarios)

**Expected Result**: 100% success rate across all tests

## Individual Test Suites

### 1. Edge Case Tests
**Purpose**: Validate core session lifecycle, nested sessions, interrupts, and recovery

```bash
node .github/scripts/test-session-resilience.js

# Run specific test
node .github/scripts/test-session-resilience.js --test=3

# Verbose output
node .github/scripts/test-session-resilience.js --verbose
```

**Tests Included**:
- Basic session lifecycle
- Single interrupt and resume
- Nested sessions (depth 0-3)
- Multiple random interrupts
- Corruption recovery
- Concurrent session handling
- Max depth enforcement
- Random task switching
- Auto-resume parent on child completion
- Session hierarchy traversal

### 2. Stress Test
**Purpose**: High-volume randomized operations to test system limits

```bash
# Moderate load (50 operations)
node .github/scripts/stress-test-sessions.js --operations=50

# High load (200 operations)
node .github/scripts/stress-test-sessions.js --operations=200

# Custom load with seed for reproducibility
node .github/scripts/stress-test-sessions.js --operations=100 --seed=12345
```

**Validates**:
- Parent reference integrity
- Depth consistency
- No orphaned sessions
- State corruption detection
- Performance under load

### 3. Advanced Scenario Tests
**Purpose**: Test specific complex edge cases and recovery scenarios

```bash
node .github/scripts/scenario-test-sessions.js
```

**Scenarios Tested**:
1. Rapid context switching (30 switches in ~1.5s)
2. Interrupt storm (cascading interrupts)
3. Selective resumption (non-linear)
4. State corruption and recovery
5. Deep nesting with sequential completion
6. Massive parallel session creation (50+ sessions)
7. Non-sequential phase transitions
8. Stack-based interrupt handling
9. Empty session edge cases
10. Context preservation across interrupts

## Test Results

### Current Status: ✅ 100% Success Rate

| Test Suite | Assertions/Tests | Result | Error Rate |
|------------|------------------|--------|------------|
| Edge Cases | 37 assertions | ✅ PASS | 0.00% |
| Stress (50 ops) | ~15 validations | ✅ PASS | 0.00% |
| Stress (200 ops) | ~65 validations | ✅ PASS | 0.00% |
| Advanced Scenarios | 10 scenarios | ✅ PASS | 0.00% |

### Key Capabilities Verified

✅ **Nested Sessions**: Handles depths 0-26+ without errors  
✅ **Auto-Resume**: Parent sessions auto-resume on child completion  
✅ **Corruption Recovery**: Automatic backup and recovery mechanisms  
✅ **Rapid Switching**: 30 context switches in 1.5 seconds  
✅ **High Volume**: 50+ parallel sessions, 200+ random operations  
✅ **Stack-Based**: Correct parent assignment in interrupt scenarios  
✅ **State Preservation**: Context maintained across all operations  

## What Gets Tested

### Session Lifecycle
- Start → Work → Complete flow
- Phase transitions (all 7 phases: CONTEXT, PLAN, COORDINATE, INTEGRATE, VERIFY, LEARN, COMPLETE)
- Status tracking (active/completed)

### Interrupt Handling
- Automatic parent session pause
- PAUSE/RESUME action logging
- Child session depth calculation
- Parent session ID tracking

### Auto-Resume Mechanism
- Child completion triggers parent resume
- Phase/progress restoration
- Recursive resume through hierarchy
- RESUME action logging

### State Management
- Atomic file writes (`.tmp` + rename)
- Automatic backup creation
- Action rotation (max 500)
- Multi-session tracking

### Validation & Recovery
- Parent reference integrity
- Depth consistency
- Orphan session detection
- Corruption recovery from backup

## Edge Cases Discovered

### 1. Stack-Based Parent Assignment
When starting a new session, the parent is the **most recent active session**, not necessarily the current session after a resume.

**Example**:
```
session-1 (depth 0, active)
  → session-2 (depth 1, active, parent=session-1)
  → resume(session-1)  # Sets current to session-1
  → start("interrupt") # Parent is session-2 (last active), not session-1
```

**Rationale**: Stack-based workflow - interrupts stack on top of the active session stack.

### 2. Deep Nesting Resilience
- **Tested**: Depths 0-26 in stress tests
- **Result**: No errors, all parent references correct
- **Warning**: Soft limit warning at depth 3

### 3. Corruption Recovery
- **Mechanism**: Atomic writes + automatic `.backup` files
- **Recovery**: Copy `.akis-sessions.json.backup` → `.akis-sessions.json`
- **Success Rate**: 100%

## Debugging Tests

### View Test Backups
```bash
ls -la /tmp/akis-test-backups/
```

### Check Session State
```bash
cat .akis-session.json | jq .
cat .akis-sessions.json | jq .
```

### Clean Test State
```bash
rm -f .akis-session.json .akis-sessions.json .akis-sessions.json.backup
```

## Performance Benchmarks

| Operation | Volume | Duration | Result |
|-----------|--------|----------|--------|
| Context Switches | 30 | ~1.5s | ✅ 0 errors |
| Session Creation | 50 | ~2.4s | ✅ 0 errors |
| Random Operations | 200 | ~30s | ✅ 0 errors |

## Detailed Results

See [`SESSION_RESILIENCE_TEST_RESULTS.md`](../SESSION_RESILIENCE_TEST_RESULTS.md) for:
- Detailed test results
- System capabilities analysis
- Edge case documentation
- Recommendations

## Requirements Met

✅ **High volume edge case simulations**: 200+ operations tested  
✅ **Session resilience**: 0% error rate across all tests  
✅ **Nested sessions**: Depth 0-26+ handling verified  
✅ **Automatic recovery**: Corruption recovery tested  
✅ **Multiple random tasks**: Task switching and parallel sessions tested  
✅ **Context switches**: Rapid switching (30 in 1.5s) verified  
✅ **Resume where interrupted**: Auto-resume parent sessions validated  

## Contributing

To add new tests:

1. **Edge Case Test**: Add to `test-session-resilience.js`
2. **Stress Test**: Modify weights in `stress-test-sessions.js`
3. **Scenario Test**: Add new scenario to `scenario-test-sessions.js`

All tests should follow the pattern:
- Reset state before test
- Execute operations
- Validate state
- Record results
- Backup state for debugging
