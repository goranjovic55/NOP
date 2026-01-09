---
name: docker
description: Load when editing Dockerfile, docker-compose*.yml, or managing containers. Provides container management patterns for development and production environments.
---

# Docker

## Rules
- **Dev vs Prod:** Separate compose files
- **Rebuild after deps:** Use `--build`
- **Check logs first:** `docker compose logs service`

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Prod compose for dev | `docker-compose.dev.yml` |
| Assuming hot reload | Verify behavior |
| Root containers | Non-root user |

## Commands

```bash
# Development
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml up -d --build backend

# Debugging
docker exec -it container-name bash
docker exec container-name env | grep API
docker stats container-name

# Python cache (code not updating)
docker restart container-name
# or full rebuild
docker compose up -d --build --force-recreate backend

# Cleanup
docker system prune -a
```
