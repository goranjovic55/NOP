# Drift Detection Emission Strategy

**Goal**: Detect agent drift with minimal performance impact  
**Based on**: Analysis of 21 workflow sessions  
**Method**: Strategic emissions at decision points, not ceremony

---

## Problem Statement

**Current approach**:
- 8.7 emissions per session average
- 40% overhead for quick tasks
- 50% of drift detected by **user**, not emissions
- Ceremonial emissions (SKILLS, KNOWLEDGE at start) don't prevent drift

**Key finding**: 
- **User detected drift**: 50.0% of cases
- **Missing emission noticed**: 12.5% of cases
- **Emissions didn't prevent drift**: They documented it after the fact

---

## Emission Effectiveness Data

### Emissions in Drift-Detected Sessions

| Emission | Present in Drift Sessions | Present in No-Drift Sessions |
|----------|---------------------------|------------------------------|
| ATTEMPT | 75.0% | 53.8% |
| SESSION | 62.5% | 7.7% |
| PHASE | 62.5% | 15.4% |
| DECISION | 62.5% | 53.8% |
| KNOWLEDGE | 37.5% | 15.4% |
| SKILLS | 12.5% | 15.4% |

**Analysis**: 
- ATTEMPT and SESSION are most common in drift sessions
- SKILLS emission shows NO correlation with drift detection
- Having more emissions doesn't prevent drift

---

## Performance Impact of Current Emissions

### Ceremonial Emissions (High Overhead, Low Value)

```
[SESSION: role=Lead | task=<desc> | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]
[SKILLS: loaded=14 | available: #1-Code Standards, #2-Error Handling, ...]
[KNOWLEDGE: loaded | entities=257 | sources=2 (project_knowledge.json, global_knowledge.json)]
```

**Time cost**: 60-90 seconds to emit properly  
**Drift detection value**: 0 (happens before any work)  
**Overhead for 5-min task**: 20-30% just for initialization

### Action Emissions (Low Overhead, High Value)

```
[DECISION: Use FastAPI vs Flask?] → FastAPI (team familiar, async support)
[ATTEMPT #1] Implement auth endpoint → ✓ success
```

**Time cost**: 10-15 seconds per emission  
**Drift detection value**: High (shows actual work and reasoning)  
**Overhead**: 3-5% of task time

---

## Proposed Strategy: Strategic Emissions

### 1. Start Marker (Single Line)
```
[SESSION: task_description] @mode
```

**Examples**:
```
[SESSION: Fix password hashing bug] @_DevTeam
[SESSION: Design authentication system] @Architect
[SESSION: Investigate slow query] @Researcher
```

**Time cost**: 5 seconds  
**Benefit**: Establishes session context, enables drift detection baseline  
**When it catches drift**: When agent starts implementing without emitting this

### 2. Decision Points (Inline)
```
[DECISION: question] → answer
```

**Examples**:
```
[DECISION: REST vs GraphQL?] → REST (simpler, team knows it)
[DECISION: Delegate to Developer?] → No (simple 3-line fix)
[DECISION: Update tests?] → Yes (auth change affects 5 tests)
```

**Time cost**: 10 seconds per decision  
**Benefit**: Shows reasoning trail, catches drift when choices made without考虑  
**When it catches drift**: When agent makes architectural choices without documenting

### 3. Action Tracking (Per-Attempt)
```
[ATTEMPT #N] action → ✓/✗ outcome
```

**Examples**:
```
[ATTEMPT #1] Add bcrypt hashing → ✓ implemented
[ATTEMPT #2] Run tests → ✗ 2 failures (expected field missing)
[ATTEMPT #3] Fix test fixtures → ✓ all tests pass
```

**Time cost**: 5 seconds per attempt  
**Benefit**: Creates execution trace, shows progress vs spinning  
**When it catches drift**: When agent is stuck in loops or trying wrong approaches

### 4. Mode Violations (Auto-Trigger)
```
[MODE_VIOLATION: _DevTeam implementing code directly]
→ Should delegate to @Developer or acknowledge simple edit
```

**Time cost**: 0 (triggered by behavior detection)  
**Benefit**: Catches role violations in real-time  
**When it catches drift**: When orchestrator does implementation work

### 5. Phase Transitions (Major Milestones Only)
```
[→VERIFY] Starting validation phase
```

**Examples**:
```
[→PLAN] Designing approach
[→VERIFY] Testing changes
[→COMPLETE] Task finished
```

**Time cost**: 3 seconds per major transition  
**Benefit**: Shows workflow progress at high level  
**When it catches drift**: When agent skips verification or jumps to completion

### 6. Completion Marker (With Artifacts)
```
[COMPLETE] outcome | changed: files
```

**Examples**:
```
[COMPLETE] Auth implemented | changed: auth.py, tests/test_auth.py
[COMPLETE] Bug fixed | changed: password_hash.py
[COMPLETE] Design documented | changed: docs/auth_design.md
```

**Time cost**: 10 seconds  
**Benefit**: Creates checkpoint, enables verification  
**When it catches drift**: When agent claims done but no files changed

---

## Drift Detection Patterns

### Pattern 1: Missing Start Marker
```
User: Fix the login bug
Agent: [starts editing files without SESSION marker]

Detection: No [SESSION: ...] in first 50 lines
Alert: "⚠️ Agent started work without session initialization"
```

### Pattern 2: Decisions Without Documentation
```
Agent: [changes from JWT to sessions without [DECISION: ...]]

Detection: Significant code changes without DECISION marker
Alert: "⚠️ Architectural change made without documented decision"
```

### Pattern 3: Stuck in Loop
```
[ATTEMPT #1] Install package → ✗ failed
[ATTEMPT #2] Install package → ✗ failed
[ATTEMPT #3] Install package → ✗ failed
[ATTEMPT #4] Install package → ✗ failed

Detection: 3+ failed attempts with same action
Alert: "⚠️ Agent stuck in loop, may need user guidance"
```

### Pattern 4: Mode Violation
```
[SESSION: Design auth system] @Architect
[Agent starts editing code files]

Detection: @Architect role editing implementation files
Alert: "⚠️ Architect implementing code, should delegate to @Developer"
```

### Pattern 5: Skipped Verification
```
[ATTEMPT #5] Deploy changes → ✓ deployed
[COMPLETE] Feature done

Detection: No [→VERIFY] phase before COMPLETE
Alert: "⚠️ No verification phase detected, tests may not have run"
```

### Pattern 6: Phase Regression
```
[→PLAN] Designing
[→VERIFY] Testing
[→PLAN] Designing again

Detection: Moving backwards in phase flow
Alert: "⚠️ Phase regression detected, may indicate confusion"
```

---

## Performance Comparison

### Current Approach (Ceremonial)
```
[SESSION: role=Lead | task=Fix bug | phase=CONTEXT]
[PHASE: CONTEXT | progress=1/7]
[SKILLS: loaded=14 | available: #1-Code Standards, #2-Error ...]
[KNOWLEDGE: loaded | entities=257 | sources=2 ...]
[PHASE: COORDINATE | progress=3/7]
[ATTEMPT #1] Fix bug
[PHASE: VERIFY | progress=5/7]
[COMPLETE: task=Fix bug | result=Fixed]
```

**Lines**: 8  
**Characters**: ~500  
**Time**: 90 seconds  
**Drift caught**: 0 (before any work)

### Strategic Approach (Action-Based)
```
[SESSION: Fix password hashing bug] @_DevTeam
[DECISION: Fix vs redesign?] → Fix (scope creep risk)
[ATTEMPT #1] Update hash function → ✓ bcrypt added
[ATTEMPT #2] Run tests → ✗ 2 failures
[ATTEMPT #3] Fix test mocks → ✓ all pass
[→VERIFY] Tests passing, ready for review
[COMPLETE] Bug fixed | changed: auth.py, test_auth.py
```

**Lines**: 7  
**Characters**: ~350  
**Time**: 50 seconds  
**Drift caught**: 4 decision points, 3 attempts, 1 verification

**Savings**: 40 seconds (44% reduction)  
**Quality**: Higher (actual work trace vs ceremony)

---

## Implementation Recommendations

### 1. Make Emissions Contextual

**Bad** (ceremony):
```
[SKILLS: loaded=14 | available: #1,#2,#3,#4,#5,#6,#7,#8,#9,#10,#11,#12,#13,#14]
```

**Good** (when relevant):
```
[DECISION: Auth approach?] → JWT tokens (skill #3 Security applied)
```

Emit skill reference WHEN USED, not at start.

### 2. Make Emissions Actionable

**Bad** (status update):
```
[PHASE: COORDINATE | progress=3/7 | next=INTEGRATE]
```

**Good** (what's happening):
```
[→COORDINATE] Implementing auth endpoints
```

User can see what agent is doing, not just where it is in process.

### 3. Make Emissions Concise

**Bad** (multi-line):
```
[KNOWLEDGE: added=3 | updated=1 | type=project]
Entities added:
- NOP.Auth.JWTService
- NOP.Auth.TokenValidator
- NOP.Auth.RefreshToken
```

**Good** (inline):
```
[COMPLETE] Auth implemented | knowledge: +3 entities
```

Details in workflow log, not in emissions.

### 4. Auto-Detect Drift

Instead of requiring manual emissions that might be missed:

```python
# Pseudo-code for drift detection
if file_edit_detected() and not recent_emission("DECISION|ATTEMPT"):
    warn("⚠️ File edit without documented decision/attempt")

if attempt_count > 3 and same_action():
    warn("⚠️ Stuck in loop, consider different approach")

if role == "Architect" and editing_implementation_files():
    warn("⚠️ Mode violation: Architect implementing code")
```

### 5. Visual Drift Indicators

For user visibility (optional UI enhancement):

```
🟢 [SESSION] started
🔵 [→PLAN] designing approach
🟡 [DECISION] made choice (alternatives documented)
🟢 [ATTEMPT #1] action succeeded
🔴 [ATTEMPT #2] action failed
🟢 [→VERIFY] testing phase
🟢 [COMPLETE] task done

⚠️  Warning: 3 failed attempts in sequence
⚠️  Warning: No verification before completion
```

---

## Recommended Emission Set

### Required (Drift Detection)
1. `[SESSION: task] @mode` - Start marker
2. `[DECISION: ?] → answer` - At choice points
3. `[ATTEMPT #N] action → ✓/✗` - Per action
4. `[COMPLETE] result | changed: files` - End marker

### Optional (Enhanced Visibility)
5. `[→PHASE]` - Major transitions only (PLAN, VERIFY, COMPLETE)
6. `[SKILL: #N]` - Inline when skill applied (not listing at start)
7. `[KNOWLEDGE: +N]` - Inline at completion if knowledge added

### Auto-Detected (No Manual Emission)
8. Mode violations (role doing wrong work)
9. Loop detection (same action failing repeatedly)
10. Missing verification (deployment without testing)

---

## Expected Outcomes

### Performance Improvement
- **Emission time**: 90s → 50s (44% reduction)
- **Overhead for quick tasks**: 40% → 15%
- **Overhead for complex tasks**: 10% → 7%

### Drift Detection Improvement
- **User-detected drift**: 50% → 15% (automated warnings)
- **Emission-detected drift**: 12.5% → 60% (strategic placement)
- **Real-time alerts**: 0% → 70% (auto-detection triggers)

### Compliance Improvement
- **Required emissions**: 4 vs 10 (60% reduction)
- **Expected compliance**: 52% → 85% (fewer, clearer requirements)
- **False positives**: Lower (emissions at decision points, not ceremony)

---

## Migration Path

### Phase 1: Add Strategic Emissions (Parallel)
- Keep existing protocol
- Add new strategic emissions alongside
- Measure which catches drift better

### Phase 2: Deprecate Ceremonial Emissions
- Remove SKILLS listing at start
- Remove KNOWLEDGE listing at start
- Remove PHASE progress tracking
- Keep decision/attempt/complete markers

### Phase 3: Add Auto-Detection
- Implement mode violation detection
- Implement loop detection
- Implement verification skip detection

### Phase 4: Validate Improvement
- Measure drift detection rate
- Measure performance overhead
- Measure user satisfaction
- Adjust based on data

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Emission overhead (quick tasks) | 40% | 15% | Time spent on emissions vs work |
| Drift detected by emissions | 12.5% | 60% | % of drift caught by emissions |
| Drift detected by user | 50% | 15% | % of drift user had to point out |
| Compliance rate | 52% | 85% | % sessions with required emissions |
| Average emissions per session | 8.7 | 4-5 | Count of emissions |
| False positive alerts | N/A | <5% | Warnings that weren't actual drift |

---

## Conclusion

**Strategic emissions beat ceremonial emissions**:
- Emit at **decision points**, not start/end ceremony
- Emit **what and why**, not progress percentages
- **Auto-detect** patterns that indicate drift
- Make emissions **actionable** for user intervention

**Result**: Better drift detection with 44% less overhead.
