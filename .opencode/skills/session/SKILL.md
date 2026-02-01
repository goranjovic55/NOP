---
name: session
description: Session management, TODO tracking, and workflow phases. Load for session start, task management, and phase transitions.
---

# Session

## Workflow Phases

| Phase | Actions |
|-------|---------|
| START | Load knowledge → Read skills → Create TODO → Announce |
| WORK | ◆ → Load skill → Edit → Verify → ✓ |
| END | Close ⊘ → Create log → Run scripts → Ask to push |

## TODO Format

```
○ [agent:phase:skill] Task description [context]
```

| Symbol | Meaning |
|--------|---------|
| ○ | Pending |
| ◆ | In progress (only ONE active) |
| ✓ | Completed |
| ⊘ | Paused/blocked |

### Examples

```
○ [code:WORK:backend-api] Implement auth endpoint
◆ [debugger:WORK:debugging] Fix null pointer error
✓ [documentation:WORK:documentation] Update README
⊘ [code:WORK:frontend-react] Waiting for API [deps→task1]
```

## Session Announcement

At START, announce:
```
AKIS v7.4 [complexity]. Skills: [list]. Graph: [X cache hits]. [N] tasks. Ready.
```

## END Phase Triggers

- Session duration >15 minutes
- Keywords: "done", "complete", "finished", "ready to commit"

## END Phase Steps

1. Close all ⊘ orphans
2. Verify all edits (syntax check)
3. Create workflow log: `log/workflow/YYYY-MM-DD_HHMMSS_task.md`
4. Run update scripts:
   ```bash
   python .github/scripts/knowledge.py --update
   python .github/scripts/skills.py --update
   python .github/scripts/agents.py --update
   ```
5. ASK before git push

## Workflow Log Format

```yaml
---
session:
  id: "YYYY-MM-DD_task"
  complexity: medium  # simple|medium|complex

skills:
  loaded: [skill1, skill2]

files:
  modified:
    - {path: "file.tsx", domain: frontend}

agents:
  delegated:
    - {name: code, task: "Task", result: success}

root_causes:  # REQUIRED for debugging
  - problem: "Error description"
    solution: "Fix applied"
---

# Session: Task Name

## Summary
Brief description.

## Tasks
- ✓ Task 1
- ✓ Task 2
```

## Delegation Rules

| File Count | Action |
|------------|--------|
| <3 files | Optional delegation |
| 3+ files | MANDATORY delegation |
| 6+ tasks | MANDATORY parallel pairs |

## Parallel Pairs

| Pair | Pattern |
|------|---------|
| code + docs | Parallel |
| code + tests | Parallel |
| debugger + docs | Parallel |
| research + code | Sequential |
| frontend + backend | Sequential (API contract) |
