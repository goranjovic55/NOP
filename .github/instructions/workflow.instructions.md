---
applyTo: "**"
---

# Workflow Discipline

Task and workflow tracking for consistent, visible progress.

## Session Phases

| Phase | Actions | Trigger |
|-------|---------|---------|
| START | Read knowledge, load skills, create TODO | Session begin |
| WORK | Mark ◆ → edit → verify → mark ✓ | Each task |
| END | Close orphans, run scripts, create log | Session complete |

## Workflow Tracking

### TODO Structure
```
<MAIN> Primary goal
├─ <WORK:1> First task ○
├─ <WORK:2> Second task ○
└─ <END> Wrap up ○
```

### Status Symbols
| Symbol | Meaning | Rule |
|--------|---------|------|
| ○ | Not started | Default state |
| ◆ | In progress | Only ONE active |
| ✓ | Completed | Mark immediately after |
| ⊘ | Paused | Must resume before END |
| ⧖ | Delegated | Waiting on sub-agent |

## Rules

1. **Create TODO** before multi-step work (3+ files, numbered tasks, complex features)
2. **Mark ◆** BEFORE starting any edit
3. **Mark ✓** IMMEDIATELY after completing
4. **Only ONE ◆** at a time (no parallel active tasks)
5. **Close all ⊘** before session end (no orphans)

## Workflow Log

At session end, create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`:

```markdown
# Task Name | YYYY-MM-DD | ~Nmin

## Summary
Brief description of what was accomplished.

## Worktree
| Task | Status |
|------|--------|
| Task 1 | ✓ |
| Task 2 | ✓ |

## Files Modified
- file1.ext (changes)
- file2.ext (changes)
```

## ⚠️ Critical Gotchas

- **Orphan ⊘ tasks** are session failures - always close before END
- **Multiple ◆** indicates broken discipline - stop and consolidate
- **No TODO** on complex tasks leads to lost context
- **Skipping workflow log** loses session history
