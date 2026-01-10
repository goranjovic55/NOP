# AGENTS.md - NOP Project (AKIS v7.0)

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

## ⛔ Hard Gates (v7.0)

| Gate | Violation | Action |
|------|-----------|--------|
| G1 | No ◆ task | Create TODO first |
| G2 | No skill | Load before edit |
| G3 | START skip | Do START steps |
| G4 | END skip | Run END scripts |
| G5 | No verify | Check syntax/tests |
| G6 | Multiple ◆ | Only ONE active |
| G7 | Skip parallel | Use when compatible |

## Sub-Agents

| Agent | Role | Trigger |
|-------|------|---------|
| architect | planner | design, blueprint |
| code | creator | implement, write |
| debugger | detective | error, traceback |
| reviewer | auditor | review, audit |
| documentation | writer | docs, readme |
| devops | infra | deploy, docker |
| research | investigator | research, compare |

**Delegation:** <3 files optional | 3-5 smart | 6+ ⛔ MUST delegate

## PR Rules

1. Run tests before commit
2. Create `log/workflow/` log
3. Format: `[component] Description`

## AKIS Files

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | Protocol v7.0 |
| `.github/skills/INDEX.md` | Skill catalog |
| `.github/instructions/` | Guidance |
| `.github/agents/` | Agent configs |

## ⚠️ Critical Rules

- ◆ before edit, ✓ after verify
- Load skill for domain
- Create workflow log at END
- Parallel: code+docs, code+reviewer
