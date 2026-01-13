---
applyTo: "**"
---

# Protocols v7.2

> Based on 100k simulation: G0 reduces file reads by 85%, tokens by 67.2%

## Gates (8)
| G | Check | Fix |
|---|-------|-----|
| 0 | No knowledge query | Query project_knowledge.json FIRST |
| 1 | No ◆ | Create TODO |
| 2 | No skill for edit/command | Load skill FIRST |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## ⛔ G0 Enforcement: Knowledge First (CRITICAL)
**Only 2.3% of sessions use G0 - target is 100%**

**BEFORE any file read or search:**
1. Check `hot_cache` for entity/exports/paths
2. Check `gotchas` for known bugs/solutions (75% debug acceleration)
3. Check `domain_index` for file locations
4. **ONLY read files if knowledge cache miss**

**100k Simulation Results:**
- Token usage: -67.2% with G0
- API calls: -64.8% with G0
- Cache hit rate: 50% with knowledge layers

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

## Delegation
| Complexity | Strategy |
|------------|----------|
| Simple (<3) | Direct or delegate |
| Medium (3-5) | Smart delegate |
| Complex (6+) | Delegate |

## Parallel (G7)
code+docs | code+reviewer | research+code | architect+research

## Verification
After edit: Syntax → Imports → Tests → ✓

⚠️ **Git Push:** ASK before push. Never auto-push.
⚠️ **END Phase:** ASK user confirmation before END. Never auto-END.
⚠️ **Workflow Log:** Create log BEFORE running END scripts (scripts parse the log).
