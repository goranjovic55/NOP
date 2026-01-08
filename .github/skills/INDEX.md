# Skills Index

**Agent Skills Standard Format** - Load skills by domain trigger.

## Domain Triggers

| Touching | Load Skill | Enforcement |
|----------|------------|-------------|
| `*.tsx`, `*.jsx`, `components/`, `pages/` | [frontend-react](frontend-react/SKILL.md) | MANDATORY |
| `*.py`, `backend/`, `api/`, `endpoints/` | [backend-api](backend-api/SKILL.md) | MANDATORY |
| `Dockerfile`, `docker-compose*`, `*.yml` | [docker](docker/SKILL.md) | MANDATORY |
| Error, exception, traceback, failed | [debugging](debugging/SKILL.md) | MANDATORY |
| `docs/`, `README`, `*.md` | [documentation](documentation/SKILL.md) | **MANDATORY** ⚠️ |
| `test_*`, `*.test.*`, `*_test.py` | [testing](testing/SKILL.md) | recommended |
| `project_knowledge.json`, context | [knowledge](knowledge/SKILL.md) | recommended |
| `.github/copilot-instructions*`, `.github/skills/*` | [akis-development](akis-development/SKILL.md) | **MANDATORY** ⚠️ |

> ⚠️ **documentation has 40% compliance rate** - MUST load when editing ANY .md file

## All Skills

| Skill | Path | Purpose |
|-------|------|---------|
| frontend-react | `frontend-react/SKILL.md` | React/TypeScript patterns, hooks, state |
| backend-api | `backend-api/SKILL.md` | FastAPI CRUD, services, async patterns |
| docker | `docker/SKILL.md` | Container workflow, compose, debugging |
| debugging | `debugging/SKILL.md` | Systematic error troubleshooting |
| documentation | `documentation/SKILL.md` | Doc structure, templates, placement |
| testing | `testing/SKILL.md` | pytest, React Testing Library, mocking |
| knowledge | `knowledge/SKILL.md` | Project knowledge file patterns |
| akis-development | `akis-development/SKILL.md` | AKIS framework editing, token optimization |

## Quick Reference

```
.tsx/.jsx → frontend-react/SKILL.md
.py → backend-api/SKILL.md
Dockerfile → docker/SKILL.md
error/failed → debugging/SKILL.md
docs/*.md → documentation/SKILL.md
test_* → testing/SKILL.md
.github/skills/* → akis-development/SKILL.md
```

## Skill Format (Agent Skills Standard)

Skills use YAML frontmatter:
```yaml
---
name: skill-name
description: When to load this skill
---
# Content...
```

**Location:** `.github/skills/skill-name/SKILL.md`

---

*Update INDEX when adding/removing skills*
