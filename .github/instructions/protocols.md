# Protocols

All procedural details in one place. Reference when needed.

---

## START (MANDATORY)

```
1. view project_knowledge.json lines 1-50
2. view .github/skills/INDEX.md
3. Create todos: <MAIN> → <WORK> items → <END>
4. Tell user: "[context]. Here's the plan: [todos]"
```

⚠️ **Never skip START.** No exceptions for "simple" tasks.

---

## WORK

**⚠️ Step 1 is NON-NEGOTIABLE:**
```
1. Mark ◆ FIRST — before typing ANY code
2. Check skill trigger → load if match
3. Do the work
4. Mark ✓ immediately after
```

⚠️ **No unmarked work.** Even one-line changes need the ◆ → ✓ cycle.

**On interrupt:**
```
Mark current ⊘ → Create <SUB:1> → Handle → Resume (no orphan ⊘!)
```

---

## END (CRITICAL)

```
1. ⚠️ Check for orphan ⊘ → resume or close ALL
2. Show files changed + worktree
3. Say "Ready. Say 'approved' to finish."
4. WAIT for user
5. ⚠️ STOP! Run BOTH scripts before commit:
   - python .github/scripts/generate_codemap.py
   - python .github/scripts/suggest_skill.py
6. Create workflow log
7. THEN commit and push
```

---

## Skill Triggers

| Pattern | Load First |
|---------|------------|
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
| `◆` | Doing (MUST mark before work) |
| `○` | Pending |
| `⊘` | Paused |

---

## If You Drift

| If you... | Then... |
|-----------|---------|
| Started without loading knowledge | STOP. Load `project_knowledge.json`. |
| About to edit without ◆ status | STOP. Mark ◆ first. |
| Thinking "I'll just quickly fix..." | STOP. Create todo first. Always. |
| Edited without checking skill trigger | Check table. Load if match. |
| See error and want to "just try" | Load `debugging.md` first. |
| User said "done", about to commit | STOP. Run BOTH scripts first. |
| Forgot where you were | Show worktree. Find ⊘. Resume. |
| Did bulk edits | Verify no duplicate code. |

---

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
