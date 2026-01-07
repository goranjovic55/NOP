# Backend API Patterns

FastAPI with async SQLAlchemy. Endpoint → Service → Model separation.

## Avoid
- ❌ Direct DB in routes → ✅ Service layer
- ❌ Missing response_model → ✅ Define schemas
- ❌ Sync I/O → ✅ async/await

## Patterns

### Basic CRUD
```python
@router.get("/{id}", response_model=ItemResponse)
async def get_item(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found")
    return item

@router.post("", response_model=ItemResponse, status_code=201)
async def create_item(data: ItemCreate, db: AsyncSession = Depends(get_db)):
    item = Item(**data.dict())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item
```

### Service Layer
```python
class ItemService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def create(self, data: ItemCreate) -> Item:
        item = Item(**data.dict())
        self.db.add(item)
        await db.commit()
        return item

@router.post("", response_model=ItemResponse)
async def create_item(data: ItemCreate, service: ItemService = Depends()):
    return await service.create(data)
```

### Pydantic Schema
```python
class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class ItemCreate(ItemBase): pass

class ItemResponse(ItemBase):
    id: int
    class Config:
        from_attributes = True
```

### POV Mode Filtering
```python
from app.middleware.agent_pov import get_agent_pov

@router.get("/endpoint")
async def endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    agent_pov = get_agent_pov(request)  # X-Agent-POV header
    if agent_pov:
        agent = await db.get(Agent, agent_pov)
        if agent and agent.agent_metadata:
            return agent.agent_metadata.get('key', [])
        return []  # NO C2 fallback in POV mode
    return get_c2_data()
```

### JSONB Persistence (flag_modified)
```python
from sqlalchemy.orm.attributes import flag_modified

# SQLAlchemy doesn't detect nested mutations
agent.agent_metadata['data'] = new_data
flag_modified(agent, 'agent_metadata')  # Mark dirty
await db.commit()
```

### INET Type Casting
```python
from sqlalchemy import cast, String

# Cast for comparison
result = await db.execute(
    select(Asset).where(cast(Asset.ip, String) == ip_string)
)
```

## Related
- `debugging.md` - API errors
- `frontend-react.md` - POV integration
