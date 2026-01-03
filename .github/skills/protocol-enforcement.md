# Protocol Enforcement

Patterns for ensuring agent protocol compliance through blocking gates and validation.

## When to Use

- Starting new work sessions
- Multi-step complex tasks
- Context switching between tasks
- Delegating to sub-agents
- Resuming interrupted work

## Checklist

- [ ] Emit [SESSION:] before any work
- [ ] Load knowledge and emit [AKIS]
- [ ] Declare [PHASE:] progression
- [ ] Track skill usage with [SKILL:]
- [ ] Handle interrupts with [PAUSE:]/[RESUME:]
- [ ] Complete with [COMPLETE:]

## Session Start Protocol

### Blocking Gate 1: Session Declaration
```
[SESSION: <task_name>] @AgentName | phase: CONTEXT | depth: 0

Before ANY work begins:
1. State the task clearly
2. Identify the agent
3. Set initial phase to CONTEXT
4. Set depth (0 for main, 1+ for sub-tasks)
```

### Blocking Gate 2: Knowledge Loading
```
[AKIS] entities=N | skills=M

Must occur before code changes:
1. Read project_knowledge.json
2. Count entities and relations
3. Emit knowledge loaded confirmation
4. Reference relevant entities in decisions
```

### Blocking Gate 3: Phase Declaration
```
[PHASE: CONTEXT] progress=1/6
[PHASE: PLAN] progress=2/6
[PHASE: IMPLEMENT] progress=3/6
[PHASE: VERIFY] progress=4/6
[PHASE: LEARN] progress=5/6
[PHASE: COMPLETE] progress=6/6

Phase progression rules:
- Never skip phases
- Emit phase change before phase work
- Include progress indicator
- Document reason for phase transition
```

## Examples

### Complete Session Flow
```
[SESSION: fix-login-bug] @Developer | phase: CONTEXT | depth: 0
[AKIS] entities=156 | skills=10

[PHASE: CONTEXT] progress=1/6
- Reading Login.tsx and authStore.ts
- Issue: Form validation runs before input

[PHASE: PLAN] progress=2/6
[SKILL: frontend-react | applied] → Component state handling
- Add useEffect to delay validation
- Update form submit handler

[PHASE: IMPLEMENT] progress=3/6
- Modified Login.tsx lines 45-60
- Added validation delay state

[PHASE: VERIFY] progress=4/6
- Built frontend: npm run build ✓
- Tested login flow: working ✓

[PHASE: LEARN] progress=5/6
- Pattern: validation timing in forms
- Updated project_knowledge.json

[PHASE: COMPLETE] progress=6/6
[COMPLETE: task="fix-login-bug" | files=1 | tests=passed]
```

### Context Switching Protocol
```
# Main task running
[SESSION: refactor-dashboard] @Developer | phase: IMPLEMENT | depth: 0

# Interrupt detected - must handle
[PAUSE: reason="user-request" | phase=IMPLEMENT | progress=42%]

# New urgent task
[SESSION: hotfix-crash] @Developer | phase: CONTEXT | depth: 1

... work on hotfix ...

[COMPLETE: task="hotfix-crash" | result=success]

# Resume main task
[RESUME: task="refactor-dashboard" | from=IMPLEMENT | progress=42%]

# Continue from saved state
[PHASE: IMPLEMENT] progress=3/6 (resumed)
```

### Sub-Agent Delegation
```
# Orchestrator session
[SESSION: add-feature] @_DevTeam | phase: PLAN | depth: 0

[DELEGATE: agent=Developer | task="implement-api-endpoint"]
# Sub-agent begins
[SESSION: implement-api-endpoint] @Developer | phase: CONTEXT | depth: 1

... sub-agent work ...

[COMPLETE: task="implement-api-endpoint" | result=success]
# Back to orchestrator

[INTEGRATE: from=Developer | result=success | files=2]
```

### Skill Usage Tracking
```
[SKILL: backend-api | applied] → Endpoint follows REST conventions
[SKILL: error-handling | applied] → Added proper exception handler
[SKILL: testing | applied] → Created unit test for new endpoint
```

## Validation Rules

### Phase Ordering
```python
VALID_PHASE_ORDER = [
    "CONTEXT",
    "PLAN", 
    "IMPLEMENT",
    "VERIFY",
    "LEARN",
    "COMPLETE"
]

def validate_phase_transition(from_phase: str, to_phase: str) -> bool:
    from_idx = VALID_PHASE_ORDER.index(from_phase)
    to_idx = VALID_PHASE_ORDER.index(to_phase)
    return to_idx == from_idx + 1  # Must progress sequentially
```

### Session Completeness
```python
REQUIRED_EMISSIONS = [
    "[SESSION:",      # At start
    "[AKIS]",         # Before code changes
    "[PHASE: CONTEXT]",
    "[PHASE: IMPLEMENT]",
    "[PHASE: COMPLETE]",
    "[COMPLETE:",     # At end
]

def validate_session(log: str) -> bool:
    return all(emission in log for emission in REQUIRED_EMISSIONS)
```

## Anti-Patterns

- ❌ Starting work without [SESSION:] → ✅ Always emit session start first
- ❌ Making code changes in CONTEXT phase → ✅ Changes only in IMPLEMENT
- ❌ Skipping VERIFY phase → ✅ Always test before COMPLETE
- ❌ No skill tracking → ✅ Emit [SKILL:] when applying patterns
- ❌ Abandoning session without COMPLETE → ✅ Always emit COMPLETE even on failure

## Compliance Metrics

These baselines were measured from 29 historical workflow logs (2025-12-28 to 2026-01-02) 
before the protocol enforcement skill was created. With this skill applied, compliance 
should improve significantly (target: 85%+).

| Metric | Target | Baseline (historical) |
|--------|--------|----------------------|
| SESSION emission | 100% | 15.8% |
| AKIS loading | 100% | 6.9% |
| Phase tracking | 100% | 13.7% |
| Skill usage | 100% | 3.4% |
| COMPLETE emission | 100% | 17.2% |

## Related

- `documentation` - Workflow log patterns
- `knowledge-management` - Knowledge loading

---
*Created: 2026-01-03*
*Priority: Critical*
*Estimated Impact: 90%*
