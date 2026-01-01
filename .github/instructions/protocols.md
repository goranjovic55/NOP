```markdown
---
applyTo: '**'
---

# Protocols

## Session

**Load**: `.github/skills/session-tracking/SKILL.md` (REQUIRED for all work)

**Start**: 
```
[SESSION: task] @AgentName
session-tracker.js start "task" "AgentName" "user request text"
[AKIS] entities=N | skills=X,Y | patterns=Z
```

**End**: 
1. Present work summary to user
2. **Wait for user verification/approval**
3. After approval: `[COMPLETE] outcome | changed: files`

**CRITICAL**: Never complete session without explicit user confirmation

**See**: `session-tracking` skill for complete patterns and examples

## Delegation (_DevTeam only)

`#runSubagent Name "Task: ... | Context: ... | Skills: ... | Expect: RESULT_TYPE"`

| Agent | Return |
|-------|--------|
| Architect | `[DESIGN_DECISION]` |
| Developer | `[IMPLEMENTATION_RESULT]` |
| Reviewer | `[VALIDATION_REPORT]` |
| Researcher | `[FINDINGS]` |

## Interrupts (Vertical Workflow)

**Load**: `.github/skills/session-tracking/SKILL.md` for interrupt patterns

```
[PAUSE] + session-tracker.js push "reason"
→ [STACK: push depth=1] work on interrupt
→ [STACK: pop depth=0] session-tracker.js pop "result"
[RESUME]
```

**Max depth**: 3
**Tracking**: Push/pop updates `.akis-session.json` stackDepth for visualization

**See**: `session-tracking` skill for examples and anti-patterns
```
