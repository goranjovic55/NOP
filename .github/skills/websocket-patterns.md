# WebSocket Patterns

Patterns for WebSocket connection management, reconnection, and real-time message handling.

## When to Use

- Real-time data streaming features (traffic monitoring, logs)
- Live updates (scan progress, packet capture)
- Bidirectional communication requirements
- Long-polling replacement scenarios

## Checklist

- [ ] Connection lifecycle handlers (open, message, close, error)
- [ ] Automatic reconnection with exponential backoff
- [ ] Message buffering during disconnection
- [ ] Cleanup on component unmount
- [ ] Connection state tracking in UI
- [ ] Heartbeat/ping mechanism for connection health

## Examples

### React WebSocket Hook
```typescript
import { useEffect, useRef, useCallback, useState } from 'react';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectCountRef.current = 0;
      onOpen?.();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastMessage(data);
      onMessage?.(data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      onClose?.();
      
      // Attempt reconnection with exponential backoff
      if (reconnectCountRef.current < reconnectAttempts) {
        const delay = reconnectInterval * Math.pow(2, reconnectCountRef.current);
        reconnectCountRef.current++;
        setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      onError?.(error);
    };
  }, [url, onMessage, onOpen, onClose, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    reconnectCountRef.current = reconnectAttempts; // Prevent reconnection
    wsRef.current?.close();
  }, [reconnectAttempts]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, lastMessage, send, reconnect: connect, disconnect };
}

// Usage
function TrafficMonitor() {
  const { isConnected, lastMessage } = useWebSocket({
    url: `ws://localhost:8000/api/ws/traffic`,
    onMessage: (data) => {
      console.log('Received packet:', data);
    },
  });

  return (
    <div>
      Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      {lastMessage && <pre>{JSON.stringify(lastMessage)}</pre>}
    </div>
  );
}
```

### FastAPI WebSocket Server
```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, Set[str]] = {}  # topic -> client_ids

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        # Clean up subscriptions
        for topic in self.subscriptions.values():
            topic.discard(client_id)

    async def send_personal(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)

    async def broadcast(self, topic: str, message: dict):
        if topic in self.subscriptions:
            for client_id in self.subscriptions[topic]:
                await self.send_personal(client_id, message)

manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "subscribe":
                topic = data.get("topic")
                manager.subscriptions.setdefault(topic, set()).add(client_id)
            elif data.get("type") == "unsubscribe":
                topic = data.get("topic")
                manager.subscriptions.get(topic, set()).discard(client_id)
            elif data.get("type") == "ping":
                await manager.send_personal(client_id, {"type": "pong"})
            else:
                # Echo or process message
                await manager.send_personal(client_id, {"received": data})
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
```

### Message Buffering During Disconnection
```typescript
class BufferedWebSocket {
  private ws: WebSocket | null = null;
  private messageBuffer: any[] = [];
  private maxBufferSize = 100;

  connect(url: string) {
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      // Flush buffer on reconnection
      while (this.messageBuffer.length > 0) {
        const msg = this.messageBuffer.shift();
        this.ws?.send(JSON.stringify(msg));
      }
    };
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Buffer message for later
      if (this.messageBuffer.length < this.maxBufferSize) {
        this.messageBuffer.push(data);
      }
    }
  }
}
```

### Connection State Indicator Component
```tsx
interface ConnectionStatusProps {
  isConnected: boolean;
  lastError?: string;
}

function ConnectionStatus({ isConnected, lastError }: ConnectionStatusProps) {
  return (
    <div className={`flex items-center gap-2 ${
      isConnected ? 'text-green-400' : 'text-red-400'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
      }`} />
      <span className="text-xs">
        {isConnected ? 'Live' : lastError || 'Disconnected'}
      </span>
    </div>
  );
}
```

## Anti-Patterns

- ❌ No cleanup on unmount → ✅ Always close WebSocket in useEffect return
- ❌ Infinite reconnection attempts → ✅ Use max attempts with exponential backoff
- ❌ Sending while disconnected silently fails → ✅ Buffer or queue messages
- ❌ No connection state in UI → ✅ Show clear connected/disconnected indicator
- ❌ Parsing messages without try-catch → ✅ Handle malformed messages gracefully

## Related

- `frontend-react` - React component patterns
- `backend-api` - Backend API patterns
- `cleanup-patterns` - Resource cleanup patterns

---
*Created: 2026-01-03*
*Priority: High*
*Estimated Impact: 75%*
