```markdown
---
applyTo: '**'
---

# Protocols

## Session

**Start**: `[SESSION: task] @AgentName` + `[AKIS] entities=N | skills=X,Y | patterns=Z`

**End**: `[COMPLETE] outcome | changed: files`

## Delegation (_DevTeam only)

`#runSubagent Name "Task: ... | Context: ... | Skills: ... | Expect: RESULT_TYPE"`

| Agent | Return |
|-------|--------|
| Architect | `[DESIGN_DECISION]` |
| Developer | `[IMPLEMENTATION_RESULT]` |
| Reviewer | `[VALIDATION_REPORT]` |
| Researcher | `[FINDINGS]` |

## Interrupts

`[PAUSE]` → `[STACK: push]` → work → `[STACK: pop]` → `[RESUME]`

**Max depth**: 3
```
