---
name: debugging
description: Load when encountering errors, exceptions, tracebacks, bugs, or failed operations. Provides systematic troubleshooting methodology for build, runtime, and infrastructure issues.
---

# Debugging

## Process
1. **READ** error completely
2. **IDENTIFY** type (build/runtime/network/type)
3. **LOCATE** source (file:line)
4. **ISOLATE** minimum reproduction
5. **FIX** with targeted change
6. **VERIFY** error resolved

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Ignoring stack trace | Read every line |
| Random changes | Targeted fix |
| "It works now" | Understand why |

## Quick Fixes

```bash
# Container issues
docker logs container-name --tail 50
docker exec container-name cat /path/to/file

# Python
python -m py_compile file.py   # Syntax check
pip list | grep package        # Check installed

# Port conflict
lsof -i :8000 && kill <PID>
```

```python
# Null safety
value = data.get('property', 'default')

# Type guard
if data and 'property' in data:
    # safe access
```
