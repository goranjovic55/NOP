# Debugging

## Overview

Systematic approach to resolving build, runtime, and infrastructure errors.

---

## General Strategy

1. **Read error message completely** - Don't skip details
2. **Identify error type** - Build, runtime, type, network, Docker
3. **Check recent changes** - `git diff`, changed files
4. **Isolate component** - Which layer (frontend, backend, infra)
5. **Fix and verify** - Test fix, check related areas

---

## Build Errors

### TypeScript/JavaScript

**Symptom:** `Cannot find module`, `Type error`

**Check:**
```bash
# Missing dependency
npm install

# Type errors
npm run build  # See full error context

# Import path
grep -r "import.*from.*X" src/
```

**Common fixes:**
- Add missing import
- Fix import path (relative vs absolute)
- Add type definition
- Install missing package

---

### Python

**Symptom:** `ModuleNotFoundError`, `ImportError`

**Check:**
```bash
# Missing package
pip list | grep package-name

# Import structure
grep -r "from .* import" app/

# Python path
echo $PYTHONPATH
```

**Common fixes:**
- Install missing package (`pip install X`)
- Fix relative imports (`from .module import`)
- Check `__init__.py` exists
- Verify package structure

---

## Type Errors

### TypeScript

**Check:**
```bash
# Full type check
npx tsc --noEmit

# Specific file
npx tsc --noEmit src/file.ts
```

**Common patterns:**
```typescript
// Property missing
interface User {
  id: number;
  name: string;  // Add missing property
}

// Type mismatch
const value: string | null = ...;
if (value) {  // Narrow type
  value.toUpperCase();
}

// Async type
const data: Awaited<ReturnType<typeof fetchData>>;
```

---

### Python

**Check:**
```bash
# Type check
mypy app/

# Specific file
mypy app/services/file.py
```

**Common patterns:**
```python
# Type hints
def process(data: dict[str, Any]) -> list[str]:
    ...

# Optional
from typing import Optional
def get_user(id: int) -> Optional[User]:
    ...

# Union
from typing import Union
def parse(value: Union[str, int]) -> str:
    ...
```

---

## Runtime Errors

### Backend

**Check logs:**
```bash
# Docker logs
docker compose logs backend -f

# Specific error
docker compose logs backend | grep -i error

# Last 100 lines
docker compose logs backend --tail=100
```

**Common issues:**
- Database connection (check `DATABASE_URL`)
- Missing environment variables
- Port conflicts
- Dependency versions

---

### Frontend

**Check console:**
- Browser DevTools → Console
- Network tab (API calls)
- React DevTools (component state)

**Common issues:**
- API endpoint wrong (`/api/v1/...`)
- CORS errors (backend CORS config)
- Null/undefined state
- Event handler binding

---

## Docker Errors

### Container won't start

**Check:**
```bash
# Build output
docker compose build service-name

# Logs
docker compose logs service-name

# Inspect
docker inspect container-id

# Shell access (if running)
docker exec -it container-id /bin/bash
```

**Common issues:**
- Missing environment variables
- Port already in use
- Volume permission errors
- Network connectivity

---

### Network issues

**Check:**
```bash
# Container networks
docker network ls
docker network inspect network-name

# Container IP
docker inspect container-id | grep IPAddress

# Test connectivity
docker exec container-id ping other-container
docker exec container-id curl http://other-container:port
```

**Common fixes:**
- Verify network config in `docker-compose.yml`
- Use service names (not localhost)
- Check port mappings
- Restart network: `docker compose down && docker compose up`

---

### Volume issues

**Check:**
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect volume-name

# Permissions
docker exec container-id ls -la /mount/path
```

**Common fixes:**
- Remove and recreate: `docker volume rm volume-name`
- Fix permissions in Dockerfile
- Check mount paths in `docker-compose.yml`

---

## Database Errors

**Check connection:**
```bash
# Postgres
docker exec -it container-id psql -U user -d database

# Test from backend
docker exec -it backend-container python -c "from app.db import engine; print(engine)"
```

**Common issues:**
- Database not ready (wait-for-db script)
- Wrong credentials
- Missing migrations
- Connection pool exhausted

---

## Performance Debugging

**Backend:**
```bash
# Request time
docker compose logs backend | grep "GET\|POST"

# CPU/Memory
docker stats
```

**Frontend:**
```javascript
// React DevTools Profiler
// Network tab (waterfall)
// Lighthouse audit
```

**Common issues:**
- N+1 queries (add eager loading)
- Missing indexes (database)
- Large payload (pagination)
- Re-renders (React.memo, useMemo)

---

## Debugging Tools

**Logs:**
```bash
# Tail all services
docker compose logs -f

# Filter by service
docker compose logs backend -f

# Search logs
docker compose logs | grep -i "error\|exception"
```

**Interactive:**
```bash
# Python debugger
import pdb; pdb.set_trace()

# Node inspector
node --inspect-brk app.js
```

**Network:**
```bash
# curl test
curl -v http://localhost:8000/api/health

# Docker network
docker exec container ping other-container
```

---

## Checklist

Before debugging:
- [ ] Read full error message
- [ ] Check recent changes (`git diff`)
- [ ] Verify environment (`.env` file)
- [ ] Check logs (`docker compose logs`)

While debugging:
- [ ] Isolate the issue (which component?)
- [ ] Test hypothesis (one change at a time)
- [ ] Verify fix (run tests, manual check)
- [ ] Check related areas (integration points)

After fix:
- [ ] Document if non-obvious
- [ ] Add test if bug was missed
- [ ] Update error handling if needed
