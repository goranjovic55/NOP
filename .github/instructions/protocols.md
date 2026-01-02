```markdown
---
applyTo: '**'
---

# Protocols

## Session Lifecycle

**Start**: Read `.akis-session.json` → If active, continue from `phase` | If none, start new

**Work**: Follow phases in session → Update with `phase`, `action`, `skill` | Deviate → `decision "why"`

**Interrupt**: User stops → `interrupt "reason"` | Sub-session → Auto-pause parent

**Complete**: `complete "summary"` → If `parentSessionId` exists, auto-resume parent at paused phase

**Headers**: `[SESSION: task] @AgentName | phase: PHASE | depth: N` + `[AKIS] entities=N | skills=X,Y | patterns=Z`

## Delegation (_DevTeam only)

`#runSubagent Name "Task: ... | Context: ... | Skills: ... | Expect: RESULT_TYPE"`

| Agent | Return |
|-------|--------|
| Architect | `[DESIGN_DECISION]` |
| Developer | `[IMPLEMENTATION_RESULT]` |
| Reviewer | `[VALIDATION_REPORT]` |
| Researcher | `[FINDINGS]` |

## Interrupts

**ON INTERRUPT:**
1. `node .github/scripts/session-tracker.js checkpoint` - Auto-save state
2. Preserve: task, agent, phase, progress, decisions

**ON RESUME:**
1. `node .github/scripts/session-tracker.js status` - Check active session
2. `node .github/scripts/session-tracker.js resume` - Get full context
3. Continue from last phase
4. Re-emit `[SESSION:]` and `[AKIS]` headers

**INTERRUPT STACK:**
`[PAUSE]` → `[STACK: push]` → work → `[STACK: pop]` → `[RESUME]`

**Max depth**: 3
```
