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

## ⛔ Gates (8) - With Violation Costs

| G | Check | Fix | Violation Cost |
|---|-------|-----|----------------|
| 0 | Knowledge not in memory | Read first 100 lines ONCE at START | +13k tokens |
| 1 | No ◆ | Create TODO | Lost tracking |
| 2 | ⚠️ No skill | Load skill BEFORE edits | +5.2k tokens (30.8% violation) |
| 3 | No START | Do START | Lost context |
| 4 | ⚠️ No END | Do END (>15 min sessions) | Lost traceability (21.8% violation) |
| 5 | ⚠️ No verify | Check syntax AFTER EVERY edit | +8.5 min rework (18.0% violation) |
| 6 | Multi ◆ | One only | Confusion |
| 7 | ⚠️ No parallel | Use pairs for 6+ (60% target) | +14 min/session (10.4% violation) |

**Top 3 violations (G2, G4, G5) = 70% of inefficiencies**

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

## ⛔ Delegation (Simplified Binary Decision)

**100k Simulation Results:**
| File Count | Strategy | Efficiency | Success | Quality |
|------------|----------|-----------|---------|---------|
| <3 files | Direct (AKIS) | 0.594 | 72.4% | 72.4% |
| 3+ files | **runSubagent** | 0.789 | 93.9% | 93.9% |
| **Improvement** | **Delegate 3+** | **+32.8%** | **+21.5%** | **+21.5%** |

**Simple Rule:** 3+ files = MANDATORY delegation

### Agent Selection (by Performance)

| Agent | Success Rate | Quality vs AKIS | Time Saved | Best For |
|-------|--------------|-----------------|------------|----------|
| architect | 97.7% | +25.3% | +10.8 min | design, blueprint, plan |
| debugger | 97.3% | +24.8% | +14.9 min | error, bug, traceback |
| code | 93.6% | - | +10.9 min | implement, write, create |
| documentation | 89.2% | +16.2% | +8.5 min | docs, readme, explain |
| research | 76.6% | +3.6% | +3.4 min | research, compare, standards |

### runSubagent Template
```python
# 3+ files detected → MANDATORY delegation
runSubagent(
  agentName="code",  # or architect, debugger, documentation, research
  prompt="Implement [specific task]. Files: [list]. Return: completion status + files modified.",
  description="Brief task description"
)
```

### 100k Simulation Impact
| Metric | Without | With | Savings |
|--------|---------|------|---------|
| API Calls | 37 | 16 | **-48%** |
| Tokens | 21k | 9k | **-55%** |
| Time | 53 min | 8 min | **-56%** |
| Success | 87% | 94% | **+7%** |

## Context Isolation (Clean Handoffs)
**100k Simulation**: Context isolation reduces tokens by 48.5%, cognitive load by 32%

| Metric | Baseline | Optimized | Improvement |
|--------|----------|-----------|-------------|
| Token Usage | 20,179 | 10,382 | **-48.5%** |
| Cognitive Load | 85.5% | 58.3% | **-31.9%** |
| Context Pollution | 65.7% | 19.6% | **-70.1%** |

### Handoff Protocol
```yaml
artifact:
  type: "design_spec" | "research_findings" | "code_changes"
  summary: "Brief distillation"
  key_decisions: ["decision1"]
  files: ["file1.py"]
  # NO conversation history
```

## Parallel (G7) - 60% Target
**Current:** 19.1% parallel rate | **Target:** 60%+ | **Gap:** -40.9%

**Time Lost:** 294,722 minutes (4,912 hours) across 100k sessions

| Pair | Pattern | Time Saved | Use Case |
|------|---------|------------|----------|
| code + docs | ✅ Parallel runSubagent | 8.5 min | Independent tasks |
| code + tests | ✅ Parallel runSubagent | 12.3 min | TDD approach |
| debugger + docs | ✅ Parallel | 6.2 min | Bug fix + documentation |
| architect + research | ✅ Parallel | 10.1 min | Design phase |
| code + reviewer | ❌ Sequential | - | Review needs code first |
| research + code | ❌ Sequential | - | Findings inform implementation |
| frontend + backend | ❌ Sequential | - | API contract dependency |

**Decision Rule:** Independent tasks + different files = Parallel

## AKIS Files

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | Protocol v7.4 |
| `.github/skills/INDEX.md` | Skill catalog |
| `.github/instructions/` | Guidance |
| `.github/agents/` | Agent configs |
| `project_knowledge.json` | Knowledge graph (v4.2) |
