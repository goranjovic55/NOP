# CLAUDE.md - Project Instructions for Claude

This file provides Claude with project context and coding conventions.

## Project Overview

**NOP** - Network Operations Platform. Cybersecurity tool for network reconnaissance, vulnerability scanning, and remote access management.

**Stack:** FastAPI (Python) backend, React/TypeScript frontend, PostgreSQL, Redis, Docker

## AKIS Framework

This project uses AKIS (Agent Knowledge & Instruction System) for AI-assisted development.

### Session Workflow: START → WORK → END

**START:**
1. Read `project_knowledge.json` lines 1-50 (knowledge map)
2. Read `.github/skills/INDEX.md` for domain skills
3. Create todos with `manage_todo_list`

**WORK:**
- Execute todos, mark completed individually
- Load skills when touching relevant files (see triggers below)
- On user interrupt: PAUSE current → handle → resume

**END:**
1. Show change summary + worktree
2. Wait for user approval ("approved", "proceed", "done")
3. After approval: run scripts, create workflow log, commit

### Skill Triggers

| Files | Load Skill |
|-------|------------|
| `*.tsx`, `pages/`, `components/` | `.github/skills/frontend-react.md` |
| `backend/app/`, `*.py` | `.github/skills/backend-api.md` |
| `docker-compose*`, `Dockerfile` | `.github/skills/docker.md` |
| Errors in output | `.github/skills/debugging.md` |

### Key Commands

```bash
python .github/scripts/generate_codemap.py  # Update knowledge
python .github/scripts/suggest_skill.py      # Get skill suggestions
```

## Code Standards

- **Files:** < 500 lines
- **Functions:** < 50 lines
- **Python:** Type hints required
- **TypeScript:** Strict mode
- **Tests:** Required for new features

## File Organization

| Type | Location |
|------|----------|
| Backend API | `backend/app/` |
| Frontend pages | `frontend/src/pages/` |
| Components | `frontend/src/components/` |
| Docker configs | `docker/` |
| Documentation | `docs/` |
| Scripts | `scripts/` |
| Workflow logs | `log/workflow/` |

## Conventions

### Git Commits
```
type(scope): message

Types: feat, fix, refactor, docs, chore, test
Scope: backend, frontend, docker, akis
```

### Todo Prefixes
- `<MAIN>` - Original user request
- `<WORK>` - Implementation subtasks
- `<END>` - Review and commit
- `<PAUSED>` - Interrupted task
- `<SUB:N>` - User interrupt handler

### Worktree Format
```
<MAIN> ✓ Task description
├─ <WORK> ✓ Subtask 1
├─ <WORK> ✓ Subtask 2
└─ <END> ✓ Review and commit
```

Status: ✓ completed, ◆ in-progress, ○ not-started, ⊘ paused

## Project-Specific Notes

- **POV Mode:** Agent perspective testing via `frontend/src/context/POVContext.tsx`
- **Cyberpunk UI:** Dark theme with neon accents, use CyberUI components
- **WebSocket:** Real-time updates for traffic, agents, scans
- **Agent System:** C2-style agent management in `backend/app/services/agent_service.py`

## Quick Reference

**Detailed protocols:** `.github/instructions/protocols.md`
**Skills index:** `.github/skills/INDEX.md`
**File structure:** `.github/instructions/structure.md`
**Templates:** `.github/templates/`

---

*Context over Process. Knowledge over Ceremony.*
