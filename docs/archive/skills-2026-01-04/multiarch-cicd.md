# Multi-Arch CI/CD

Multi-arch Docker builds with GitHub Actions and GHCR.

## When to Use
- Supporting ARM and x64 platforms
- Building images in CI/CD
- Publishing to GHCR
- Production deployments

## Pattern

1. Dockerfiles are architecture-agnostic
2. GitHub Actions builds for amd64/arm64 using Buildx
3. Images pushed to GHCR with multi-arch manifests
4. Production uses GHCR images, dev builds locally
5. Deploy script auto-detects architecture

## Avoid

- ❌ Arch-specific base images → ✅ Official multi-arch images
- ❌ Hardcoded platform → ✅ Auto-detect
- ❌ Local ARM builds → ✅ CI/CD builds

## Examples

### GitHub Actions Multi-Arch Workflow

\`\`\`yaml
name: Build Multi-Arch Images

on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/\${{ github.repository_owner }}

jobs:
  build-backend:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          platforms: linux/amd64,linux/arm64
          push: true
          tags: \${{ env.IMAGE_PREFIX }}/app-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
\`\`\`

### Production Compose

\`\`\`yaml
services:
  backend:
    image: ghcr.io/username/app-backend:latest
    # Docker auto-selects correct architecture
  
  frontend:
    image: ghcr.io/username/app-frontend:latest
    ports:
      - "3000:3000"
  
  postgres:
    image: postgres:15-alpine  # Multi-arch official image
\`\`\`

### Development Compose

\`\`\`yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/app
  
  frontend:
    build:
      context: ./frontend
\`\`\`

### Deploy Script

\`\`\`bash
#!/bin/bash
set -e

ARCH=\$(uname -m)
case \$ARCH in
    x86_64) echo "✓ AMD64" ;;
    aarch64|arm64) echo "✓ ARM64" ;;
esac

docker compose pull
docker compose up -d
\`\`\`

## Checklist

- [ ] Dockerfiles are architecture-agnostic
- [ ] GitHub Actions workflow with QEMU and Buildx
- [ ] Platforms: linux/amd64,linux/arm64
- [ ] Production compose uses GHCR images
- [ ] Development compose builds locally
- [ ] Deploy script with arch detection
- [ ] Documentation updated
- [ ] Tested on both architectures

## Related Skills
- `infrastructure.md` - Docker patterns
- `git-workflow.md` - CI/CD workflows

## Related

- `infrastructure`
- `git-workflow`
