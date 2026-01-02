# Skill: Multi-Arch CI/CD

**Description**: Multi-arch Docker CI/CD with GitHub Actions and GHCR deployment

**When to Use**: 
- Setting up Docker-based projects for multiple architectures (amd64/arm64)
- Supporting ARM devices (Raspberry Pi, Radxa Rock, AWS Graviton, Apple Silicon)
- Creating production-ready deployment with pre-built images
- Enabling instant `git clone && docker compose up` deployment

**Tags**: `docker`, `ci-cd`, `github-actions`, `multi-arch`, `arm64`, `ghcr`

---

## Pattern Overview

1. **Dockerfiles** are written to be architecture-agnostic (avoid arch-specific dependencies)
2. **GitHub Actions** builds images for multiple platforms using Docker Buildx
3. **Images pushed to GHCR** (GitHub Container Registry) with multi-arch manifests
4. **Production compose** uses pre-built images from GHCR
5. **Development compose** builds locally for development/testing
6. **Deploy script** auto-detects architecture and pulls correct images

## Key Principles

- **Separation of concerns**: Production (pull images) vs Development (build locally)
- **Architecture transparency**: Docker automatically selects correct image variant
- **Native builds preferred**: Avoid QEMU emulation when possible for better performance
- **Cache optimization**: Use GitHub Actions cache to speed up repeated builds
- **Documentation**: Provide clear deployment instructions for both architectures

## Common Pitfalls

- ❌ Using architecture-specific base images (e.g., `amd64/python`)
- ❌ Hardcoding platform in docker-compose.yml (forces emulation)
- ❌ Forgetting to test on actual ARM hardware
- ❌ Not setting up GHCR permissions correctly
- ❌ Building locally instead of using CI/CD (slow on ARM)
- ✅ Use official multi-arch images (alpine, slim, etc.)
- ✅ Let Docker auto-detect platform
- ✅ Test deployment script on both architectures
- ✅ Use GitHub Actions secrets for GITHUB_TOKEN
- ✅ Pull pre-built images for production

## Code Examples

### Example 1: GitHub Actions Multi-Arch Workflow

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

### Example 2: Production docker-compose.yml

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

### Example 3: Development docker-compose.dev.yml

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

### Example 4: Deployment Script

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

- [infrastructure.md](infrastructure.md)
- [git-workflow.md](git-workflow.md)

---

*Last Updated: 2026-01-02*
