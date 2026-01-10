---
name: backend-api
description: Load when editing Python files in backend/, api/, routes/, services/, models/, or websocket files. Provides FastAPI, async SQLAlchemy, and WebSocket patterns.
---

# Backend API

## ⚠️ Critical Gotchas
- **JSONB won't save:** Use `flag_modified(obj, 'field')` before commit
- **401 on frontend:** Call `logout()` from authStore to trigger app redirect
- **Missing import:** json module often forgotten in services
- **Auth tokens:** Always validate JWT expiry before trusting claims
- **Alembic migrations:** Run `alembic upgrade head` after model changes
- **WebSocket disconnect:** Always handle `WebSocketDisconnect` exception

## Rules
- **Endpoint→Service→Model:** No DB logic in routes
- **Always `response_model`:** Type safety + auto-docs
- **Async all the way:** `await` all I/O
- **Auth patterns:** Use `Depends(get_current_user)` for protected routes
- **WebSocket:** Use ConnectionManager for multi-client broadcast

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

# JSONB mutation (CRITICAL)
flag_modified(item, 'metadata')
await db.commit()

# WebSocket with ConnectionManager
class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
    
    async def connect(self, ws: WebSocket, client_id: str):
        await ws.accept()
        self.connections[client_id] = ws
    
    async def broadcast(self, message: dict):
        for ws in self.connections.values():
            await ws.send_json(message)

@router.websocket("/ws/{execution_id}")
async def execution_ws(ws: WebSocket, execution_id: str):
    await manager.connect(ws, execution_id)
    try:
        while True:
            data = await ws.receive_json()
            # Handle incoming messages
    except WebSocketDisconnect:
        manager.disconnect(execution_id)
```
