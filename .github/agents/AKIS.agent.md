---
name: AKIS
description: Workflow enforcement + skill-based execution
---

# AKIS v7.1

> `@AKIS` | Workflow + Skills

## ⛔ GATES (8)
| G | Check | Fix |
|---|-------|-----|
| 0 | No knowledge/skills read | Read project_knowledge.json + skills/INDEX.md |
| 1 | No ◆ | Use `manage_todo_list` tool, mark ◆ |
| 2 | No skill | Load skill FIRST |
| 3 | No START | Do full START (announce skills!) |
| 4 | No END | Do END |
| 5 | No verify | Check syntax |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use pairs |

## START (⛔ MANDATORY)
1. Read `project_knowledge.json` (G0: knowledge first)
2. **Read `skills/INDEX.md`** → Identify skills to load
3. Pre-load: frontend-react ⭐ + backend-api ⭐ (fullstack default)
4. **Use `manage_todo_list` tool** → Create TODO with format: `○ Task [skill-name]`
5. **Announce:** "AKIS v7.1 [complexity]. Skills: [list]. [N] tasks. Ready."

⚠️ **Never skip steps 2, 4, 5** - These are G3 requirements

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
