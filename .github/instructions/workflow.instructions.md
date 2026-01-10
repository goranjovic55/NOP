---
applyTo: "**"
---

# Workflow Discipline v7.0 (100k Simulation Optimized)

## Session Phases

| Phase | Actions | Enforcement |
|-------|---------|-------------|
| START | Read knowledge → skills → docs INDEX → create TODO | ⛔ G3 |
| WORK | Mark ◆ → load skill → edit → verify → mark ✓ | ⛔ G1,G2,G5,G6 |
| END | Close ⊘ → run scripts → create log → commit | ⛔ G4 |

## Status Symbols

| Symbol | Meaning | Rule |
|--------|---------|------|
| ○ | Not started | Default |
| ◆ | In progress | ⛔ Only ONE (G6) |
| ✓ | Completed | Mark immediately |
| ⊘ | Paused | Close before END |
| ⧖ | Delegated | Sub-agent working |

## TODO Rules (⛔ G1 - 10.1% deviation rate)

1. Create before multi-step work (3+ files)
2. Mark ◆ BEFORE edit, ✓ AFTER verify
3. ⛔ Only ONE ◆ active (G6)
4. Close all ⊘ before END

## Verification (⛔ G5 - 17.9% deviation rate)

After EVERY edit:
1. Syntax check (no errors)
2. Import validation (resolves)
3. Test run (if applicable)
4. THEN mark ✓

## END Scripts (⛔ G4 - 22.1% deviation rate)

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

## ⚠️ Gotchas (From 100k Simulation)

| Issue | Deviation Rate | Impact |
|-------|----------------|--------|
| Skip skill loading | 31.1% | -15% quality |
| Skip workflow log | 22.1% | Lost traceability |
| Skip verification | 17.9% | Syntax errors |
| Incomplete TODO | 10.1% | Lost progress |
| Skip knowledge | 8.1% | Redundant lookups |
