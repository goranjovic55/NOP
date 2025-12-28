# Build

**Usage**: `/build [target]` | **Targets**: all, backend, frontend, docker

## Auto-Detect
| File | Command |
|------|---------|
| `package.json` | `npm ci && npm run build` |
| `requirements.txt` | `pip install -r requirements.txt` |
| `go.mod` | `go build ./...` |
| `Dockerfile` | `docker build .` |
| `docker-compose.yml` | `docker-compose build` |

## Steps
```bash
# 1. Install deps
# 2. Lint
# 3. Type check
# 4. Test
# 5. Build
```

## Success
- ✅ No errors
- ✅ Tests pass
- ✅ Build completes
