---
applyTo: "**"
---

# Quality v7.1

## After Every Edit
1. Verify syntax (no errors)
2. Check duplicates (multi-file edits)
3. Validate imports

## Error Protocol
1. READ full error/traceback
2. ANALYZE root cause (not symptoms)
3. Load debugging skill
4. PLAN fix before implementing
5. VERIFY fix resolves issue

## Checklist
□ No syntax errors | □ No duplicates | □ Imports resolve | □ Tests pass

## ⚠️ Common Gotchas

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
