# Protocols v6.1 (Enhanced via 100k Session Simulation)

## START
1. Context pre-loaded ✓ (skip explicit reads)
2. Check skills/INDEX.md for available skills
3. Create todos: <MAIN> → <WORK>... → <END>
4. Tell user session type + plan

## WORK
⚠️ **◆ mark BEFORE any edit** (non-negotiable)
⚠️ **NO "quick fixes"** - every change needs a todo first!

1. Mark ◆ → 2. Check trigger → 3. [Load skill if new domain] → 4. Edit → 5. Verify syntax → 6. Mark ✓

**Skill Cache:** Track loaded skills. Don't reload same session!

**Quality Checks:**
- Verify no syntax errors after each edit
- Check for duplicate code in multi-file edits
- Analyze errors systematically (no random trial-and-error)

Interrupt: ⊘ current → <SUB:N> → handle → resume

## END
1. Check ⊘ orphans
2. If code: update_knowledge.py && suggest_skill.py && suggest_instructions.py
   If docs only: suggest_skill.py && suggest_instructions.py
3. session_cleanup.py && update_docs.py
4. ⚠️ **Create workflow log** (high deviation - don't skip!)
5. Wait approval → commit

## Skill Triggers (load ONCE per domain)
| Pattern | Skill |
|---------|-------|
| .tsx .jsx | frontend-react ⭐ |
| .py backend/ | backend-api ⭐ |
| Dockerfile docker-compose | docker |
| .md docs/ README | documentation ⚠️ |
| error traceback | debugging |
| test_* *_test.py | testing |
| .github/skills/* | akis-development ⚠️ |

**⭐ = Pre-load for fullstack | ⚠️ = Always load (low compliance)**

## Todo Symbols
| Symbol | State |
|--------|-------|
| ✓ | Done |
| ◆ | Working (MUST mark before) |
| ○ | Pending |
| ⊘ | Paused |

## If You Drift (Simulation-Validated Checks)
| If you... | Then... | Deviation Rate |
|-----------|---------|----------------|
| About to edit without ◆ | STOP. Mark ◆ first. | - |
| "I'll just quickly fix..." | STOP. Create todo first. | 10% |
| Saw error, about to try random fix | STOP. Analyze systematically. | - |
| User said "done" | STOP. Run scripts first. | - |
| Loading same skill twice | STOP. Check cache. | 15% |
| Forgot where you were | Show worktree. Find ⊘. Resume. | - |
| About to skip workflow log | STOP. Create it. | 18% |

## Every ~5 Tasks

```
□ All active work has ◆ status?
□ Skills cached (not reloading)?
□ Any ⊘ orphan tasks to resume?
□ Any syntax errors to fix?
```

---

## Standards

- Files < 500 lines
- Functions < 50 lines  
- Type hints required

---

## Workflow Log

**Path:** `log/workflow/YYYY-MM-DD_HHMMSS_task.md`

```markdown
# Task Name
**Date:** YYYY-MM-DD | **Files:** N

## Summary
[what was done]

## Changes
- Created/Modified: path/file
```

---

## Simulation Results (100k sessions)

This instruction file was enhanced based on simulation analysis:
- Baseline compliance: 89.7%
- Enhanced compliance: 91.0% (+1.3%)
- Deviation reduction: 12.4%

Top gaps addressed:
- workflow_log: 18% → 10.7% deviation
- skill_loading: 15% → 9.1% deviation
