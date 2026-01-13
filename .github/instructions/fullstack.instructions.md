---
applyTo: "**"
---

# Fullstack Sessions v1.0

> Based on 100k simulation: 65.6% of sessions are fullstack

## Pre-Load Skills
When editing both frontend + backend:
```
frontend-react ⭐ + backend-api ⭐
```

## Coordination Checklist
1. **API Changes** → Update types → Update UI → Test
2. **Database Schema** → Run migration → Update models → Update API → Update frontend
3. **New Feature** → Plan → Backend service → API endpoint → Frontend component → Integration test

## Common Patterns

| Change Type | Order | Skills |
|-------------|-------|--------|
| New endpoint | Backend → Frontend | backend-api, frontend-react |
| UI update | Frontend → Backend (if API needed) | frontend-react, backend-api |
| Bug fix | Debug → Fix → Test | debugging, testing |
| Schema change | Migration → Model → API → UI | backend-api, frontend-react |

## Gotchas

| Issue | Solution |
|-------|----------|
| 307 redirect on POST | Add trailing slash to URL |
| CORS errors | Check FastAPI CORS config |
| State not syncing | Use WebSocket or polling |
| Type mismatch | Regenerate TypeScript types |

## Verification
After fullstack changes:
1. Check API response (backend logs)
2. Check network tab (frontend)
3. Test end-to-end flow
4. Verify state persistence

## Token Optimization
- Use domain_index for O(1) file lookup
- Check hot_cache before reading files
- Batch related edits together
