# AGENTS.md - NOP Project (AKIS v7.4)

## Environment

| Mode | Compose File |
|------|--------------|
| Dev | `docker/docker-compose.dev.yml` |
| Prod | `docker-compose.yml` |

## Commands

| Task | Command |
|------|---------|
| Dev start | `docker-compose -f docker/docker-compose.dev.yml up -d` |
| Dev logs | `docker-compose -f docker/docker-compose.dev.yml logs -f` |
| Backend test | `cd backend && python -m pytest` |
| Frontend test | `cd frontend && npm test` |

## ⛔ Gates (8)

| G | Check | Fix |
|---|-------|-----|
| 0 | Knowledge not in memory | Read first 100 lines ONCE at START |
| 1 | No ◆ | Create TODO |
| 2 | No skill | Load skill |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## ⚡ G0: Knowledge in Memory
**Read first 100 lines of project_knowledge.json ONCE at START:**
```
Line 1:     HOT_CACHE (top 20 entities + paths)
Line 2:     DOMAIN_INDEX (81 backend, 71 frontend file paths)
Line 4:     GOTCHAS (38 known issues + solutions)
Lines 7-12: Layer entities
Lines 13-93: Layer relations
```

**Anti-Pattern:**
```
❌ Run --query 5 times to gather info
❌ grep knowledge.json multiple times
✓ Read first 100 lines ONCE, use that context
```

## Agents

| Agent | Role | Triggers |
|-------|------|----------|
| architect | planner | design, blueprint |
| code | creator | implement, write |
| debugger | detective | error, traceback |
| reviewer | auditor | review, audit |
| documentation | writer | docs, readme |
| devops | infra | deploy, docker |
| research | investigator | research, compare |

## Delegation
| Complexity | Strategy |
|------------|----------|
| Simple (<3) | Direct or delegate |
| Medium (3-5) | Smart delegate |
| Complex (6+) | Delegate |

## Parallel (G7)
code+docs | code+reviewer | research+code | architect+research

## AKIS Files

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | Protocol v7.4 |
| `.github/skills/INDEX.md` | Skill catalog |
| `.github/instructions/` | Guidance |
| `.github/agents/` | Agent configs |
| `project_knowledge.json` | Knowledge graph (v4.2) |
