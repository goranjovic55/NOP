---
name: backend-api
description: Load when editing Python files in backend/, api/, routes/, services/, models/, websocket files, or alembic/. Provides FastAPI, async SQLAlchemy, WebSocket, Authentication, and Database Migration patterns.
---

# Backend API

## Merged Skills
- **websocket-realtime**: Real-time WebSocket patterns, ConnectionManager
- **authentication**: JWT, OAuth, session management
- **database-migration**: Alembic migrations, schema changes

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

# Authentication (JWT)
from jose import jwt, JWTError
from datetime import datetime, timedelta

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if (user_id := payload.get("sub")) is None:
            raise HTTPException(401, "Invalid token")
        return await get_user(user_id)
    except JWTError:
        raise HTTPException(401, "Token expired")

# Optional auth (for public endpoints that can be authenticated)
async def get_optional_user(token: str = Depends(oauth2_scheme_optional)):
    if not token:
        return None
    return await get_current_user(token)

# Database Migration (Alembic)
# alembic revision --autogenerate -m "Add column"
# alembic upgrade head
# alembic downgrade -1
```

## Alembic Commands

| Command | Purpose |
|---------|---------||
| `alembic revision --autogenerate -m "msg"` | Create migration from model changes |
| `alembic upgrade head` | Apply all pending migrations |
| `alembic downgrade -1` | Rollback one migration |
| `alembic history` | Show migration history |
