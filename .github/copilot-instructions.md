# AKIS v4 - Agent Knowledge & Instruction System

**Protocols:** `.github/instructions/protocols.md` (read for detailed procedures)

## Quick Rules

| Rule | Enforce |
|------|---------|
| Phases | START → WORK → END |
| Knowledge | Read `project_knowledge.json` lines 1-50 first |
| Todo | **NO WORK WITHOUT TODO** - use `manage_todo_list` |
| Interrupt | User message = PAUSE current → SUB:N → resume |
| Approval | Wait for "approved/proceed/done" before session end |
| Skills | Load from `.github/skills/` when touching relevant files |

---

## START Phase
1. Read knowledge + skills + structure
2. Create todos: `<MAIN>`, `<WORK>`, `<END>`
3. Output: Context summary + todo list

## WORK Phase
- Execute todos, mark completed individually
- On interrupt → PAUSE, handle SUB, resume
- Load skills per file type (see protocols.md)

## END Phase
1. Show change summary + worktree
2. **STOP - Wait for approval**
3. After approval: Follow `Protocol: Session End` in protocols.md (Step 4)

---

## Skill Triggers

| Touching | Load |
|----------|------|
| `*.tsx`, `pages/` | frontend-react.md |
| `backend/app/`, `*.py` | backend-api.md |
| `docker-compose*` | docker.md |
| Errors | debugging.md |

**Standards:** <500 line files • <50 line functions • Type hints • Tests

*Context over Process. Knowledge over Ceremony.*
