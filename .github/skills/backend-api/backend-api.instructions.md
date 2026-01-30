---
applyTo: 'backend/**/*.py,api/**/*.py,services/**/*.py,models/**/*.py'
description: 'Backend API development patterns for FastAPI, async SQLAlchemy, WebSocket, and database operations.'
---

# Backend API Instructions

> Extends main skill from `.github/skills/backend-api/SKILL.md`

## When This Applies
- Editing Python files in `backend/`, `api/`, `services/`, `models/`
- Creating new API endpoints
- Working with database models or migrations
- Implementing WebSocket handlers

## Quick Patterns

### CRUD Endpoint
```python
@router.get("/{id}", response_model=ItemResponse)
async def get_item(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == id))
    if not (item := result.scalar_one_or_none()):
        raise HTTPException(404, "Not found")
    return item
```

### JSONB Mutation (⚠️ CRITICAL)
```python
from sqlalchemy.orm.attributes import flag_modified

agent.agent_metadata['key'] = value
flag_modified(agent, 'agent_metadata')  # REQUIRED for nested updates
await db.commit()
```

### Service Layer
```python
class ItemService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, data: ItemCreate) -> Item:
        item = Item(**data.dict())
        self.db.add(item)
        await self.db.commit()
        return item
```

## Validation

Run before committing:
```bash
python .github/skills/backend-api/scripts/validate.py
```

## ⚠️ Gotchas

| Issue | Solution |
|-------|----------|
| JSONB not saving | Use `flag_modified()` after nested update |
| 401 on valid token | Check token expiry, refresh if needed |
| Sync in async | Always `await` database operations |
| Missing types | Add `response_model=Schema` to endpoints |
