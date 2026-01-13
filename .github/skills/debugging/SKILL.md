---
name: debugging
description: Load when encountering errors, tracebacks, or investigating bugs. Provides systematic debugging patterns and common gotchas from 131 workflow logs.
---

# Debugging Skill

## ⚠️ Critical Gotchas (from 131 logs)

| Category | Pattern | Solution |
|----------|---------|----------|
| API | 307 redirect on POST | Add trailing slash to URL |
| API | 401 on valid token | Check auth headers, token expiry |
| Auth | localStorage returns null | Check `nop-auth` key, not `auth_token` |
| State | Persisted state stale | Version storage key, clear cache |
| State | Nested object not updating | Use immutable update or flag_modified |
| State | React state stale in async | Use callback/ref patterns |
| State | ConfigPanel save lost | Persist to backend, not just Zustand |
| Build | Changes not visible | Rebuild with `--no-cache` |
| Build | Container old code | Use `--build --force-recreate` |
| Syntax | JSX comment error | Use `{/* */}` not `//` in JSX |
| CSS | Element hidden | Check z-index, overflow, position |
| Frontend | Dropdown flickering | Memoize options with useMemo |
| Frontend | Black screen | Add error boundary/try-catch |
| Mock | Block executor mock data | Check mock vs real implementation |
| JSONB | Nested object not updating | Use `flag_modified()` after update |
| Workflow | Progress stuck at 3/4 | Set 100% on `execution_completed` event |
| Workflow | Black screen on switch | Call `reset()` to clear execution state |
| Context | Connection menu hidden | Check DOM ordering, z-index, pointer-events |
| Cache | Same skill reloaded | Load skill ONCE per domain, cache list |
| Scripts | Parse fails | Create log BEFORE running scripts |
| Workflow | END scripts fail | Create workflow log FIRST |
| Terminal | Line wrapping corrupts | Limit line length, handle overflow |
| Undo/Redo | Deep state breaks | Use immutable update patterns |
| Credentials | Params missing | Validate block config completeness |

## Debug Protocol

1. **CHECK gotchas table FIRST** (75% are known issues)
2. READ full error/traceback
3. ANALYZE root cause (not symptoms)
4. PLAN fix before implementing
5. VERIFY fix resolves issue
6. DOCUMENT in workflow log

## Common Patterns

| Error Type | First Check |
|------------|-------------|
| 401/403 | Auth token, headers, expiry |
| 307 redirect | Missing trailing slash |
| Black screen | Error boundary, console errors |
| State not updating | Immutable patterns, flag_modified |
| Changes not visible | Container rebuild |

## Commands

| Issue | Command |
|-------|---------|
| Backend logs | `docker compose logs -f backend` |
| Frontend logs | `docker compose logs -f frontend` |
| Rebuild | `docker compose build --no-cache` |
| Full reset | `docker compose down && docker compose up -d --build` |
