---
applyTo: "**"
---

# Quality v7.2

> Based on 100k simulation: Check gotchas FIRST for 75% debug acceleration

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

## ⚠️ Common Gotchas (from 128 workflow logs)

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
