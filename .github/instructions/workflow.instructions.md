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

## END Phase Scripts (⛔ MANDATORY)

Run scripts with `--update` flag to auto-apply changes. Agent confirms result.

| Script | Default (analyze) | With --update | Agent Action |
|--------|-------------------|---------------|--------------|
| `knowledge.py` | Show suggestions | Auto-append | Confirm changes |
| `skills.py` | Show gaps | Auto-create | Confirm files created |
| `instructions.py` | Show gaps | Auto-create | Confirm files created |
| `docs.py` | Show updates | Auto-update | Confirm docs updated |
| `agents.py` | Show updates | Auto-update | Confirm agents updated |

**Flow:**
1. Run: `python .github/scripts/{script}.py --update`
2. Confirm: Check output for success/errors
3. Verify: Ensure nothing was destroyed
4. Report: Show summary to user

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
- **Skipping END scripts** misses AKIS framework improvements
