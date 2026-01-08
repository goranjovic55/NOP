# Protocols (Condensed)

## START
1. view project_knowledge.json + skills/INDEX.md
2. Create todos: <MAIN> → <WORK>... → <END>
3. Tell user context + plan

## WORK
⚠️ **◆ mark BEFORE any edit** (non-negotiable)

1. Mark ◆ → 2. Check skill trigger → 3. Edit → 4. Mark ✓

Interrupt: ⊘ current → <SUB:N> → handle → resume

## END
1. Check ⊘ orphans
2. Run: generate_codemap.py && suggest_skill.py
3. Run: session_cleanup.py && update_docs.py
4. Create workflow log
5. Wait for approval
6. Commit

## Skill Triggers
| Pattern | Skill |
|---------|-------|
| .tsx .jsx | frontend-react |
| .py backend/ | backend-api |
| Dockerfile docker-compose | docker |
| .md docs/ README | documentation |
| error traceback | debugging |
| test_* *_test.py | testing |
| .github/skills/* copilot-instructions* | akis-development |

## Todo Symbols
| Symbol | State |
|--------|-------|
| ✓ | Done |
| ◆ | Working (MUST mark before work) |
| ○ | Pending |
| ⊘ | Paused |

## If You Drift
| If you... | Then... |
|-----------|---------|
| Started without loading knowledge | STOP. Load `project_knowledge.json`. |
| About to edit without ◆ | STOP. Mark ◆ first. |
| Thinking "I'll just quickly fix..." | STOP. Create todo first. |
| User said "done" | STOP. Run scripts first. |
| Forgot where you were | Show worktree. Find ⊘. Resume. |

## Every ~5 Tasks

```
□ All active work has ◆ status?
□ Skills loaded for files I edited?
□ Any ⊘ orphan tasks to resume?
```

---

## If Lost

```
1. Stop
2. Show worktree
3. Find ◆ or ⊘ or next ○
4. Continue
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

## Worktree
[worktree]

## Summary
[what was done]

## Changes
- Created: path/file
- Modified: path/file
```
