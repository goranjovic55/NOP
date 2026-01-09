---
name: ci-cd
description: Load when editing .github/workflows/*.yml files, deploy scripts, or managing GitHub Actions pipelines. Provides workflow patterns for build, test, and deploy automation.
---

# CI/CD

## Rules
- **Path filters:** Use `paths:` to skip unnecessary runs
- **Permissions:** Minimal `permissions:` block
- **Secrets:** `${{ secrets.* }}`, never hardcode
- **Caching:** `actions/cache` for deps

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| No paths filter | Add `paths:` |
| No permissions | `permissions:` block |
| Hardcoded creds | `${{ secrets.TOKEN }}` |

## Pattern

```yaml
on:
  push:
    branches: [main]
    paths: ['src/**', '.github/workflows/*.yml']
permissions:
  contents: read
  packages: write

# Docker multi-arch
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
    cache-from: type=gha
```
