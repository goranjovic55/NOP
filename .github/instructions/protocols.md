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

## Todo List Format

**REQUIRED**: All todos MUST use PHASE format for tracking workflow progress.

**Format**: `[PHASE: NAME | N/7] Description`

**Example**:
```json
[
  {"id": 1, "status": "completed", "title": "[PHASE: CONTEXT | 1/7] Load knowledge and analyze requirements"},
  {"id": 2, "status": "in-progress", "title": "[PHASE: PLAN | 2/7] Design approach and select skills"},
  {"id": 3, "status": "not-started", "title": "[PHASE: COORDINATE | 3/7] Delegate or prepare tools"},
  {"id": 4, "status": "not-started", "title": "[PHASE: INTEGRATE | 4/7] Execute implementation"},
  {"id": 5, "status": "not-started", "title": "[PHASE: VERIFY | 5/7] Test and validate"},
  {"id": 6, "status": "not-started", "title": "[PHASE: LEARN | 6/7] Update project knowledge"},
  {"id": 7, "status": "not-started", "title": "[PHASE: COMPLETE | 7/7] Finalize and emit results"}
]
```

**Rules**:
- Always create all 7 phases (skip phases only in execution, not in todo creation)
- Use exact phase names: CONTEXT, PLAN, COORDINATE, INTEGRATE, VERIFY, LEARN, COMPLETE
- Progress format: `N/7` where N is phase number (1-7)
- For quick fixes, still create all phases but mark some as completed immediately
```
