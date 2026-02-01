---
description: Quick debug helper - check gotchas first, then trace the issue
---

Debug the issue: $ARGUMENTS

## Step 1: Check Known Gotchas

First, check if this is a known issue from project_knowledge.json:

Common gotchas to check:
| Category | Pattern | Solution |
|----------|---------|----------|
| JSONB | Nested object won't save | Use `flag_modified(obj, 'field')` |
| API | 307 redirect on POST | Add trailing slash to URL |
| Auth | 401 on valid token | Check `nop-auth` key, token expiry |
| State | React state stale in async | Capture state before async |
| JSX | Comment syntax error | Use `{/* */}` not `//` |
| Docker | Old code in container | Use `--build --force-recreate` |

## Step 2: If Not a Known Issue

1. Read the full error/traceback
2. Identify the root cause (not symptoms)
3. Plan the fix before implementing
4. Make minimal changes
5. Verify the fix works

Use @debugger for complex issues.
