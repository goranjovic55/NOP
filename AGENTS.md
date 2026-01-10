# AGENTS.md - NOP Project

## Dev Environment

| Command | Purpose |
|---------|---------|
| `docker-compose up -d` | Start all services |
| `docker-compose down` | Stop services |
| `docker-compose logs -f backend` | View backend logs |

## Testing

| Command | Purpose |
|---------|---------|
| `cd backend && python -m pytest` | Run backend tests |
| `cd frontend && npm test` | Run frontend tests |

## PR Instructions

1. Run tests before committing
2. Create workflow log in `log/workflow/`
3. Title format: `[component] Description`

## AKIS Framework

This project uses AKIS (Autonomous Knowledge Integration System). See:
- `.github/copilot-instructions.md` - Main protocol
- `.github/skills/INDEX.md` - Domain skills
- `.github/instructions/` - path-specific guidance

## ⚠️ Critical Rules

- **Always** load skills before editing domain files
- **Never** skip workflow log at session end
- **Always** use TODO tracking for multi-step tasks
