---
name: backend-api
description: .py, backend/, api/ - FastAPI/async SQLAlchemy
---
# Backend API

## ⚠️ Critical
- **Endpoint → Service → Model** (no DB in routes)
- Always use `response_model=Schema`
- `flag_modified()` for JSONB changes

## ❌ Bad → ✅ Good
| Bad | Good |
|-----|------|
| DB in routes | Service layer |
| Sync in async | `await` all |
| Hardcoded secrets | Env vars |

## Patterns
```python
# CRUD endpoint
@router.get("/{id}", response_model=ItemResponse)
async def get_item(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == id))
    item = result.scalar_one_or_none()
    if not item: raise HTTPException(404, "Not found")
    return item

# JSONB update
from sqlalchemy.orm.attributes import flag_modified
item.metadata['key'] = value
flag_modified(item, 'metadata')
await db.commit()
```

## Errors
| Error | Fix |
|-------|-----|
| 422 Unprocessable | Check request body |
| JSONB not saved | Call `flag_modified()` |
| N+1 queries | Use `selectinload()` |
