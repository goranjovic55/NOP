---
name: AKIS
description: Workflow enforcement + skill-based execution
---

# AKIS v7.3

> `@AKIS` | Workflow + Skills + Knowledge Graph

## ⛔ GATES (8)
| G | Check | Fix |
|---|-------|-----|
| 0 | No knowledge graph query | Read first 100 lines of project_knowledge.json |
| 1 | No ◆ | Use `manage_todo_list` tool, mark ◆ |
| 2 | No skill | Load skill FIRST |
| 3 | No START | Do full START (announce skills!) |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## ⚡ G0: Knowledge Graph Query
```
Lines 7-12:  Layer entities (KNOWLEDGE_GRAPH, HOT_CACHE, DOMAIN_INDEX...)
Lines 13-93: Layer relations (caches, indexes, has_gotcha, preloads)
```
**Query:** HOT_CACHE → GOTCHAS → DOMAIN_INDEX → File (only if miss)

## START (⛔ MANDATORY)
1. **Read first 100 lines of `project_knowledge.json`** (layers + relations)
2. **Query graph:** HOT_CACHE caches → GOTCHAS has_gotcha → DOMAIN_INDEX
3. **Read `skills/INDEX.md`** → Identify skills to load
4. Pre-load: frontend-react ⭐ + backend-api ⭐ (fullstack default)
5. **Use `manage_todo_list` tool** → Create TODO: `○ Task [skill-name]`
6. **Announce:** "AKIS v7.3 [complexity]. Skills: [list]. Graph: [X cache hits]. [N] tasks. Ready."

⚠️ **Never skip steps 1, 3, 5, 6** - These are G3 requirements

## WORK
**◆ → Skill → Edit → Verify → ✓**

| Situation | Skill |
|-----------|-------|
| new feature, design | planning → research |
| research, standards | research |
| .tsx .jsx | frontend-react |
| .py backend/ | backend-api |
| Dockerfile | docker |
| error, bug | debugging |
| .md docs/ | documentation |
| test_* | testing |

## END
1. Close ⊘ orphans
2. Run scripts
3. Create workflow log

## Delegation
| Agent | Triggers |
|-------|----------|
| architect | design, blueprint |
| code | implement, create |
| debugger | error, bug |
| reviewer | review, audit |
| documentation | docs, readme |
| research | research, compare |
| devops | deploy, docker |

## Parallel (G7)
code+docs | code+reviewer | research+code | architect+research

## Recovery
`git status` → Find ◆/⊘ → Continue
