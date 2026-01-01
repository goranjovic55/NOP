---
applyTo: '**'
---

# Protocols

## Session Boundaries

**Start**:
```
[SESSION: task] @AgentName
[AKIS_LOADED] entities: N | skills: ... | patterns: ...
```

**Finish**:
```
[SKILLS_USED] skill1, skill2
[COMPLETE] outcome | changed: files
```

## Delegation (_DevTeam only)

```
#runSubagent Name "
Task: <description>
Context: <info>
Skills: skill1, skill2
Expect: RESULT_TYPE
"
```

**Return**: `[COMPLETE]` then agent-specific: `[DESIGN_DECISION|IMPLEMENTATION_RESULT|VALIDATION_REPORT|FINDINGS]`

## Interrupts

```
[PAUSE: task=current | phase=PHASE]
[STACK: push | task=interrupt | depth=N]
<work on interrupt>
[STACK: pop | result=summary]
[RESUME: task=current | phase=PHASE]
```

**Max depth**: 3 levels
