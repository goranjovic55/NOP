# AGENTS.md - NOP Project

## Environment

| Mode | Compose File | Notes |
|------|--------------|-------|
| Dev | `docker/docker-compose.dev.yml` | Local build, hot reload |
| Prod | `docker-compose.yml` | Pulls from ghcr.io |

## Commands

| Task | Command |
|------|---------|
| Dev start | `docker-compose -f docker/docker-compose.dev.yml up -d` |
| Dev logs | `docker-compose -f docker/docker-compose.dev.yml logs -f` |
| Prod start | `docker-compose up -d` |
| Backend test | `cd backend && python -m pytest` |
| Frontend test | `cd frontend && npm test` |

## PR Rules

1. Run tests before commit
2. Create `log/workflow/` log
3. Format: `[component] Description`

## AKIS

- `.github/copilot-instructions.md` - Protocol
- `.github/skills/INDEX.md` - Skills
- `.github/instructions/` - Guidance

## Agents (7 Total)

| Agent | Role | Triggers |
|-------|------|----------|
| AKIS | Orchestrator | Protocol enforcement |
| architect | Planner | design, blueprint, plan |
| research | Investigator | research, compare, evaluate |
| code | Creator | implement, create, write |
| debugger | Detective | error, bug, traceback |
| reviewer | Auditor | review, audit, check |
| documentation | Writer | doc, readme, explain |
| devops | Infrastructure | deploy, docker, ci |

## ⚠️ Rules

- Load skills before editing
- Create workflow log at END
- Use TODO for multi-step tasks
- Delegate complex tasks (6+ files)
