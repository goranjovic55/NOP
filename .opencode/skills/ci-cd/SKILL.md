---
name: ci-cd
description: GitHub Actions, CI/CD pipelines, and deployment automation. Load when working with workflows or deployment configuration.
---

# CI/CD

## GitHub Actions Patterns

```yaml
# Pattern 1: Basic workflow
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest

# Pattern 2: Docker build and push
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:latest

# Pattern 3: Matrix testing
  test:
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
```

## Workflow Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Continuous Integration |
| `.github/workflows/cd.yml` | Continuous Deployment |
| `.github/workflows/release.yml` | Release automation |

## Secrets Management

| Secret | Usage |
|--------|-------|
| `GITHUB_TOKEN` | Auto-provided, repo access |
| `DOCKER_USERNAME` | Container registry auth |
| `DOCKER_PASSWORD` | Container registry auth |
| `DEPLOY_KEY` | SSH key for deployment |

## Rules

| Rule | Requirement |
|------|-------------|
| Secrets | Never hardcode, use GitHub Secrets |
| Caching | Use actions/cache for dependencies |
| Matrix | Test multiple versions when possible |
| Artifacts | Upload build artifacts for debugging |
| Timeouts | Set job timeouts to prevent hanging |

## Gotchas

| Category | Pattern | Solution |
|----------|---------|----------|
| Permissions | Workflow can't push | Add `contents: write` permission |
| Secrets | Not available in forks | Use environment protection rules |
| Cache | Stale dependencies | Include lockfile hash in cache key |
| Docker | Build fails | Check Dockerfile context path |
