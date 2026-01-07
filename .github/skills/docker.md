# Docker Development Workflow

Container management for development and production. Works with any Docker/Compose project.

## Critical Rules

- **Dev vs Prod Compose:** Use separate files (`docker-compose.dev.yml` vs `docker-compose.yml`)
- **Rebuild after deps:** Dependency changes require `--build`
- **Restart for code:** Python changes often need container restart (cached .pyc)
- **Check logs first:** First step in any container issue

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Production compose for dev | `docker-compose.dev.yml` |
| Assuming hot reload | Verify reload behavior |
| Ignoring cache | `--no-cache` when needed |
| Root containers | Non-root user in Dockerfile |

## Compose File Organization

```
docker-compose.yml       # Production (prebuilt images)
docker-compose.dev.yml   # Development (build from source)
docker-compose.test.yml  # Testing/CI environment
```

## Patterns

### Development Workflow
```bash
# Start all services (local build)
docker compose -f docker-compose.dev.yml up -d

# Start specific service
docker compose -f docker-compose.dev.yml up -d backend

# View logs (follow)
docker compose -f docker-compose.dev.yml logs -f backend

# Restart after code changes
docker compose -f docker-compose.dev.yml restart backend

# Rebuild after dependency changes
docker compose -f docker-compose.dev.yml up -d --build backend

# Stop all
docker compose -f docker-compose.dev.yml down
```

### Clear Python Cache (Code Not Updating)
```bash
# Symptom: Old code still running despite changes
# Cause: Cached .pyc files in container

# Option 1: Restart container
docker restart container-name

# Option 2: Clear cache inside container
docker exec container-name find /app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
docker restart container-name

# Option 3: Full rebuild
docker compose -f docker-compose.dev.yml up -d --build --force-recreate backend
```

### Production Deployment
```bash
# Pull and start (production images)
docker compose pull
docker compose up -d

# Rolling update
docker compose up -d --no-deps --build service-name
```

### Container Debugging
```bash
# Check what's running
docker ps
docker compose ps

# Get shell in container
docker exec -it container-name bash
docker exec -it container-name sh  # Alpine

# Check file contents
docker exec container-name cat /app/config.py

# Check environment
docker exec container-name env | grep API

# Resource usage
docker stats container-name
```

### Network & Ports
```bash
# Check port bindings
docker port container-name

# Port already in use?
lsof -i :8000
netstat -tlnp | grep 8000

# Container connectivity
docker exec container-name curl http://other-service:8000/health
```

### Volume Management
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect volume-name

# Prune unused
docker volume prune
docker system prune -a  # Full cleanup
```

### Dockerfile Best Practices
```dockerfile
# Multi-stage build
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH

# Non-root user
RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["python", "main.py"]
```

### Compose Dev Configuration
```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/app  # Hot reload mount
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    ports:
      - "8000:8000"
    depends_on:
      - db
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Code changes not reflecting | `docker restart` or rebuild |
| Port already in use | `lsof -i :PORT` then kill or change port |
| Cannot connect to service | Use service name not localhost |
| Out of disk space | `docker system prune -a` |
| Build cache issues | `--no-cache` flag |
| Permission denied | Check volume permissions |
