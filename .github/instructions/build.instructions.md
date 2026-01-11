---
applyTo: "**"
---

# Build v7.1

Setup and validation commands for NOP project.

## Setup

```bash
docker-compose up -d          # Start all services
docker-compose logs -f        # View logs
```

## Common Tasks

| Task | Command |
|------|---------|
| Start | `docker-compose up -d` |
| Stop | `docker-compose down` |
| Rebuild | `docker-compose build --no-cache` |
| Backend logs | `docker-compose logs -f backend` |
| Frontend logs | `docker-compose logs -f frontend` |

## ⛔ MANDATORY Before Finishing

1. **Check logs** for errors: `docker-compose logs backend`
2. **Verify services** running: `docker-compose ps`
3. **Test changes** in browser if UI modified

## ⚠️ Critical Gotchas

- **Restart ≠ Rebuild** - Code changes need `docker-compose build`
- **Volume mounts** - Source code reflects live, dependencies need rebuild
- **Port conflicts** - Check 3000, 8000 not in use
