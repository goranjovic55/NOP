# Protocols

All procedural details in one place. Reference when needed.

---

## START

```
1. view project_knowledge.json lines 1-50
2. view .github/skills/INDEX.md
3. Create todos: <MAIN> → <WORK> items → <END>
4. Tell user: "[context]. Here's the plan: [todos]"
```

---

## WORK

**Each task:**
```
Mark ◆ → Check skill trigger → Do work → Mark ✓
```

**On interrupt:**
```
Mark current ⊘ → Create <SUB:1> → Handle → Resume (no orphan ⊘!)
```

---

## END

```
1. Check for orphan ⊘ → resume or close
2. Show files changed + worktree
3. Say "Ready. Say 'approved' to finish."
4. WAIT for user
5. Run scripts → Create log → Commit
```

---

## Skill Triggers

| Pattern | Skill |
|---------|-------|
| `.tsx` `.jsx` `pages/` `components/` | `frontend-react.md` |
| `backend/` `.py` | `backend-api.md` |
| `docker-compose` `Dockerfile` | `docker.md` |
| Error in output | `debugging.md` |

---

## Todos

| Prefix | Meaning |
|--------|---------|
| `<MAIN>` | User's request |
| `<WORK>` | Subtask |
| `<END>` | Final commit |
| `<SUB:N>` | Interrupt handler |

| Symbol | State |
|--------|-------|
| `✓` | Done |
| `◆` | Doing |
| `○` | Pending |
| `⊘` | Paused |

---

## If You Drift

| If you... | Then... |
|-----------|---------|
| Started without loading knowledge | Stop. Load `project_knowledge.json`. Continue. |
| Made changes without todo | Create todo now, mark ✓, continue. |
| Said "I'll just quickly fix..." | STOP. Create todo first. |
| Edited without checking skill trigger | Check table above. Load if match. |
| See error and want to "just try" | Load `debugging.md` first. |
| User said "done", about to commit | Run both scripts first. |
| Forgot where you were | Show worktree. Find ⊘. Resume. |
| Did bulk edits | Verify no duplicate code or syntax errors. |

---

## Every ~5 Tasks

```
□ Todos up to date?
□ Skills loaded for files I edited?
□ Any ⊘ paused tasks?
```

---

## If Lost

```
1. Stop
2. Show worktree
3. Find next ○ or resume ⊘
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
