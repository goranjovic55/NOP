---
name: websocket-realtime
description: Load when implementing WebSocket, real-time updates, or bidirectional communication. Provides patterns for live data streaming.
---

# WebSocket & Real-Time

> Bidirectional communication and live updates

## When This Applies
- WebSocket connections
- Real-time notifications
- Live data streaming
- Chat functionality
- Collaborative editing

## WebSocket Lifecycle

| Phase | Action |
|-------|--------|
| Connect | Establish connection, authenticate |
| Subscribe | Join rooms/channels |
| Message | Send/receive events |
| Reconnect | Handle disconnections gracefully |
| Disconnect | Cleanup resources |

## Backend (FastAPI)

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        self.active_connections[room].append(websocket)
    
    def disconnect(self, websocket: WebSocket, room: str):
        self.active_connections[room].remove(websocket)
    
    async def broadcast(self, message: dict, room: str):
        for connection in self.active_connections.get(room, []):
            try:
                await connection.send_json(message)
            except Exception:
                # Handle disconnected clients
                pass

manager = ConnectionManager()

@app.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str):
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(data, room)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
```

## Frontend (React)

```typescript
const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number>();

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3s
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };
    
    setSocket(ws);
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket?.close();
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }, [socket]);

  return { socket, isConnected, send };
};
```

## Event Patterns

| Event Type | Example |
|------------|---------|
| State sync | `{type: 'state_update', data: {...}}` |
| Notification | `{type: 'notification', message: '...'}` |
| Error | `{type: 'error', code: 500, message: '...'}` |
| Heartbeat | `{type: 'ping'}` / `{type: 'pong'}` |

## Gotchas

| Issue | Solution |
|-------|----------|
| Connection drops | Implement auto-reconnect with exponential backoff |
| Message loss | Add message queuing, acknowledgments |
| Memory leak | Cleanup event listeners, close connections |
| Scalability | Use Redis pub/sub for multi-server |
| Authentication | Validate token on connection, not just HTTP |

## Scaling Patterns

```python
# Redis pub/sub for multi-server
import aioredis

class RedisConnectionManager:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url)
        self.pubsub = self.redis.pubsub()
    
    async def subscribe(self, room: str):
        await self.pubsub.subscribe(f"room:{room}")
    
    async def publish(self, room: str, message: dict):
        await self.redis.publish(
            f"room:{room}",
            json.dumps(message)
        )
    
    async def listen(self):
        async for message in self.pubsub.listen():
            if message['type'] == 'message':
                yield json.loads(message['data'])
```

## Performance Tips
- Batch messages when possible
- Use binary frames for large data
- Implement heartbeat to detect dead connections
- Add rate limiting per connection
- Compress messages if >1KB

## Testing
- Test reconnection scenarios
- Test multiple concurrent connections
- Test message ordering
- Load test with many clients
- Test network interruptions

## Security
- Validate origin header
- Authenticate on connection
- Rate limit messages per connection
- Validate message format/size
- Use WSS (WebSocket Secure) in production
