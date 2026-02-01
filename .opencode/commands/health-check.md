---
description: Check project health - run tests, linting, and type checks
---

Run a comprehensive health check on the project:

## Backend Checks
```bash
cd backend && python -m pytest -v --tb=short
```

## Frontend Checks
```bash
cd frontend && npm run lint
cd frontend && npx tsc --noEmit
cd frontend && npm test -- --watchAll=false
```

## Docker Health
```bash
docker-compose ps
docker-compose logs --tail=20 backend
```

Report any failures found and suggest fixes based on the debugging skill.
