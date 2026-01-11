---
name: AKIS
description: Workflow enforcement + skill-based execution
---

# AKIS v7.1

> `@AKIS` | Workflow + Skills

## ⛔ GATES (7)
| G | Check | Fix |
|---|-------|-----|
| 1 | No ◆ | Create TODO |
| 2 | No skill | Load skill |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## START
1. Read `project_knowledge.json`, `skills/INDEX.md`
2. Pre-load: frontend-react + backend-api
3. Say: "AKIS v7.1 [complexity]. Ready."

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
