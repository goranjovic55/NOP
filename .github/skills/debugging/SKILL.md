---
name: debugging
description: Load when encountering errors, exceptions, tracebacks, failed operations, or needing to debug any issue
triggers: ["error", "exception", "traceback", "failed", "bug", "fix", "debug"]
---

# Debugging

## When to Use
Load this skill when: encountering any error, debugging issues, fixing bugs, analyzing tracebacks.

Systematic troubleshooting for build, runtime, and infrastructure errors. Applies to any project.

## Critical Rules

- **Read the full error:** Stack trace has the answer
- **Isolate first:** Find the smallest reproducing case
- **Verify the fix:** Always confirm the error is gone
- **Document findings:** Add to skill if pattern repeats

## Process

```
1. READ error message completely
2. IDENTIFY error type (build/runtime/network/type)
3. LOCATE source (file:line or component)
4. ISOLATE minimum reproduction
5. FIX with targeted change
6. VERIFY error is resolved
```

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Ignoring stack trace | Read every line |
| Random changes | Targeted fix |
| "It works now" | Understand why |
| No verification | Reproduce and confirm |

## Patterns by Error Type

### Build/Compile Errors

**TypeScript/JavaScript:**
```bash
# Module not found
npm ls package-name        # Is it installed?
npm install package-name   # Install if missing

# Type error - check imports, ensure types match
import { Type } from './types';
```

**Python:**
```bash
# Import error
pip list | grep package    # Check installed
pip install package        # Install

# Syntax error
python -m py_compile file.py  # Validate syntax
```

### Runtime Errors

**Backend 500 Error:**
```bash
# 1. Check logs
docker compose logs backend --tail 100

# 2. Enable debug mode
LOG_LEVEL=DEBUG docker compose up backend

# 3. Test endpoint directly
curl -v http://localhost:8000/endpoint
```

**Frontend Crash:**
```typescript
// Null/undefined access
const value = data?.property ?? 'default';

// Type guard
if (data && 'property' in data) {
  // safe to access data.property
}

// Try-catch for async
try {
  const result = await fetchData();
} catch (error) {
  console.error('Fetch failed:', error);
  return fallbackValue;
}
```

### Container Issues

```bash
# Won't start - check logs first
docker logs container-name --tail 50

# Port conflict
lsof -i :8000
kill <PID>  # or change port

# Out of memory
docker stats container-name
# Increase memory limit or optimize app

# Permission denied
docker exec container-name ls -la /path
```

### Database Errors

```python
# Connection refused - check container running
docker compose ps db
docker compose logs db

# Deadlock - use proper locking
await db.execute(query.with_for_update(skip_locked=True))
```

### Network Errors

```bash
# DNS resolution inside container
docker exec container curl http://service-name:8000

# Connection refused - is service running?
docker compose ps
netstat -tlnp | grep 8000

# CORS error - check backend config
# Verify allowed origins include frontend URL
```

### Type Errors

**TypeScript:**
```typescript
// Type assertion (when you know better)
const user = data as User;

// Type guard (runtime check)
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'email' in obj;
}

// Discriminated union
type Result = { ok: true; data: Data } | { ok: false; error: Error };
```

**Python:**
```python
# Type hints
def process(data: dict[str, Any]) -> list[str]:
    return list(data.keys())

# Runtime type check
if isinstance(value, str):
    # safe string operations
```

## Quick Fixes

| Symptom | Quick Check | Fix |
|---------|-------------|-----|
| Module not found | `npm ls` / `pip list` | Install missing |
| 500 error | `docker logs` | Check stack trace |
| Port in use | `lsof -i :PORT` | Kill or change port |
| Code not updating | Container cache | Restart container |
| Null reference | Missing data | Add `?.` or guard |
| CORS error | Backend config | Add origin to allowed |
| Auth failed | Token/credentials | Check expiry, refresh |

## Logging

```python
# Python - structured logging
import logging
logger = logging.getLogger(__name__)

logger.debug("Processing", extra={"item_id": item.id})
logger.error("Failed", exc_info=True)
```

```typescript
// TypeScript
console.debug('Debug info:', data);
console.error('Error:', error);
console.table(arrayData);  // Formatted table
```
