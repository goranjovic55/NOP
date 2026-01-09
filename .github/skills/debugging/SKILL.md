---
name: debugging
description: Load when encountering errors, exceptions, tracebacks, bugs, or failed operations. Provides systematic troubleshooting methodology for build, runtime, and infrastructure issues.
---

# Debugging

## ⚠️ Critical Gotchas
- **Docker restart ≠ rebuild:** Code changes need `--build`
- **Container old code:** Use `docker compose up -d --build --force-recreate`
- **Frontend 401:** Check authStore logout(), not API

## Process
1. **READ** error completely
2. **IDENTIFY** type (build/runtime/network/type)
3. **LOCATE** source (file:line)
4. **FIX** with targeted change
5. **VERIFY** error resolved

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
