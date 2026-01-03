# Docker Image Rebuild Instructions

## Quick Rebuild (Development)

For testing changes quickly in development environment:

```bash
# 1. Stop containers
docker compose down

# 2. Rebuild specific service without cache
docker compose build --no-cache frontend
docker compose build --no-cache backend

# 3. Start containers
docker compose up -d

# 4. Check logs
docker compose logs -f frontend
docker compose logs -f backend
```

## Full System Rebuild

Complete rebuild of all images and containers:

```bash
# 1. Stop and remove all containers, networks, volumes
docker compose down -v

# 2. Prune Docker system (removes unused images)
docker system prune -af --volumes

# 3. Rebuild all services
docker compose build --no-cache

# 4. Start all services
docker compose up -d

# 5. Verify all containers running
docker compose ps
```

## Individual Service Rebuild

### Frontend Only
```bash
docker compose stop frontend
docker build --no-cache -t ghcr.io/goranjovic55/nop-frontend:latest ./frontend
docker compose up -d frontend
```

### Backend Only
```bash
docker compose stop backend
docker build --no-cache -t ghcr.io/goranjovic55/nop-backend:latest ./backend
docker compose up -d backend
```

### Guacd Only
```bash
docker compose stop guacd
docker build --no-cache -t ghcr.io/goranjovic55/nop-guacd:latest ./docker/guacd
docker compose up -d guacd
```

## Hot-Reload Without Rebuild (Faster for Testing)

Copy built files directly into running containers:

### Frontend (React build)
```bash
# 1. Build locally
cd frontend && npm run build

# 2. Copy to running container
docker cp build/. nop-frontend-1:/usr/share/nginx/html/

# 3. Reload nginx
docker exec nop-frontend-1 nginx -s reload
```

### Backend (Python files)
```bash
# Copy specific file
docker cp backend/app/api/v1/endpoints/traffic.py nop-backend-1:/app/app/api/v1/endpoints/traffic.py

# Restart backend
docker compose restart backend
```

## Production Deployment

### 1. Build and Push to GitHub Container Registry
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build with platform targeting
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/goranjovic55/nop-frontend:latest \
  --push ./frontend

docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/goranjovic55/nop-backend:latest \
  --push ./backend

docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/goranjovic55/nop-guacd:latest \
  --push ./docker/guacd
```

### 2. Deploy on Target Server
```bash
# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d

# Check health
docker compose ps
docker compose logs -f
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Inspect container
docker inspect nop-backend-1
docker inspect nop-frontend-1
```

### Network issues
```bash
# Recreate network
docker compose down
docker network prune -f
docker compose up -d
```

### Permission issues
```bash
# Reset ownership (if needed)
sudo chown -R $USER:$USER volumes/
```

### Database migration issues
```bash
# Reset database (CAREFUL - deletes data!)
docker compose down -v
docker volume rm nop_postgres_data
docker compose up -d
```

## Build Optimization

### Use BuildKit for faster builds
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose build
```

### Multi-stage build caching
```bash
# Build with inline cache
docker build --cache-from ghcr.io/goranjovic55/nop-frontend:latest \
  -t ghcr.io/goranjovic55/nop-frontend:latest \
  ./frontend
```

## Monitoring Build Progress

```bash
# Watch build with detailed output
docker compose build --progress=plain

# Check image sizes
docker images | grep nop

# Inspect layers
docker history ghcr.io/goranjovic55/nop-frontend:latest
```

## Cleanup

### Remove old images
```bash
# Remove dangling images
docker image prune -f

# Remove all unused images
docker image prune -af
```

### Remove build cache
```bash
docker builder prune -af
```

## Notes

- **Development**: Use hot-reload with `docker cp` for fastest iteration
- **Testing**: Use `docker compose build --no-cache` for clean builds
- **Production**: Use multi-arch builds and push to registry
- **Always**: Check logs after rebuild to verify services started correctly
