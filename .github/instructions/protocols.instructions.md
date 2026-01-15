---
applyTo: '**'
description: 'AKIS protocol gates and enforcement rules. 8 gates for quality control.'
---

# Protocols (Memory-First)

> Based on 100k simulation: G0 reduces file reads by 85%, tokens by 67.2%

## When This Applies
- Every coding session (behavioral guidance)
- Skill selection decisions
- Task delegation choices

## Gates (8)
| G | Check | Fix |
|---|-------|-----|
| 0 | Knowledge not in memory | Read first 100 lines ONCE at START |
| 1 | No ◆ | Create TODO |
| 2 | No skill for edit/command | Load skill FIRST |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## ⛔ G0: Knowledge in Memory (CRITICAL)
**Read first 100 lines of project_knowledge.json ONCE at START. Keep in memory.**

```bash
head -100 project_knowledge.json  # Do this ONCE, keep in context
```

**After loading, you have IN MEMORY:**
| Line | Contains | Use For |
|------|----------|---------|
| 1 | HOT_CACHE | Top 20 entities + paths |
| 2 | DOMAIN_INDEX | 81 backend, 71 frontend paths |
| 4 | GOTCHAS | 43 known issues + solutions |
| 7-12 | Layer entities | Graph structure |
| 13-93 | Layer relations | Traversal paths |

**Anti-Pattern:**
```
❌ WRONG: Run --query 5 times to gather info
❌ WRONG: grep/search knowledge repeatedly
❌ WRONG: Read knowledge file multiple times
✓ RIGHT: Read first 100 lines ONCE, use that context
```

**Use in-memory knowledge before:**
- Reading any file → Check domain_index first
- Debugging errors → Check gotchas first
- Looking for entity → Check hot_cache first

**100k Simulation Results:**
- File reads: -76.8% with G0
- Cache hit rate: 71.3% with G0
- Relations: 570+ traversable connections

## Skill Triggers
| Trigger | Skill | Applies To |
|---------|-------|------------|
| .tsx .jsx | frontend-react ⭐ | edits |
| .py backend/ | backend-api ⭐ | edits |
| docker compose build | docker | commands |
| Dockerfile | docker | edits |
| error traceback | debugging | analysis |
| .md docs/ | documentation | edits |
| test_* pytest | testing | edits + commands |
| new feature | planning | analysis |

⭐ Pre-load fullstack

⚠️ **G2:** Skill required for edits AND domain commands

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## TODO Skill Annotation
When creating TODOs, match each task to its skill:
```
○ Task description [skill-name]
```

| Task Type | Skill to Annotate |
|-----------|------------------|
| Python service/endpoint | [backend-api] |
| React component/page | [frontend-react] |
| Docker config | [docker] |
| Tests | [testing] |
| Docs/README | [documentation] |
| Bug fix | [debugging] |
| No specific domain | (no annotation) |

## ⛔ Delegation (MANDATORY)
| Complexity | Strategy | Enforcement |
|------------|----------|-------------|
| Simple (<3) | Direct | Optional delegation |
| Medium (3-5) | Smart delegate | Suggest delegation |
| Complex (6+) | **MUST Delegate** | **runSubagent REQUIRED** |

### runSubagent Invocation (6+ tasks)
```python
# MANDATORY for complex sessions
runSubagent(
  agentName="[agent]",
  prompt="[role + task + context + scope + return + autonomy]",
  description="[3-5 word summary]"
)
```

### Delegation Savings (100k Projection)
| Without | With | Savings |
|---------|------|--------|
| 37 API calls | 16 API calls | -48% |
| 21k tokens | 9k tokens | -55% |
| 53 min | 8 min | -56% |

## ⛔ Parallel (G7) - runSubagent Pairs
**MUST achieve 60%+ parallel execution for complex sessions**

| Pair | Pattern | Independence |
|------|---------|-------------|
| code + docs | Both `runSubagent` parallel | ✓ Full |
| code + reviewer | Sequential delegation | Partial |
| research + code | Research first | Sequential |
| architect + research | Parallel research | ✓ Full |

## Verification
After edit: Syntax → Imports → Tests → ✓

## ⛔ Pre-Commit Gate (G5 Enforcement)
Before `git commit`, ALL must pass:
1. ✓ Syntax check passed (no red squiggles)
2. ✓ Build successful (if applicable)
3. ✓ Tests pass (if edited test files)
4. ✓ Workflow log created (for sessions >15 min)

**Block commit if any check fails.** Do NOT proceed until resolved.

## Parallel Execution Target (G7)
**Goal: 60%+ of complex sessions should use parallel execution**

| Session Type | Parallel Strategy |
|--------------|-------------------|
| Fullstack (frontend + backend) | code + documentation |
| Bug fix + docs | debugger + documentation |
| New feature | architect + research → code |
| Refactor | code + reviewer |

**When to parallelize:**
- Tasks are independent (no data dependency)
- Different domains (frontend vs backend)
- Documentation can run alongside code

⚠️ **Git Push:** ASK before push. Never auto-push.
⚠️ **END Phase:** ASK user confirmation before END. Never auto-END.
⚠️ **Workflow Log:** Create log BEFORE running END scripts (scripts parse the log).
