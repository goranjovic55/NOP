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

## ⛔ G0 Enforcement: Knowledge Graph Query (CRITICAL)
**Impact: -76.8% file reads | 71.3% cache hits**

**Read first 100 lines of project_knowledge.json:**
```
Lines 1-6:   Headers (hot_cache data, domain_index data, gotchas data)
Lines 7-12:  Layer entities (KNOWLEDGE_GRAPH, HOT_CACHE, DOMAIN_INDEX, GOTCHAS...)
Lines 13-93: Layer relations (caches, indexes, has_gotcha, preloads...)
```

**Graph Query Order:**
1. HOT_CACHE `caches` → entity (top 20 instant lookup)
2. GOTCHAS `has_gotcha` → entity (75% debug acceleration)
3. DOMAIN_INDEX `indexes_backend/frontend` → entity (O(1) lookup)
4. Code `imports` relations → entity dependencies
5. **ONLY read file if graph miss (<15% of queries)**

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
