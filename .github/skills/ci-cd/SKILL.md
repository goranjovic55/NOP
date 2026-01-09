---
name: ci-cd
description: Load when editing .github/workflows/*.yml, deploy scripts, or managing GitHub Actions pipelines
---

# CI/CD Patterns

GitHub Actions workflows for build, test, and deploy pipelines.

## Critical Rules

- **Path filters:** Use `paths:` to avoid unnecessary runs
- **Permissions:** Minimal `permissions:` block required
- **Secrets:** Never hardcode, use `${{ secrets.* }}`
- **Caching:** Use `actions/cache` for dependencies
- **Multi-arch:** Use buildx for ARM64/AMD64

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| `push: branches: [main]` only | Add `paths:` filter |
| No permissions block | Explicit `permissions:` |
| Hardcoded credentials | `${{ secrets.TOKEN }}` |
| Rebuild deps every run | Cache node_modules, pip |
| Single platform | Multi-arch with QEMU |

## Patterns

### Basic Workflow Structure
```yaml
name: Build and Test

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - '.github/workflows/build.yml'
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

### Docker Build and Push
```yaml
jobs:
  build-image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          platforms: linux/amd64,linux/arm64
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Python CI
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - run: pytest --cov
```

### Deploy Script Pattern
```bash
#!/bin/bash
set -e

# Validate environment
[[ -z "$DEPLOY_ENV" ]] && { echo "DEPLOY_ENV required"; exit 1; }

# Pull latest
docker compose pull

# Deploy with zero-downtime
docker compose up -d --remove-orphans

# Health check
for i in {1..30}; do
  curl -sf http://localhost:8000/health && exit 0
  sleep 2
done
echo "Health check failed" && exit 1
```

## Common Actions

| Task | Action |
|------|--------|
| Checkout | `actions/checkout@v4` |
| Node.js | `actions/setup-node@v4` |
| Python | `actions/setup-python@v5` |
| Docker buildx | `docker/setup-buildx-action@v3` |
| GHCR login | `docker/login-action@v3` |
| Image tags | `docker/metadata-action@v5` |
| Build push | `docker/build-push-action@v5` |
| Cache | `actions/cache@v4` |

## Gotchas

1. **GITHUB_TOKEN permissions:** Default is read-only, need `packages: write` for GHCR
2. **ARM64 builds slow:** Use cache-from/cache-to with GHA cache
3. **workflow_dispatch:** Add for manual triggers during debugging
4. **Conditional runs:** Use `if: github.event_name == 'push'` for deploy-only steps
