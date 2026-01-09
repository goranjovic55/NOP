---
name: docker
description: Load when editing Dockerfile, docker-compose*.yml, or managing containers. Provides container management patterns for development and production environments.
---

# Docker

## ⚠️ Critical Gotchas
- **Restart ≠ Rebuild:** `docker compose restart` keeps old code! Use `--build`
- **Broadcast sockets:** Require `SO_BROADCAST` option
- **Python cache:** Use `--force-recreate`

## Auto-Detect Environment

| Situation | Use |
|-----------|-----|
| Local development | `docker-compose.dev.yml` |
| Code not appearing | `up -d --build` |
| Production | `docker-compose.yml` |

## Commands

```bash
# Development (DEFAULT)
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml up -d --build backend

# Code not updating?
docker compose up -d --build --force-recreate backend

# Debugging
docker logs container-name --tail 50
docker exec -it container-name bash
```

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| `restart` after code change | `up -d --build` |
| Prod compose for dev | `docker-compose.dev.yml` |
