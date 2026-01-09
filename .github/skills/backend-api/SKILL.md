---
name: backend-api
description: Load when editing .py files in backend/, api/, routes/, endpoints/ directories for FastAPI/async SQLAlchemy patterns
triggers: [".py", "backend/", "api/", "routes/", "endpoints/", "services/", "models/"]
---

# Backend API Patterns

## When to Use
Load this skill when: editing Python files in backend/, creating API endpoints, working with FastAPI or SQLAlchemy.

FastAPI with async SQLAlchemy. Applicable to any Python REST API project.

## Critical Rules

- **Endpoint → Service → Model:** Never put DB logic in routes
- **Always use response_model:** Type safety and auto-documentation
- **Async all the way:** Don't mix sync I/O in async endpoints
- **Flag modified for JSONB:** SQLAlchemy doesn't detect nested changes

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| DB queries in routes | Service layer |
| Missing response_model | `response_model=Schema` |
| Sync I/O in async | `await` all operations |
| Mutable default args | `Field(default_factory=list)` |
| Hardcoded secrets | Environment variables |

## Patterns

### Basic CRUD Endpoints
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter(prefix="/items", tags=["items"])

@router.get("/{id}", response_model=ItemResponse)
async def get_item(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("", response_model=ItemResponse, status_code=201)
async def create_item(data: ItemCreate, db: AsyncSession = Depends(get_db)):
    item = Item(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/{id}", status_code=204)
async def delete_item(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
```

### Service Layer Pattern
```python
class ItemService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def get_by_id(self, id: int) -> Item | None:
        result = await self.db.execute(select(Item).where(Item.id == id))
        return result.scalar_one_or_none()

    async def create(self, data: ItemCreate) -> Item:
        item = Item(**data.model_dump())
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

# Usage in route
@router.post("", response_model=ItemResponse)
async def create_item(data: ItemCreate, service: ItemService = Depends()):
    return await service.create(data)
```

### Pydantic Schemas (v2)
```python
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class ItemResponse(ItemBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
```

### JSONB Mutations (flag_modified)
```python
from sqlalchemy.orm.attributes import flag_modified

# SQLAlchemy doesn't detect nested dict/list mutations
item.metadata['key'] = new_value
flag_modified(item, 'metadata')  # Mark as dirty
await db.commit()
```

### Query with Filters
```python
@router.get("", response_model=list[ItemResponse])
async def list_items(
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    query = select(Item)
    
    if status:
        query = query.where(Item.status == status)
    if search:
        query = query.where(Item.name.ilike(f"%{search}%"))
    
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()
```

### Background Tasks
```python
from fastapi import BackgroundTasks

async def send_notification(email: str, message: str):
    await async_email_send(email, message)

@router.post("/notify")
async def notify(email: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_notification, email, "Hello!")
    return {"status": "queued"}
```

### WebSocket Endpoint (Full Lifecycle)
```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict

# Track active connections
active_connections: Dict[str, WebSocket] = {}

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    # Validate credentials before accepting
    if not await validate_client(client_id):
        await websocket.close(code=4001)
        return
    
    await websocket.accept()
    active_connections[client_id] = websocket
    logger.info(f"Client {client_id} connected. Total: {len(active_connections)}")
    
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({"echo": data})
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    finally:
        # Always cleanup - use try/finally for resource cleanup
        active_connections.pop(client_id, None)
        logger.info(f"Client {client_id} cleaned up. Total: {len(active_connections)}")
```

## Development Checklist

- [ ] Track connections/clients by ID
- [ ] Type hint return values  
- [ ] Use async/await for all I/O operations
- [ ] Use try/finally for resource cleanup
- [ ] Validate credentials before accepting connections
- [ ] Log all API requests in debug mode

## Debugging Workflow

```bash
# 1. Check container logs first
docker compose logs -f backend

# 2. Test endpoint with curl
curl -X GET http://localhost:8000/api/v1/items | jq
curl -X POST http://localhost:8000/api/v1/items \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'

# 3. Check request/response in container
docker exec -it backend cat /var/log/app.log
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `422 Unprocessable Entity` | Schema validation failed | Check request body |
| `404 Not Found` | Wrong route or missing item | Verify URL and ID |
| `RuntimeError: attached to different loop` | Sync in async | Use async driver |
| JSONB changes not saved | Missing flag_modified | Call `flag_modified()` |
| Circular import | Cross-module imports | Import inside function |
| N+1 queries | Missing eager load | Use `selectinload()` |
| WebSocket drops silently | No heartbeat/ping | Add ping/pong mechanism |

## Fullstack Integration

**When working with frontend (54% co-occurrence):**

```python
# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response model matches frontend interface
class ItemResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
```

**When working with Docker (56% co-occurrence):**

```bash
# Backend container restart workflow
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml logs -f backend

# Test endpoint from host
curl http://localhost:8000/api/v1/health | jq
```

**See also:** `frontend-react/SKILL.md` (API calls), `docker/SKILL.md` (container workflow)
