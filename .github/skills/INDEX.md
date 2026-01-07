# Skills Index

**Load skills by domain trigger.** Query skills for patterns, not instructions.

## Domain Triggers

| Touching | Load Skill |
|----------|------------|
| `*.tsx`, `*.jsx`, `components/`, `pages/`, React | [frontend-react.md](frontend-react.md) |
| `*.py`, `backend/`, `api/`, `endpoints/`, FastAPI | [backend-api.md](backend-api.md) |
| `Dockerfile`, `docker-compose*`, `*.yml` (compose) | [docker.md](docker.md) |
| Error, exception, traceback, failed, debug | [debugging.md](debugging.md) |
| `docs/`, `README`, `*.md` (documentation) | [documentation.md](documentation.md) |
| `test_*`, `*.test.*`, `*_test.py`, pytest, jest | [testing.md](testing.md) |
| `project_knowledge.json`, context, knowledge | [knowledge.md](knowledge.md) |

## All Skills

| Skill | Purpose | Cross-Project |
|-------|---------|---------------|
| [frontend-react.md](frontend-react.md) | React/TypeScript patterns, hooks, state | ✅ |
| [backend-api.md](backend-api.md) | FastAPI CRUD, services, async patterns | ✅ |
| [docker.md](docker.md) | Container workflow, compose, debugging | ✅ |
| [debugging.md](debugging.md) | Systematic error troubleshooting | ✅ |
| [documentation.md](documentation.md) | Doc structure, templates, placement | ✅ |
| [testing.md](testing.md) | pytest, React Testing Library, mocking | ✅ |
| [knowledge.md](knowledge.md) | Project knowledge file patterns | ✅ |

## Skill Selection Rules

1. **File extension triggers:** Most reliable, check first
2. **Directory triggers:** `backend/`, `components/`, `tests/`
3. **Content triggers:** Error messages, specific patterns
4. **Combine skills:** Fullstack work often needs multiple

## Quick Reference

```
.tsx/.jsx → frontend-react
.py → backend-api
Dockerfile → docker
error/failed → debugging
docs/*.md → documentation
test_* → testing
```

## Skill Creation

**When to create:** Pattern used ≥5 sessions, reusable, copy-paste ready

**Format:** 
- < 100 lines
- Critical Rules section
- Avoid table (❌/✅)
- Code patterns with context
- Common errors table
- Cross-project applicable

**Template:** `.github/templates/skill.md`

---

*Update INDEX when adding/removing skills*
