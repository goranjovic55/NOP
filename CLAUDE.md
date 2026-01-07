# CLAUDE.md

NOP - Network Operations Platform. FastAPI + React + PostgreSQL + Docker.

## Session Flow

**START:**
```
1. view project_knowledge.json lines 1-50
2. view .github/skills/INDEX.md  
3. Create todos: <MAIN>, <WORK>..., <END>
4. Show plan to user
```

**WORK:**
```
Mark todo ◆ → Check skill trigger → Do work → Mark ✓
```

**END (after user says "approved"):**
```
python .github/scripts/generate_codemap.py
python .github/scripts/suggest_skill.py
Create workflow log → Commit
```

## Skill Triggers

| Files | Load |
|-------|------|
| `.tsx` `.jsx` `pages/` | `frontend-react.md` |
| `backend/` `.py` | `backend-api.md` |
| `docker` | `docker.md` |
| Errors | `debugging.md` |

## Three Rules

1. Todo before code
2. Skill before edit  
3. Scripts before commit

## Standards

- Files < 500 lines
- Functions < 50 lines
- Type hints required

## Locations

| What | Where |
|------|-------|
| Docs | `docs/` |
| Scripts | `scripts/` |
| Logs | `log/workflow/` |

## More Details

- `.github/instructions/protocols.md` — full procedures + recovery
- `.github/skills/INDEX.md` — all skills
