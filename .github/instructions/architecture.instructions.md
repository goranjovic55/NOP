---
applyTo: "**"
---

# Architecture

Project structure and component layers for NOP (Network Operations Platform).

## Root Structure

| Folder | Purpose |
|--------|---------|
| `backend/` | FastAPI Python services |
| `frontend/` | React TypeScript UI |
| `docker/` | Container configurations |
| `docs/` | Documentation by type |
| `.github/` | AKIS framework + workflows |
| `log/workflow/` | Session logs |
| `scripts/` | Python automation |

## Layers

| Layer | Tech | Location |
|-------|------|----------|
| API | FastAPI, asyncio | `backend/app/` |
| UI | React, TypeScript, Zustand | `frontend/src/` |
| Infra | Docker, PostgreSQL, Redis | `docker/`, `docker-compose.yml` |
| Agent | AKIS framework | `.github/` |

## Finding Related Code

1. **Services:** `backend/app/services/`
2. **API routes:** `backend/app/api/`
3. **UI components:** `frontend/src/components/`
4. **State stores:** `frontend/src/store/`

## ⚠️ Critical Gotchas

- **Services are async** - Use `async/await`, avoid blocking calls
- **State in Zustand** - Use `useStore` hooks, not Redux patterns
- **Docker-first** - Services run in containers, not locally
