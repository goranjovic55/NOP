---
applyTo: "**"
---

# Workflow Discipline

## Session Phases

| Phase | Actions |
|-------|---------|
| START | Read knowledge → skills → docs INDEX → create TODO |
| WORK | Mark ◆ → edit → verify → mark ✓ |
| END | Close ⊘ → run scripts → create log → commit |

## Status Symbols

| Symbol | Meaning | Rule |
|--------|---------|------|
| ○ | Not started | Default |
| ◆ | In progress | Only ONE |
| ✓ | Completed | Mark immediately |
| ⊘ | Paused | Close before END |
| ⧖ | Delegated | Sub-agent working |

## TODO Rules

1. Create before multi-step work (3+ files)
2. Mark ◆ BEFORE edit, ✓ AFTER
3. Only ONE ◆ active
4. Close all ⊘ before END

## END Scripts (⛔ MANDATORY)

```bash
python .github/scripts/knowledge.py
python .github/scripts/skills.py
python .github/scripts/instructions.py
python .github/scripts/docs.py
python .github/scripts/agents.py
```

| Response | Action |
|----------|--------|
| y | Run `--update` → verify |
| n | Skip |
| select | Agent implements manually |

## Workflow Log

Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md` at session end.

## ⚠️ Gotchas

- Orphan ⊘ = session failure
- Multiple ◆ = broken discipline
- No log = lost history
