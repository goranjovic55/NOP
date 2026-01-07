# AKIS v5

## ⚠️ BEFORE ANY WORK

```
1. view project_knowledge.json (lines 1-50)
2. view .github/skills/INDEX.md
3. Create todos: <MAIN> → <WORK> items → <END>
4. Show user: brief context + todo list
```

## WORK → For Each Task

```
BEFORE: Mark todo ◆ first! (NEVER edit without marking)
DURING: If file matches trigger → load skill first
AFTER:  Mark todo ✓ immediately
```

**Skill Triggers:**
| Files | Load First |
|-------|------------|
| `.tsx` `.jsx` `pages/` `components/` | `frontend-react.md` |
| `backend/` `.py` | `backend-api.md` |
| `docker` `Dockerfile` | `docker.md` |
| Error in output | `debugging.md` |

**On interrupt:** Mark current ⊘ → Create `<SUB:1>` → Handle → Resume original (no orphan paused!)

## END → After User Says "approved/done"

**⚠️ STOP! Before committing:**
```
□ Check for orphan ⊘ tasks → resume or close them
□ python .github/scripts/generate_codemap.py
□ python .github/scripts/suggest_skill.py  
□ Create log/workflow/YYYY-MM-DD_HHMMSS_task.md
□ THEN commit and push
```

## Todo Format

```
<MAIN> User request        ✓ done  ◆ working  ○ pending  ⊘ paused
├─ <WORK> Task 1
├─ <WORK> Task 2
└─ <END> Commit
```

## ⚠️ Three Absolute Rules

1. **Mark ◆ before ANY edit** — no unmarked work, even one line
2. **No "quick fixes"** — every change needs a todo first
3. **Scripts before commit** — ALWAYS run both .py scripts at end

## Gotchas

- "Quick fix" = still needs a todo first (Rule 2)
- About to commit? STOP. Run scripts first (Rule 3)
- After interrupt → check for ⊘ and resume it
