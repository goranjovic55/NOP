# Docker Development Workflow

Container management for local development vs production deployments.

## When to Use
- Starting/restarting services during development
- Code changes not reflecting in containers
- Choosing correct docker-compose file
- Debugging container issues

## Avoid
- ❌ `docker-compose` for local dev → ✅ Use `docker-compose.dev.yml`
- ❌ Assuming code auto-reloads → ✅ Restart containers for Python changes
- ❌ Mixed compose files → ✅ Use one consistently per environment

## File Purpose

**docker-compose.yml** - Production (prebuilt images from registry)
**docker-compose.dev.yml** - Local builds (build from source)
**docker-compose.test.yml** - Test environment

## Examples

### Local Development Workflow
```bash
# Start services (local builds)
docker compose -f docker-compose.dev.yml up -d

# Restart after Python code changes (clears .pyc cache)
docker restart docker-backend-1

# Rebuild after dependency changes
docker compose -f docker-compose.dev.yml up -d --build backend

# View logs
docker logs docker-backend-1 --tail 50 -f
```

### Python Code Reload Issues
```bash
# Symptom: Code changes don't take effect, old errors persist
# Cause: Cached .pyc files or stale imports

# Quick fix - restart container
docker restart docker-backend-1

# Nuclear option - clear cache inside container
docker exec docker-backend-1 find /app -name "*.pyc" -delete
docker exec docker-backend-1 find /app -name "__pycache__" -type d -exec rm -rf {} +
docker restart docker-backend-1
```

### Production Deployment
```bash
# Use production compose (pulls prebuilt images)
docker compose up -d

# Or specify registry image
docker compose pull && docker compose up -d
```

### Quick Container Checks
```bash
# Check running containers
docker ps

# Exec into container
docker exec -it docker-backend-1 bash

# Check file in container
docker exec docker-backend-1 cat /app/some/file.py | head -20

# Restart all services
docker compose -f docker-compose.dev.yml restart
```

## Related
- `debugging.md` - Container troubleshooting
- `backend-api.md` - FastAPI reload behavior
