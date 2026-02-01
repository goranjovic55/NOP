---
name: docker
description: Docker Compose, container management, and infrastructure patterns. Load when working with Dockerfile, docker-compose.yml, or deployment tasks.
---

# Docker

## Commands

| Task | Command |
|------|---------|
| Start dev | `docker-compose -f docker/docker-compose.dev.yml up -d` |
| Start prod | `docker-compose up -d` |
| View logs | `docker-compose logs -f [service]` |
| Rebuild | `docker-compose build --no-cache` |
| Full reset | `docker-compose down && docker-compose up -d --build` |
| Enter container | `docker exec -it nop-backend bash` |
| Check health | `docker-compose ps` |
| Config test | `docker-compose config` |

## Gotchas

| Category | Pattern | Solution |
|----------|---------|----------|
| Build | Changes not visible | Use `--no-cache` flag |
| Build | Container old code | Use `--build --force-recreate` |
| Network | Bridge uses gateway IP | Use different IP for containers |
| Ports | Wrong service on port | Verify port mappings (8000=Portainer, 12000=NOP) |
| Config | Invalid YAML | Run `docker-compose config` first |
| Volumes | Data not persisting | Check volume mounts in compose file |

## Rules

| Rule | Requirement |
|------|-------------|
| Config test | Run `docker-compose config` before apply |
| Health checks | Define health checks for all services |
| Resource limits | Set memory/CPU limits |
| Secrets | Use environment variables, not hardcoded |
| Rollback | Document rollback plan |

## Patterns

```yaml
# Pattern 1: Health check
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

# Pattern 2: Resource limits
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M

# Pattern 3: Environment from file
services:
  backend:
    env_file:
      - .env
```

## Pre-Change Checklist

- [ ] Environment variables documented
- [ ] No secrets in code
- [ ] docker-compose config validates
- [ ] Rollback plan documented
- [ ] Health checks defined

## Rollback Plan Template

```markdown
## Rollback Plan

### Changes Made
1. [Change 1]
2. [Change 2]

### Rollback Steps
1. `docker-compose down`
2. `git checkout [previous-commit] -- [files]`
3. `docker-compose up -d --build`

### Verification
- [ ] Services healthy
- [ ] Application accessible
- [ ] Logs show no errors
```
