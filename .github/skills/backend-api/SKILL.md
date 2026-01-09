---
name: backend-api
description: Load when editing Python files in backend/, api/, routes/, services/, or models/ directories. Provides FastAPI and async SQLAlchemy patterns for REST API development.
---

# Backend API

## Rules
- **Endpoint→Service→Model:** No DB logic in routes
- **Always `response_model`:** Type safety + auto-docs
- **Async all the way:** `await` all I/O
- **JSONB mutations:** Use `flag_modified()`

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| DB queries in routes | Service layer |
| Missing response_model | `response_model=Schema` |
| Mutable default args | `Field(default_factory=list)` |

## Patterns

```python
# CRUD endpoint
@router.get("/{id}", response_model=ItemResponse)
async def get_item(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == id))
    if not (item := result.scalar_one_or_none()):
        raise HTTPException(404, "Not found")
    return item

# Service layer
class ItemService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db
    async def get_by_id(self, id: int) -> Item | None:
        result = await self.db.execute(select(Item).where(Item.id == id))
        return result.scalar_one_or_none()

# JSONB mutation
flag_modified(item, 'metadata')
await db.commit()
```
