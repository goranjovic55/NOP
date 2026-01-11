---
applyTo: "**"
---

# Workflow Discipline v9.0 (Skills-Based)

## Session Phases

| Phase | Actions | Enforcement |
|-------|---------|-------------|
| START | Read knowledge → skills → docs INDEX → create TODO | ⛔ G3 |
| WORK | Mark ◆ → load skill → edit → verify → mark ✓ | ⛔ G1,G2,G5,G6 |
| END | Close ⊘ → run scripts → create log → commit | ⛔ G4 |

## Workflow Phases (Skill-Based)

| Phase | Skills | Use For |
|-------|--------|---------|
| **PLAN** | planning | Feature design, research |
| **BUILD** | backend-api, frontend-react, docker, ci-cd | Implementation |
| **VERIFY** | testing, debugging | Quality assurance |
| **DOCUMENT** | documentation | Docs, README |

## Status Symbols

| Symbol | Meaning | Rule |
|--------|---------|------|
| ○ | Not started | Default |
| ◆ | In progress | ⛔ Only ONE (G6) |
| ✓ | Completed | Mark immediately |
| ⊘ | Paused | Close before END |

## TODO Rules (⛔ G1)

1. Create before multi-step work (3+ files)
2. Mark ◆ BEFORE edit, ✓ AFTER verify
3. ⛔ Only ONE ◆ active (G6)
4. Close all ⊘ before END

## Verification (⛔ G5)

After EVERY edit:
1. Syntax check (no errors)
2. Import validation (resolves)
3. Test run (if applicable)
4. THEN mark ✓

## END Scripts (⛔ G4)

```bash
python .github/scripts/knowledge.py
python .github/scripts/skills.py
python .github/scripts/instructions.py
python .github/scripts/docs.py
```

| Response | Action |
|----------|--------|
| y | Run `--update` → verify |
| n | Skip |

## Workflow Log

Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md` at session end.

## ⚠️ Gotchas (From 100k Simulation)

| Issue | Deviation Rate | Impact |
|-------|----------------|--------|
| Skip skill loading | 8.4% | -15% quality |
| Skip workflow log | 6.8% | Lost traceability |
| Skip verification | 5.0% | Syntax errors |
| Incomplete TODO | 4.4% | Lost progress |
| Skip knowledge | 3.6% | Redundant lookups |
