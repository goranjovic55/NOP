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
Line 2:     DOMAIN_INDEX (81 backend, 74 frontend file paths)
Line 4:     GOTCHAS (43 known issues + solutions)
Lines 7-12: Layer entities
Lines 13-93: Layer relations
```

**Context Budget:** 3,000 tokens max per skill

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

## ⛔ Delegation (MANDATORY for 6+ tasks)
| Complexity | Strategy | Enforcement |
|------------|----------|-------------|
| Simple (<3) | Direct | Optional |
| Medium (3-5) | Consider | Suggest |
| Complex (6+) | **MUST Delegate** | **runSubagent REQUIRED** |

### runSubagent Usage
```python
# MANDATORY for complex sessions (6+ tasks)
runSubagent(
  agentName="code",
  prompt="Implement [task]. Files: [list]. Return: completion status.",
  description="Implement feature X"
)
```

### 100k Projection Impact
| Metric | Without | With | Savings |
|--------|---------|------|---------|
| API Calls | 37 | 16 | **-48%** |
| Tokens | 21k | 9k | **-55%** |
| Time | 53 min | 8 min | **-56%** |
| Success | 87% | 94% | **+7%** |

## Parallel (G7) - 60% Target
**MUST achieve 60%+ parallel execution for complex sessions**

| Pair | Pattern | Use Case |
|------|---------|----------|
| code + docs | Parallel runSubagent | Fullstack |
| code + reviewer | Sequential | Refactor |
| research + code | Research first | New feature |
| architect + research | Parallel | Design |
| debugger + docs | Parallel | Bug fix |

## AKIS Files

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | Protocol v7.4 |
| `.github/skills/INDEX.md` | Skill catalog |
| `.github/instructions/` | Guidance |
| `.github/agents/` | Agent configs |
| `project_knowledge.json` | Knowledge graph (v4.2) |
