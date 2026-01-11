---
name: backend-api
description: Load when editing Python files in backend/, api/, routes/, services/, models/, websocket files, or alembic/. Provides FastAPI, async SQLAlchemy, WebSocket, Authentication, and Database Migration patterns.
---

# Backend API

## Merged Skills
- **authentication**: JWT tokens, session management, OAuth flows
- **security**: Input sanitization, CORS, rate limiting, XSS/CSRF protection
- **monitoring**: Structured logging, metrics, tracing, health checks
- **websocket-realtime**: ConnectionManager, broadcast, room management

## ⚠️ Critical Gotchas
- **JSONB won't save:** Use `flag_modified(obj, 'field')` before commit
- **401 errors:** Call `logout()` from authStore for redirect
- **Alembic:** Run `alembic upgrade head` after model changes
- **WebSocket:** Always handle `WebSocketDisconnect` exception
- **Auth/JWT:** Validate tokens server-side, never trust client
- **Security:** Sanitize inputs, use parameterized queries
- **Monitoring:** Use structured logging with context

## Rules
| Rule | Pattern |
|------|---------|
| Layer separation | Endpoint→Service→Model |
| Type safety | Always `response_model=Schema` |
| Async I/O | `await` all DB/network calls |
| Auth | `Depends(get_current_user)` |
| WebSocket | Use ConnectionManager |

## Avoid
| ❌ Bad | ✅ Good |
|--------|---------|
| DB in routes | Service layer |
| Mutable defaults | `Field(default_factory=list)` |
| Missing types | `response_model=Schema` |

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

# WebSocket
@router.websocket("/ws/{id}")
async def ws_endpoint(ws: WebSocket, id: str):
    await manager.connect(ws, id)
    try:
        while True:
            data = await ws.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(id)

# JWT Auth
def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=15)
    return jwt.encode({**data, "exp": expire}, SECRET_KEY)
```

## Alembic
| Command | Purpose |
|---------|---------|
| `alembic revision --autogenerate -m "msg"` | Create migration |
| `alembic upgrade head` | Apply migrations |
| `alembic downgrade -1` | Rollback one |
