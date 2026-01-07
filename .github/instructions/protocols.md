# Protocols

Detailed steps for each phase. Reference when needed.

---

## START

```
1. view project_knowledge.json lines 1-50
2. view .github/skills/INDEX.md
3. Create todos:
   <MAIN> what user asked
   <WORK> step 1
   <WORK> step 2
   ...
   <END> commit
4. Tell user: "[context]. Here's the plan: [todos]"
```

---

## WORK

**Each task:**
```
Mark ◆ → Check skill trigger → Do work → Mark ✓
```

**If interrupted by user:**
```
Mark current ⊘ <PAUSED>
Create <SUB:1> for new thing
Do new thing, mark ✓
Resume: change <PAUSED> back to <WORK> (no orphan ⊘ at end!)
```

**After bulk edits:**
```
Verify no duplicate code or syntax errors
```

---

## END

**When all <WORK> done:**

1. Check for orphan ⊘ paused tasks → resume or close them first
2. Show what changed (files created/modified)
3. Show worktree with status symbols
4. Say "Ready. Say 'approved' to finish."
5. **Wait for user**

**After user approves:**
```bash
python .github/scripts/generate_codemap.py
python .github/scripts/suggest_skill.py
# Create workflow log
# Commit and push
```

---

## Skill Triggers

| Pattern | Skill |
|---------|-------|
| `.tsx` `.jsx` `pages/` `components/` | `.github/skills/frontend-react.md` |
| `backend/` `.py` endpoints | `.github/skills/backend-api.md` |
| `docker-compose` `Dockerfile` | `.github/skills/docker.md` |
| Any error output | `.github/skills/debugging.md` |

**Rule:** Load skill → then edit file

---

## Todos

**Prefixes:**
- `<MAIN>` = user's request
- `<WORK>` = subtask
- `<END>` = final commit
- `<PAUSED>` = interrupted
- `<SUB:N>` = handling interrupt

**Symbols:**
- `✓` done
- `◆` doing
- `○` pending
- `⊘` paused

**Example:**
```
<MAIN> ✓ Add user auth
├─ <WORK> ✓ Create model
├─ <WORK> ◆ Add endpoint
└─ <END> ○ Commit
```

---

## Standards

- Files < 500 lines
- Functions < 50 lines
- Type hints required
- Tests for new features

---

## Workflow Log

**Path:** `log/workflow/YYYY-MM-DD_HHMMSS_task.md`

**Content:**
```markdown
# Task Name

**Date:** YYYY-MM-DD
**Files:** N changed

## Worktree
[paste worktree]

## Summary
[what was done]

## Changes
- Created: path/file
- Modified: path/file
```
