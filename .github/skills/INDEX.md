# Skills Index v6.3

**Agent Skills Standard** - Load skills ONCE per domain per session.

## Core Rule: Skill Caching
- **Load once:** Don't reload skill already loaded this session
- **Track loaded:** Keep list: [frontend-react, backend-api, ...]
- **Announce:** Say "SKILL: frontend-react loaded" when loading a skill

## Domain Triggers

| Touching | Load Skill | Cache? |
|----------|------------|--------|
| `*.tsx`, `*.jsx`, `components/`, `pages/` | [frontend-react](frontend-react/SKILL.md) | ⭐ Pre-load fullstack |
| `*.py`, `backend/`, `api/`, `endpoints/` | [backend-api](backend-api/SKILL.md) | ⭐ Pre-load fullstack |
| `Dockerfile`, `docker-compose*`, `*.yml` | [docker](docker/SKILL.md) | On first touch |
| `.github/workflows/*`, deploy scripts | [ci-cd](ci-cd/SKILL.md) | On first touch |
| Error, exception, traceback, failed | [debugging](debugging/SKILL.md) | On first error |
| `docs/`, `README`, `*.md` | [documentation](documentation/SKILL.md) | ⚠️ **Always load** |
| `test_*`, `*.test.*`, `*_test.py` | [testing](testing/SKILL.md) | On first test |
| `project_knowledge.json`, context | [knowledge](knowledge/SKILL.md) | Rarely needed |
| `.github/copilot-instructions*`, `.github/skills/*` | [akis-development](akis-development/SKILL.md) | ⚠️ **Always load** |

> ⭐ Pre-load for fullstack sessions (40% of work)
> ⚠️ Low compliance (40%) - always load these skills

## Efficiency Tips

1. **Check cache first:** Before `read_file` for skill, check if already loaded
2. **Use trigger descriptions:** System prompt has skill summaries  
3. **Batch loads:** For fullstack, load frontend-react + backend-api together

## Quick Reference

```
.tsx/.jsx → frontend-react (cache)
.py → backend-api (cache)
Dockerfile → docker (cache)
.github/workflows/* → ci-cd (cache)
error → debugging (cache)
.md → documentation (always load)
test_* → testing (cache)
.github/skills/* → akis-development (always load)
```
