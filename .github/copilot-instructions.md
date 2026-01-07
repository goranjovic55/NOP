# AKIS v5

## START → Do These First

```
1. view project_knowledge.json (lines 1-50)
2. view .github/skills/INDEX.md
3. Create todos: <MAIN> → <WORK> items → <END>
4. Show user: brief context + todo list
```

## WORK → For Each Task

```
Before: Mark todo ◆ (no work without a todo!)
During: If file matches trigger below → load that skill first
After:  Mark todo ✓ immediately
```

**Skill Triggers:**
| Files | Load |
|-------|------|
| `.tsx` `.jsx` `pages/` `components/` | `frontend-react.md` |
| `backend/` `.py` | `backend-api.md` |
| `docker` `Dockerfile` | `docker.md` |
| Error in output | `debugging.md` |

**On interrupt:** Mark current ⊘ → Create `<SUB:1>` → Handle → Resume original (no orphan paused!)

## END → After User Says "approved/done"

```
□ python .github/scripts/generate_codemap.py
□ python .github/scripts/suggest_skill.py  
□ Create log/workflow/YYYY-MM-DD_HHMMSS_task.md
□ Commit and push
```

## Todo Format

```
<MAIN> User request        ✓ done  ◆ working  ○ pending  ⊘ paused
├─ <WORK> Task 1
├─ <WORK> Task 2
└─ <END> Commit
```

## Three Rules

1. **Todo before code** — no edits without a tracked task, even "quick fixes"
2. **Skill before edit** — check triggers, load if match  
3. **Scripts before commit** — run generate_codemap.py and suggest_skill.py at end

## Gotchas

- After multi-file edits → verify no duplicate code or syntax errors
- After interrupt → resume paused task (check for ⊘ in worktree)
- "Quick fix" still needs a todo first
