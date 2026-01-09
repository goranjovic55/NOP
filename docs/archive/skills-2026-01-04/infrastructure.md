# Infrastructure Patterns

## When to Use
- Docker containerization
- Multi-container orchestration
- Production deployment
- Development environment setup

Docker and deployment patterns.

## NOP Project Docker Workflow

**IMPORTANT**: This project uses different docker-compose files for different environments:

- **`docker-compose.yml`** → Production (uses pre-built images from GHCR)
  - Images: `ghcr.io/goranjovic55/nop-frontend:latest`, `ghcr.io/goranjovic55/nop-backend:latest`
  - Use: `docker-compose up -d`
  - For running stable production builds

- **`docker-compose.dev.yml`** → Development (builds from local source)
  - Builds from `./frontend/` and `./backend/` directories
  - Use: `docker-compose -f docker-compose.dev.yml up -d --build`
  - For active development with code changes
  - **ALWAYS use this when making code changes during development**

**Workflow**:
1. Development: Use `docker-compose.dev.yml` to test changes locally
2. Commit changes to repository
3. CI/CD pipeline automatically builds and pushes new images to GHCR
4. Production: Pull and run latest images with `docker-compose.yml`

**Common mistake**: Using `docker-compose.yml` during development won't pick up code changes since it uses pre-built images!

## Avoid
- ❌ Secrets in Dockerfiles → ✅ Use env vars
- ❌ Running as root → ✅ Create user
- ❌ No health checks → ✅ Define healthcheck
- ❌ Large images → ✅ Multi-stage builds
- ❌ Using production compose during development → ✅ Use docker-compose.dev.yml

## Checklist
- [ ] Multi-stage Dockerfile (build → runtime)
- [ ] Health checks defined
- [ ] Secrets via env vars (not baked in)
- [ ] Resource limits set (memory, CPU)

## Examples

### Multi-Stage Dockerfile (Python)
```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY ./app ./app

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Multi-Stage Dockerfile (Node)
```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### GitHub Actions CI
```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest --cov
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: ${{ github.repository }}:latest
```

## Related Skills
- `multiarch-cicd.md` - Multi-platform builds
- `debugging.md` - Container debugging
