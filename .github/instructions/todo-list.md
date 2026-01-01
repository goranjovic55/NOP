```markdown
---
applyTo: '**'
---

# Todo List Management

## REQUIRED Format

All todo lists MUST use the AKIS PHASE format to track workflow progress systematically.

## Standard 7-Phase Todo Template

```json
[
  {"id": 1, "status": "not-started", "title": "[PHASE: CONTEXT | 1/7] Load knowledge and analyze requirements"},
  {"id": 2, "status": "not-started", "title": "[PHASE: PLAN | 2/7] Design approach and select skills"},
  {"id": 3, "status": "not-started", "title": "[PHASE: COORDINATE | 3/7] Delegate or prepare tools"},
  {"id": 4, "status": "not-started", "title": "[PHASE: INTEGRATE | 4/7] Execute implementation"},
  {"id": 5, "status": "not-started", "title": "[PHASE: VERIFY | 5/7] Test and validate"},
  {"id": 6, "status": "not-started", "title": "[PHASE: LEARN | 6/7] Update project knowledge"},
  {"id": 7, "status": "not-started", "title": "[PHASE: COMPLETE | 7/7] Finalize and emit results"}
]
```

## Phase Descriptions

| Phase | Description Template |
|-------|---------------------|
| CONTEXT | Load knowledge and analyze [specific area] |
| PLAN | Design [component/solution] approach and select skills |
| COORDINATE | Delegate [task] OR prepare [tools/resources] |
| INTEGRATE | Execute [implementation/changes] |
| VERIFY | Test [feature/changes] and validate [criteria] |
| LEARN | Update project knowledge with [learnings] |
| COMPLETE | Finalize [deliverable] and emit results |

## Status Management

- **not-started**: Phase hasn't begun
- **in-progress**: Currently working on this phase (ONLY 1 at a time)
- **completed**: Phase finished

## Rules

1. **Always create all 7 phases** - Even if some will be skipped, create the full structure
2. **Use exact phase names** - CONTEXT, PLAN, COORDINATE, INTEGRATE, VERIFY, LEARN, COMPLETE
3. **Progress format** - `N/7` where N is phase number (1-7)
4. **One in-progress** - Only mark ONE phase as in-progress at a time
5. **Sequential completion** - Mark completed immediately after finishing each phase

## Quick Fix Example

For quick fixes (skip PLAN and COORDINATE), still create all phases but mark as completed:

```json
[
  {"id": 1, "status": "completed", "title": "[PHASE: CONTEXT | 1/7] Analyzed bug in error handler"},
  {"id": 2, "status": "completed", "title": "[PHASE: PLAN | 2/7] Quick fix - no design needed"},
  {"id": 3, "status": "completed", "title": "[PHASE: COORDINATE | 3/7] No delegation required"},
  {"id": 4, "status": "in-progress", "title": "[PHASE: INTEGRATE | 4/7] Fix null pointer check"},
  {"id": 5, "status": "not-started", "title": "[PHASE: VERIFY | 5/7] Test error scenarios"},
  {"id": 6, "status": "not-started", "title": "[PHASE: LEARN | 6/7] Update knowledge"},
  {"id": 7, "status": "not-started", "title": "[PHASE: COMPLETE | 7/7] Finalize bug fix"}
]
```

## Multi-Task Example

For tasks with subtasks, keep phase structure but add specifics:

```json
[
  {"id": 1, "status": "completed", "title": "[PHASE: CONTEXT | 1/7] Analyze Exploit-DB integration requirements"},
  {"id": 2, "status": "completed", "title": "[PHASE: PLAN | 2/7] Design searchsploit integration strategy"},
  {"id": 3, "status": "completed", "title": "[PHASE: COORDINATE | 3/7] Prepare Docker and backend modules"},
  {"id": 4, "status": "in-progress", "title": "[PHASE: INTEGRATE | 4/7] Implement searchsploit service endpoints"},
  {"id": 5, "status": "not-started", "title": "[PHASE: VERIFY | 5/7] Test end-to-end exploit matching"},
  {"id": 6, "status": "not-started", "title": "[PHASE: LEARN | 6/7] Update knowledge with integration patterns"},
  {"id": 7, "status": "not-started", "title": "[PHASE: COMPLETE | 7/7] Document and finalize feature"}
]
```

## Benefits

- **Progress visibility** - Clear view of where agent is in workflow
- **Session tracking** - Aligns with session-tracker.js phase emissions
- **Consistent structure** - All agents follow same pattern
- **Workflow compliance** - Ensures all phases are considered
```
