```markdown
---
applyTo: '**'
---

# Protocols

## Session Lifecycle

| Action | Protocol |
|--------|----------|
| Start | Read `.akis-session.json` → Continue or start new |
| Work | Follow phases → Update session → Deviate → `decision "why"` |
| Interrupt | `interrupt "reason"` → Auto-pause parent |
| Complete | `complete "summary"` → Auto-resume parent |

**Headers**: `[SESSION: task] @Agent | phase: PHASE | depth: N` + `[AKIS] entities=N | skills=X,Y`

## Delegation

`#runSubagent Name "Task: ... | Context: ... | Skills: ... | Expect: TYPE"`

| Agent | Return |
|-------|--------|
| Architect | `[DESIGN_DECISION]` |
| Developer | `[IMPLEMENTATION_RESULT]` |
| Reviewer | `[VALIDATION_REPORT]` |
| Researcher | `[FINDINGS]` |

**On delegation receive**: Parse → `[PARSED: task="X" | constraints=[...] | output="TYPE"]` → Then work

**Context = CONSTRAINTS**, not suggestions!

## Interrupts

**Save**: `node session-tracker.js checkpoint`  
**Resume**: `node session-tracker.js resume` → Re-emit headers  
**Stack**: `[PAUSE]` → work → `[RESUME]` | Max depth: 3 (HARD LIMIT)

## Stale Session Recovery

| Age | Action |
|-----|--------|
| < 30min | Auto-resume from checkpoint |
| 30min-1hr | `[STALE: task=X]` → Ask user |
| > 1hr | Mark abandoned, start fresh |

## Checkpoint Protocol

Every phase transition → `node session-tracker.js checkpoint`  
Recovery: `node session-tracker.js recover` → Restore last state

## Orphan Protection

Before child work: Check `checkParentHealth()`  
If orphaned: Persist to `.akis-orphan-{id}.json` for recovery
```
