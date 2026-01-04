# Failure Mode Detection & Drift Analysis

**Purpose**: Comprehensive analysis of agent drift and structure degradation in long/complex sessions  
**Based On**: Long session and complex session simulations  
**Focus**: Observable failure patterns, detection mechanisms, preventive measures

---

## Executive Summary

Analysis of simulated long (3.75h, 73 emissions) and complex (2h, 72 emissions, 11 context switches) sessions reveals systematic drift patterns that emerge after specific thresholds. Framework exhibits graceful degradation rather than catastrophic failure, with detectable warning signs before critical issues.

**Key Findings**:
- Drift begins at 40-50 emissions (emission fatigue)
- Context fragmentation occurs after 5+ switches
- Stack overflow risk increases exponentially after depth 2
- Main thread obscurity correlates with context switch count

---

## Part 1: Agent Drift Patterns

### 1.1 Orchestrator Drift

#### Pattern A: Main Thread Obscurity

**Onset**: After 50 emissions or 7+ context switches  
**Symptom**: Intermediate goals overshadow original task

**Example from Complex Session**:
```
Original task: "Fix DB deadlock causing 503s"

After 50 emissions:
  Current focus: "Fix queue overflow in asset update worker"
  
Drift: Queue overflow became primary concern, deadlock resolution implicit
```

**Detection Mechanism**:
```python
def detect_main_thread_drift(emissions):
    last_20 = emissions[-20:]
    original_task_mentions = count_mentions(last_20, original_task_keywords)
    
    if original_task_mentions < 2:
        return "DRIFT_DETECTED: Main thread not mentioned in last 20 emissions"
```

**Observable Indicators**:
- [ ] Original task not mentioned in 20+ emissions
- [ ] Workflow log summary focuses on subtask, not main task
- [ ] COMPLETE emission describes intermediate result, not original goal

---

#### Pattern B: Emission Fatigue

**Onset**: After 40 emissions  
**Symptom**: Less detailed emissions, mechanical responses

**Comparison**:
```
Emission #10 (fresh):
[DELEGATE: agent=Developer | task="Implement OAuth2 endpoints with Google provider support, including /authorize redirect and /token exchange" | expected="Full OAuth flow working" | files=["oauth.py", "routes.py"]]

Emission #65 (fatigued):
[DELEGATE: agent=Developer | task="Fix queue"]
```

**Detection Mechanism**:
```python
def detect_emission_fatigue(emissions):
    early = emissions[0:20]
    late = emissions[-20:]
    
    early_avg_length = avg_length(early)
    late_avg_length = avg_length(late)
    
    if late_avg_length < early_avg_length * 0.5:
        return "FATIGUE_DETECTED: Emission detail dropped 50%"
```

**Observable Indicators**:
- [ ] Emission length decreases over time
- [ ] Context fields missing (expected, files, etc.)
- [ ] Generic task descriptions ("Fix issue" vs specific details)

---

#### Pattern C: Context Switch Fatigue

**Onset**: After 8+ context switches  
**Symptom**: Confusion about which context is active

**Example**:
```
Switch #1: investigation → database ✓ clear
Switch #5: service → architecture ✓ clear
Switch #10: testing → queue_fix → retest ✗ confused

At switch #10: Unclear if testing original deadlock or queue overflow
```

**Detection Mechanism**:
```python
def detect_context_confusion(context_switches):
    if len(context_switches) > 8:
        recent_switches = context_switches[-3:]
        if any(s.reason == "fixing issue found during test" for s in recent_switches):
            return "CONFUSION_DETECTED: Testing expanded mid-test"
```

**Observable Indicators**:
- [ ] Context switches >8 in single session
- [ ] Back-and-forth switching (A→B→A→B)
- [ ] Merged contexts (A+B handled together)

---

#### Pattern D: Stack Depth Amnesia

**Onset**: After multiple push/pop cycles  
**Symptom**: Orchestrator forgets what's suspended in stack

**Example**:
```
[STACK: push | task=A | depth=1]
[STACK: push | task=B | depth=2]
[STACK: push | task=C | depth=3]
[STACK: pop | task=C]
[STACK: pop | task=B]

At this point: Is A still suspended? ← Amnesia risk
```

**Detection Mechanism**:
```python
def detect_stack_amnesia(stack_operations):
    suspended = []
    for op in stack_operations:
        if op.type == "push":
            suspended.append(op.task)
        elif op.type == "pop":
            if suspended and suspended[-1] == op.task:
                suspended.pop()
            else:
                return "AMNESIA_DETECTED: Pop doesn't match push"
```

**Observable Indicators**:
- [ ] Pop without matching push
- [ ] Suspended task never resumed
- [ ] Resume attempt on non-existent stack level

---

### 1.2 Specialist Drift

#### Pattern E: Context Overload (Developer)

**Onset**: When delegated 3+ times in rapid succession across different contexts  
**Symptom**: Implementation inconsistencies across contexts

**Example**:
```
Delegation 1: Modify DiscoveryService (uses approach A)
Delegation 2: Modify SnifferService (uses approach B)  ← Inconsistency
Delegation 3: Create Worker (uses approach A again)
```

**Detection Mechanism**:
```python
def detect_developer_overload(delegations):
    developer_tasks = [d for d in delegations if d.agent == "Developer"]
    if len(developer_tasks) >= 3:
        contexts = [d.context for d in developer_tasks]
        if len(set(contexts)) >= 3:
            return "OVERLOAD_DETECTED: Developer juggling 3+ contexts"
```

**Observable Indicators**:
- [ ] 3+ delegations to same specialist in different contexts
- [ ] Implementation patterns diverge across tasks
- [ ] Later tasks take longer than similar earlier tasks

---

#### Pattern F: Review Scope Creep (Reviewer)

**Onset**: When testing expanded mid-test  
**Symptom**: Unclear test coverage, gaps in validation

**Example**:
```
Initial delegation: "Test deadlock prevention"

Mid-test finding: Queue overflow discovered

Unclear: Did Reviewer test:
- Original deadlock prevention? ✓ or ✗
- Queue overflow fix? ✓ or ✗  
- Both together? ✓ or ✗
```

**Detection Mechanism**:
```python
def detect_review_scope_creep(reviewer_tasks):
    for task in reviewer_tasks:
        if task.status == "partial":
            if "but" in task.result.lower():
                return "SCOPE_CREEP: Testing found new issue, original scope unclear"
```

**Observable Indicators**:
- [ ] Reviewer returns "partial" status
- [ ] New issues discovered during review
- [ ] Original test scope not confirmed complete

---

## Part 2: Structure Degradation

### 2.1 Emission Structure Breakdown

**Progression**:
```
Emissions 1-20:   Full structure, all fields populated
Emissions 21-40:  Occasional field omissions
Emissions 41-60:  Frequent field omissions, shorter descriptions
Emissions 61+:    Minimal structure, just essential state changes
```

**Degradation Example**:
```
Emission #15:
[DELEGATE: agent=Developer | task="Implement OAuth2 endpoints" | context="Part of authentication system" | expected="Working /authorize and /token endpoints" | files=["oauth.py"]]

Emission #65:
[DELEGATE: agent=Developer | task="Fix queue"]
```

**Impact**:
- Future agents can't reconstruct session from logs
- Workflow log less useful as documentation
- Harder to resume interrupted sessions

---

### 2.2 Phase Tracking Degradation

**Progression**:
```
Early session:
[PHASE: COORDINATE | progress=3/7 | next=INTEGRATE]

Late session:
[PHASE: VERIFY]  ← Missing progress and next
```

**Impact**:
- Can't determine session completion percentage
- Unclear which phase comes next
- Progress tracking breaks

---

### 2.3 Knowledge Update Neglect

**Pattern**: As emissions increase, knowledge updates decrease

**Observed**:
```
First 30 emissions: 3 knowledge updates
Last 30 emissions: 1 knowledge update  ← Should be same or more
```

**Impact**:
- Learnings not captured for future sessions
- Patterns not codified
- Rediscovery risk increases

---

## Part 3: Detection Mechanisms

### 3.1 Real-Time Monitoring

**Emission Counter**:
```
[MONITOR: emissions=45 | threshold_warning=25 | threshold_critical=30]
IF emissions > 40:
  [WARNING: emission_fatigue_risk | recommendation="Compress emissions or split session"]
```

**Context Switch Counter**:
```
[MONITOR: context_switches=6 | threshold=5]
IF switches > 5:
  [WARNING: context_fragmentation | recommendation="Consolidate contexts"]
```

**Stack Depth Monitor**:
```
[MONITOR: stack_depth=3 | max=3]
IF depth >= max:
  [CRITICAL: stack_overflow_risk | action="Pop before next push"]
```

---

### 3.2 Post-Session Analysis

**Drift Score**:
```python
def calculate_drift_score(session):
    score = 0
    
    # Main thread mentions
    if main_thread_mentions < session.emissions * 0.1:
        score += 20
    
    # Emission quality degradation
    if avg_emission_length(late) < avg_emission_length(early) * 0.5:
        score += 15
    
    # Context switches
    if session.context_switches > 8:
        score += 20
    
    # Stack overflow incidents
    score += session.stack_overflows * 25
    
    # Knowledge update ratio
    if knowledge_updates / emissions < 0.05:
        score += 10
    
    return score

Scoring:
0-20:   Minimal drift ✓
21-40:  Moderate drift ⚠️
41-60:  High drift ❌
61+:    Critical drift 🔴
```

**Example Scores**:
- Long session (user interrupts): 45 (High drift)
- Complex session (context switches): 55 (High drift)

---

### 3.3 Automated Alerts

**Alert Levels**:
```
LEVEL 1 (Warning) - Emission 25:
  [ALERT: approaching_complexity_threshold | action=recommended | split_or_compress]

LEVEL 2 (Critical) - Emission 50:
  [ALERT: high_complexity | action=mandatory | must_split_session]

LEVEL 3 (Emergency) - Stack overflow:
  [ALERT: structural_failure | action=immediate | auto_recover_or_abort]
```

---

## Part 4: Proposed Improvements

### 4.1 Anti-Drift Protocols

#### Protocol 1: Main Thread Reinforcement

```
Every 20 emissions:
[CHECKPOINT: 
  main_goal="<original task>" |
  current_step="<what doing now>" |
  how_this_helps="<connection to main goal>" |
  progress_estimate="<X% complete>"
]
```

**Example**:
```
[CHECKPOINT:
  main_goal="Fix DB deadlock causing 503s" |
  current_step="Testing queue overflow fix" |
  how_this_helps="Queue overflow found during deadlock test, both must work" |
  progress_estimate="85% complete"
]
```

---

#### Protocol 2: Emission Budget

```
[SESSION: role=Lead | task=<desc> | emission_budget=50]

Track consumption:
[MONITOR: emissions=45/50 | remaining=5]

At 90% consumed:
[WARNING: budget_exhausted | action="Wrap up or request extension"]
```

---

#### Protocol 3: Context Consolidation

```
After 5 context switches:
[ANALYSIS: context_fragmentation]
Contexts: [A, B, C, D, E, F]

[RECOMMENDATION: consolidate]
Consolidated:
- Group 1 (Data Layer): A, B, C  
- Group 2 (Service Layer): D, E
- Group 3 (Testing): F

[CONTEXT_SWITCH: from=F | to=Group1 | consolidated=true]
```

---

#### Protocol 4: Mandatory Structure Enforcement

```
[DELEGATE: agent=<required> | task=<required> | context=<required> | expected=<required>]

IF any field missing:
  [VIOLATION: incomplete_emission | enforce_structure]
```

---

### 4.2 Graceful Degradation Strategy

**Accept that degradation happens, manage it**:

```
Emissions 1-25:   Full verbosity
Emissions 26-50:  Compressed format (approved shortcuts)
Emissions 51+:    Mandatory split or special compressed mode
```

**Compressed Format**:
```
Before (full):
[DELEGATE: agent=Developer | task="Modify DiscoveryService to use consistent lock order: always lock assets table first, then discovery table" | context="Part of deadlock fix" | expected="Lock order changed in all UPDATE queries" | files=["discovery_service.py"]]

After (compressed):
[DEL: Dev | "Fix lock order discovery_service.py" | exp="assets→discovery"]
```

---

### 4.3 Session Splitting Triggers

**Automatic Split Conditions**:
```
IF emissions >= 50 OR
   context_switches >= 8 OR
   stack_overflow_count >= 2 OR
   drift_score >= 40:
   
[MANDATORY: split_session]
[HANDOVER: 
  completed=["<what's done>"] |
  in_progress=["<what's partial>"] |
  not_started=["<what's deferred>"] |
  next_session_starts_with="<specific action>"
]
```

---

## Part 5: Validation & Testing

### 5.1 Drift Detection Tests

**Test 1: Main Thread Obscurity**
```python
def test_main_thread_tracking():
    session = simulate_long_session()
    
    # Check original task mentioned regularly
    for window in sliding_windows(session.emissions, size=20):
        mentions = count_task_mentions(window, session.original_task)
        assert mentions >= 2, "Main thread lost"
```

**Test 2: Emission Quality**
```python
def test_emission_quality():
    session = simulate_complex_session()
    
    early = session.emissions[0:20]
    late = session.emissions[-20:]
    
    early_avg = avg_field_count(early)
    late_avg = avg_field_count(late)
    
    assert late_avg >= early_avg * 0.7, "Emission quality degraded >30%"
```

**Test 3: Stack Integrity**
```python
def test_stack_operations():
    session = simulate_session_with_interrupts()
    
    stack = []
    for op in session.stack_operations:
        if op.type == "push":
            stack.append(op.task)
        elif op.type == "pop":
            popped = stack.pop()
            assert popped == op.task, "Stack corruption"
    
    assert len(stack) == 0, "Stack not fully unwound"
```

---

### 5.2 Recovery Tests

**Test 4: Auto-Recovery from Stack Overflow**
```python
def test_stack_overflow_recovery():
    session = simulate_deep_nesting()
    
    overflows = [op for op in session.operations if op.type == "stack_overflow"]
    recoveries = [op for op in session.operations if op.type == "auto_recovery"]
    
    assert len(recoveries) >= len(overflows), "Not all overflows recovered"
```

**Test 5: Context Restoration**
```python
def test_context_restoration():
    session = simulate_interrupted_session()
    
    for interrupt in session.interrupts:
        suspend = find_suspend_for_interrupt(interrupt)
        resume = find_resume_for_interrupt(interrupt)
        
        assert resume.context == suspend.context, "Context not preserved"
```

---

## Part 6: Metrics & Monitoring

### 6.1 Session Health Dashboard

```
┌─ Session Health ─────────────────────────┐
│ Emissions: 45/50 (90%) ⚠️                │
│ Context Switches: 6/5 ⚠️                 │
│ Stack Depth: 2/3 ✓                       │
│ Drift Score: 35 ⚠️                       │
│ Emission Quality: 75% ⚠️                 │
│ Main Thread Clarity: 80% ✓              │
│                                           │
│ Recommendation: Split session soon       │
└───────────────────────────────────────────┘
```

---

### 6.2 Trend Analysis

**Track metrics over time**:
```
Session 1: Drift=15 ✓
Session 2: Drift=25 ⚠️ (↑ trend)
Session 3: Drift=40 ❌ (↑ trend continues)

Alert: Agent instructions may need revision
```

---

## Part 7: Recommendations Summary

### Immediate (Integrate into existing protocols)

1. **Add emission counter with thresholds**:
   - Warning at 25
   - Critical at 50
   - Mandatory split at 60

2. **Add context switch limit**:
   - Warning at 5
   - Mandatory consolidation at 8

3. **Add main thread checkpoint**:
   - Every 20 emissions
   - Must mention original goal

4. **Enforce emission structure**:
   - Required fields in DELEGATE
   - Auto-validation

### Short Term (Next sprint)

5. **Implement drift scoring**:
   - Real-time calculation
   - Alert on threshold breach

6. **Build session health dashboard**:
   - Visual indicators
   - Trend tracking

7. **Create compression guidelines**:
   - Approved shortcuts after emission 40
   - Documented format

8. **Add session splitting tool**:
   - Auto-generate handover
   - Preserve context

### Long Term (Future enhancement)

9. **ML-based drift prediction**:
   - Predict drift before it happens
   - Suggest interventions

10. **Automated session optimization**:
    - Recommend context consolidation
    - Suggest delegation batching

---

## Conclusion

**Key Insights**:
1. Drift is inevitable in long/complex sessions
2. Drift is detectable through observable patterns
3. Graceful degradation better than catastrophic failure
4. Proactive intervention (checkpoints, limits) prevents critical drift

**Critical Thresholds**:
- **Emission count**: 50 is practical limit
- **Context switches**: 5-8 before fragmentation
- **Stack depth**: 3 is hard limit
- **Drift score**: 40 indicates intervention needed

**Success Metrics**:
- 90% of sessions complete with drift score <30
- 95% of stack operations balanced (push/pop matched)
- 100% of sessions maintain main thread mention >5% of emissions

---

**Validation Status**: Simulations demonstrate patterns, real-world testing needed to confirm thresholds
