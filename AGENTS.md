# AGENTS.md - NOP Project (AKIS v7.3)

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
| 0 | No knowledge query | Query project_knowledge.json FIRST |
| 1 | No ◆ | Create TODO |
| 2 | No skill | Load skill |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## ⚡ G0: Knowledge Graph Query
**Read first 100 lines of project_knowledge.json:**
```
Lines 1-6:   Headers (hot_cache, domain_index, gotchas)
Lines 7-12:  Layer entities (KNOWLEDGE_GRAPH, HOT_CACHE, DOMAIN_INDEX...)
Lines 13-93: Layer relations (caches → entity, indexes → file, has_gotcha → bug)
```

**Query order:** HOT_CACHE → GOTCHAS → DOMAIN_INDEX → File (only if miss)

**Stats:** -76.8% file reads | 71.3% cache hits | 570+ relations

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
| `.github/copilot-instructions.md` | Protocol v7.3 |
| `.github/skills/INDEX.md` | Skill catalog |
| `.github/instructions/` | Guidance |
| `.github/agents/` | Agent configs |
| `project_knowledge.json` | Knowledge graph (v4.0) |
