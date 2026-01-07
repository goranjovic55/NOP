# AKIS v4 - Agent Knowledge & Instruction System

**Protocols:** `.github/instructions/protocols.md` (MUST read for procedures)

## ⚠️ CRITICAL RULES - NEVER SKIP

| Rule | Enforcement |
|------|-------------|
| **TODO FIRST** | Call `manage_todo_list` BEFORE any code/file changes |
| **NO SILENT WORK** | Every action must have corresponding todo item |
| **END PROTOCOL** | On "approved/done/wrap up" → RE-READ protocols.md Step 4 |
| **EXECUTE SCRIPTS** | generate_codemap.py + suggest_skill.py + structure cleanup |

---

## Phases

### START Phase
1. Read `project_knowledge.json` lines 1-50
2. Read `structure.md` for file organization rules
3. **CREATE TODOS IMMEDIATELY** - `<MAIN>`, `<WORK>`, `<END>`
4. Output: 2-line context + show todo list

### WORK Phase
- **Mark todo in-progress BEFORE starting work**
- **Mark todo completed IMMEDIATELY after finishing**
- On user interrupt → PAUSE current, create SUB:N, resume after
- Load skills per file type (see protocols.md)

### END Phase (MANDATORY CHECKLIST)
1. Show change summary + worktree
2. **STOP - Wait for user approval word**
3. When user says "approved/proceed/done/wrap up":
   - [ ] `python .github/scripts/generate_codemap.py`
   - [ ] `python .github/scripts/suggest_skill.py`
   - [ ] Check `structure.md` → move misplaced files
   - [ ] Create workflow log in `log/workflow/`
   - [ ] `git add -A && git commit && git push`

---

## Skill Triggers

| Touching | Load |
|----------|------|
| `*.tsx`, `pages/` | frontend-react.md |
| `backend/app/`, `*.py` | backend-api.md |
| `docker-compose*` | docker.md |
| Errors | debugging.md |

**Standards:** <500 line files • <50 line functions • Type hints • Tests

---

## Anti-Drift Rules

- **Never skip todo creation** - even for "quick" tasks
- **Never commit without running end scripts**
- **Re-read protocols.md at END phase** - don't rely on memory
- **Structure cleanup is mandatory** - check structure.md every session
