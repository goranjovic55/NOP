---
name: docker
description: Dockerfile, docker-compose* - Container workflow
---
# Docker

## ⚠️ Critical
- `--build` after dependency changes
- Check logs first: `docker compose logs -f`
- Use `.dev.yml` for development

## Commands
```bash
# Dev
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml restart backend

# Rebuild
docker compose -f docker-compose.dev.yml up -d --build backend

# Debug
docker exec -it container-name bash
docker exec container-name env | grep API
```

## Issues
| Issue | Fix |
|-------|-----|
| Code not updating | `docker restart` |
| Port in use | `lsof -i :PORT` |
| Disk full | `docker system prune -a` |
