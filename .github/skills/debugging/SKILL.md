---
name: debugging
description: Load when encountering errors, exceptions, tracebacks, bugs, or failed operations. Provides systematic troubleshooting methodology for build, runtime, and infrastructure issues.
---

# Debugging

> 100k simulation: Check gotchas FIRST for 75% debug acceleration

## ⚠️ Critical Gotchas

| Category | Pattern | Solution |
|----------|---------|----------|
| Docker | restart ≠ rebuild | Code changes need `--build` |
| Docker | Container old code | `docker compose up -d --build --force-recreate` |
| API | 307 redirect | Add trailing slash to POST URLs |
| API | 401 Unauthorized | Check token, POV headers, authStore |
| State | JSONB not saving | Use `flag_modified(obj, 'field')` |
| State | Persisted stale | Clear localStorage, version key |
| Frontend | Component not updating | Check selector, use shallow compare |
| CSS | Element invisible | Check z-index, overflow, parent |
| Build | JSX syntax error | Use `{/* */}` for comments |

## Session Gotchas (from workflow logs)

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| END scripts not reading data | Scripts ran before workflow log | Create log FIRST |
| Dropdown flickering | Re-render on every state change | Memoize options |
| Black screen on click | Missing error boundary | Add try/catch |
| Terminal line wrapping | Buffer overflow | Limit line length |
| Credential params missing | Block config incomplete | Add validation |
| Undo/redo broken | Deep state mutation | Use immutable update |

## Process
1. **CHECK** gotchas table FIRST (75% are known issues)
2. **READ** error completely
3. **IDENTIFY** type (build/runtime/network/type)
4. **LOCATE** source (file:line)
5. **FIX** with targeted change
6. **VERIFY** error resolved
7. **DOCUMENT** root cause in workflow log

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Ignoring stack trace | Read every line |
| Random changes | Targeted fix |
| "It works now" | Understand why |

## Quick Fixes

```bash
# Container issues (MOST COMMON)
docker logs container-name --tail 50
docker compose up -d --build --force-recreate backend

# Python
python -m py_compile file.py   # Syntax check
pip list | grep package        # Check installed

# Port conflict
lsof -i :8000 && kill <PID>
```

```python
# Null safety
value = data.get('property', 'default')

# JSONB not saving?
flag_modified(item, 'metadata')
await db.commit()
```
