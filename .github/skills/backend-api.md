# Backend API Patterns

FastAPI layered architecture with typing and dependency injection.

## When to Use
- Creating REST endpoints
- Modifying existing APIs
- Adding database operations
- Implementing CRUD operations

## Checklist
- [ ] Endpoint → Service → Model separation
- [ ] Define `response_model` for validation
- [ ] Use dependency injection for db and auth
- [ ] Request validation (Pydantic schemas)
- [ ] Type hint return values
- [ ] Async where I/O-bound

## Examples

### Basic CRUD Endpoint
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model=list[ItemResponse])
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: AsyncSession = Depends(get_db)
) -> list[ItemResponse]:
    result = await db.execute(select(Item).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("", response_model=ItemResponse, status_code=201)
async def create_item(data: ItemCreate, db: AsyncSession = Depends(get_db)):
    item = Item(**data.dict())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item
```

## Avoid
- ❌ Direct DB access in routes → ✅ Use service layer
- ❌ Missing response models → ✅ Define `response_model`
- ❌ Sync operations for I/O → ✅ Use async/await
- ❌ No dependency injection → ✅ Use `Depends()`

### Service Layer Pattern
```python
class ItemService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def create(self, data: ItemCreate) -> Item:
        item = Item(**data.dict())
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

# Endpoint uses service
@router.post("", response_model=ItemResponse)
async def create_item(data: ItemCreate, service: ItemService = Depends()):
    return await service.create(data)
```

### Pydantic Schema
```python
from pydantic import BaseModel, Field
from datetime import datetime

class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None

class ItemCreate(ItemBase):
    pass

class ItemResponse(ItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

### Agent Configuration via Metadata
**Use when:** Dynamic agent behavior without code redeployment

```python
# 1. Store config in agent_metadata (JSON field)
agent.agent_metadata = {
    "scan_subnet": "10.10.2.0/24",
    "passive_discovery": True,
    "scan_timeout": 300
}
db.commit()

# 2. Inject into agent template
config_repr = repr(agent.agent_metadata)
agent_code = f'''CONFIG = {config_repr}

class Agent:
    def __init__(self):
        self.config = CONFIG
    
    def discover(self):
        subnet = self.config.get("scan_subnet", "192.168.1.0/24")
'''

# 3. Agent reads at runtime (no redeployment needed)
```

### WebSocket State Persistence
**Use when:** Real-time data needs REST API access

```python
# WebSocket handler - receive ephemeral data
@router.websocket("/ws/agent/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str, db: AsyncSession):
    data = await websocket.receive_json()
    
    if data["type"] == "host_data":
        # Store in persistent database field
        agent = await db.get(Agent, agent_id)
        agent.agent_metadata["host_info"] = data["data"]
        await db.commit()

# REST endpoint - query persistent data
@router.get("/interfaces")
async def get_interfaces(agent_pov: str | None, db: AsyncSession):
    if agent_pov:
        agent = await db.get(Agent, agent_pov)
        return agent.agent_metadata.get("host_info", {}).get("interfaces", [])
    # ... C2 interfaces
```

### Database INET Type Casting
**Use when:** Querying PostgreSQL network types (INET, CIDR)

```python
from sqlalchemy import cast, String
from sqlalchemy.dialects.postgresql import INET

# ❌ WRONG - Type mismatch error
result = await db.execute(
    select(Asset).where(Asset.ip == ip_string)
)

# ✅ CORRECT - Cast for comparison
result = await db.execute(
    select(Asset).where(cast(Asset.ip, String) == ip_string)
)
# OR cast input
result = await db.execute(
    select(Asset).where(Asset.ip == cast(ip_string, INET))
)
```

## Related Skills
- `debugging.md` - Troubleshooting endpoints
- `frontend-react.md` - API integration patterns
