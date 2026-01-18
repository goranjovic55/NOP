---
applyTo: '**'
description: 'Quality checks and common gotchas. Verification steps and error protocol.'
---

# Quality

> Based on 100k simulation: Check gotchas FIRST for 75% debug acceleration

## When This Applies
- After every code edit
- When encountering errors
- Before committing changes

## After Every Edit
1. Verify syntax (no errors)
2. Check duplicates (multi-file edits)
3. Validate imports

## Error Protocol
1. **CHECK gotchas table FIRST** (75% are known issues)
2. READ full error/traceback
3. ANALYZE root cause (not symptoms)
4. Load debugging skill
5. PLAN fix before implementing
6. VERIFY fix resolves issue
7. DOCUMENT root cause in workflow log

## Checklist
□ No syntax errors | □ No duplicates | □ Imports resolve | □ Tests pass

## ⚠️ Common Gotchas (from 141 workflow logs - top 30 kept)

| Category | Pattern | Solution |
|----------|---------|----------|
| API | 307 redirect on POST | Add trailing slash to URL |
| API | 401 on valid token | Check auth headers, token expiry |
| State | Persisted state stale | Version storage key, clear cache |
| State | Nested object not updating | Use immutable update or flag_modified |
| Build | Changes not visible | Rebuild with `--no-cache` |
| Build | Container old code | Use `--build --force-recreate` |
| Syntax | JSX comment error | Use `{/* */}` not `//` in JSX |
| CSS | Element hidden | Check z-index, overflow, position |
| Scripts | Parse fails | Create log BEFORE running scripts |
| Workflow | END scripts fail | Create workflow log FIRST |
| Frontend | Dropdown flickering | Memoize options with useMemo |
| Frontend | Black screen | Add error boundary/try-catch |
| Terminal | Line wrapping corrupts | Limit line length, handle overflow |
| Undo/Redo | Deep state breaks | Use immutable update patterns |
| Credentials | Params missing | Validate block config completeness |
| Auth | localStorage returns null | Check `nop-auth` key, not `auth_token` |
| State | React state stale in async | Use callback/ref patterns |
| State | ConfigPanel save lost | Persist to backend, not just Zustand |
| Mock | Block executor mock data | Check mock vs real implementation |
| JSONB | Nested object not updating | Use `flag_modified()` after update |
| Workflow | Progress stuck at 3/4 | Set 100% on `execution_completed` event |
| Workflow | Black screen on switch | Call `reset()` to clear execution state |
| Context | Connection menu hidden | Check DOM ordering, z-index, pointer-events |
| Cache | Same skill reloaded | Load skill ONCE per domain, cache list |
| JS | Empty object {} is truthy | Use `Object.keys(obj).length > 0` check |
| WebSocket | execution_completed missing state | Include nodeStatuses in WS completion event |
| Delegation | Context pollution in implementation | Use artifact-based handoffs (max 500 tokens) |
| Delegation | Agent gets full planning history | Pass structured artifact, not conversation |
| Delegation | High cognitive load in complex tasks | Enable context isolation, clean starts |
