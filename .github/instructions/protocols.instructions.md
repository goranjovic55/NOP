# Protocols v6.0 (Prompt-Optimized)

## START
1. Context pre-loaded ✓ (skip explicit reads)
2. Create todos: <MAIN> → <WORK>... → <END>
3. Tell user session type + plan

## WORK
⚠️ **◆ mark BEFORE any edit** (non-negotiable)

1. Mark ◆ → 2. Check trigger → 3. [Load skill if new domain] → 4. Edit → 5. Mark ✓

**Skill Cache:** Track loaded skills. Don't reload same session!

Interrupt: ⊘ current → <SUB:N> → handle → resume

## END
1. Check ⊘ orphans
2. If code: generate_codemap.py && suggest_skill.py
   If docs only: suggest_skill.py
3. session_cleanup.py && update_docs.py
4. Create workflow log
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

## If You Drift
| If you... | Then... |
|-----------|---------|
| About to edit without ◆ | STOP. Mark ◆ first. |
| "I'll just quickly fix..." | STOP. Create todo first. |
| User said "done" | STOP. Run scripts first. |
| Loading same skill twice | STOP. Check cache. |
| Forgot where you were | Show worktree. Find ⊘. Resume. |

## Every ~5 Tasks

```
□ All active work has ◆ status?
□ Skills cached (not reloading)?
□ Any ⊘ orphan tasks to resume?
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
