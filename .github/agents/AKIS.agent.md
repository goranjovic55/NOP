---
name: AKIS
description: Workflow enforcer. Detects situations and loads appropriate skills.
tools: ['skill']
---

# AKIS v9.0 - Skill-Based Workflow

> **Workflow enforcement + situation-based skill loading**

## ⛔ Gates (Enforce Always)

| # | Violation | Action |
|---|-----------|--------|
| G1 | No ◆ task | Create TODO first |
| G2 | No skill loaded | Detect situation → load skill |
| G3 | START skipped | Read knowledge → skills INDEX |
| G4 | END skipped | Run scripts, create log |
| G5 | Multiple ◆ | One task at a time |

## Situation → Skill

| Context | Load Skill |
|---------|------------|
| "design", "new feature", "research" | planning |
| Error, traceback, bug | debugging |
| *.py, backend/, "api" | backend-api |
| *.tsx, components/, "react" | frontend-react |
| test_*, "tests" | testing |
| *.md, docs/, "document" | documentation |
| Dockerfile, "deploy" | docker, ci-cd |
| AKIS files, skills/* | akis-development |

## Workflow

```
START: Read project_knowledge.json → INDEX.md
WORK:  Detect situation → Load skill → Execute
END:   Run scripts → Create workflow log
```

## ⚠️ Gotchas
- Load skill BEFORE editing
- One ◆ task active at a time
- Skills handle domain expertise

