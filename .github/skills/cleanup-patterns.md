# Cleanup Patterns

Resource cleanup patterns to prevent memory leaks and stale state.

## When to Use

- Components with WebSocket connections
- Timers and intervals in components
- Event listeners on window/document
- Fetch requests that may outlive component
- Store subscriptions that need cleanup

## Checklist

- [ ] useEffect cleanup return function
- [ ] AbortController for fetch requests
- [ ] Clear timeouts and intervals
- [ ] Remove event listeners
- [ ] Unsubscribe from stores/observables
- [ ] Close WebSocket connections

## Examples

### Basic useEffect Cleanup
```tsx
import { useEffect, useState } from 'react';

function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Setup
    const intervalId = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // ✅ Cleanup - runs on unmount or before re-run
    return () => {
      clearInterval(intervalId);
    };
  }, []); // Empty deps = runs once

  return <div>Elapsed: {seconds}s</div>;
}
```

### AbortController for Fetch Requests
```tsx
import { useEffect, useState } from 'react';

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    
    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/users/${userId}`, {
          signal: controller.signal  // ✅ Pass abort signal
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        setUser(data);
      } catch (err) {
        // ✅ Don't set state if request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();

    // ✅ Cleanup - abort request if component unmounts
    return () => {
      controller.abort();
    };
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{user?.name}</div>;
}
```

### Event Listener Cleanup
```tsx
import { useEffect, useState } from 'react';

function WindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    // ✅ Add listener
    window.addEventListener('resize', handleResize);

    // ✅ Remove listener on cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div>{size.width} x {size.height}</div>;
}
```

### WebSocket Cleanup
```tsx
import { useEffect, useRef, useState } from 'react';

function LiveFeed({ url }: { url: string }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (e) => setMessages(prev => [...prev, e.data]);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    // ✅ Close WebSocket on cleanup
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [url]);

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      {messages.map((msg, i) => <div key={i}>{msg}</div>)}
    </div>
  );
}
```

### Zustand Store Subscription Cleanup
```tsx
import { useEffect } from 'react';
import { useTrafficStore } from '../store/trafficStore';

function TrafficMonitor() {
  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = useTrafficStore.subscribe(
      (state) => state.packets,
      (packets) => {
        console.log('Packets updated:', packets.length);
      }
    );

    // ✅ Unsubscribe on cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  // ...
}
```

### Timeout Cleanup
```tsx
import { useEffect, useState } from 'react';

function DelayedMessage({ delay }: { delay: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setVisible(true);
    }, delay);

    // ✅ Clear timeout on cleanup
    return () => {
      clearTimeout(timeoutId);
    };
  }, [delay]);

  return visible ? <div>Message appeared!</div> : null;
}
```

### Combined Cleanup Hook
```tsx
import { useEffect, useRef } from 'react';

interface UseCleanupOptions {
  interval?: NodeJS.Timeout;
  timeout?: NodeJS.Timeout;
  controller?: AbortController;
  eventListeners?: Array<{
    target: EventTarget;
    event: string;
    handler: EventListener;
  }>;
  websocket?: WebSocket;
}

function useCleanup() {
  const cleanupRef = useRef<UseCleanupOptions>({});

  useEffect(() => {
    return () => {
      const cleanup = cleanupRef.current;
      
      if (cleanup.interval) clearInterval(cleanup.interval);
      if (cleanup.timeout) clearTimeout(cleanup.timeout);
      if (cleanup.controller) cleanup.controller.abort();
      if (cleanup.websocket) cleanup.websocket.close();
      
      cleanup.eventListeners?.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
    };
  }, []);

  return cleanupRef;
}

// Usage
function ComplexComponent() {
  const cleanup = useCleanup();

  useEffect(() => {
    cleanup.current.controller = new AbortController();
    cleanup.current.interval = setInterval(() => {
      fetch('/api/poll', { signal: cleanup.current.controller?.signal });
    }, 5000);
  }, []);

  return <div>...</div>;
}
```

### Ref-based Cleanup for Async Operations
```tsx
import { useEffect, useRef } from 'react';

function AsyncComponent({ id }: { id: string }) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    async function fetchData() {
      const data = await fetch(`/api/data/${id}`);
      
      // ✅ Check if still mounted before setting state
      if (isMountedRef.current) {
        // setState...
      }
    }
    
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [id]);

  return <div>...</div>;
}
```

## Anti-Patterns

- ❌ No cleanup return in useEffect → ✅ Always clean up subscriptions/listeners
- ❌ Setting state after unmount → ✅ Use AbortController or mounted ref
- ❌ Forgetting to close WebSocket → ✅ Close in cleanup function
- ❌ Not clearing intervals → ✅ Always clearInterval in cleanup
- ❌ Orphaned event listeners → ✅ removeEventListener with same handler reference

## Memory Leak Detection

```tsx
// React DevTools Profiler
// Look for: Components re-rendering unexpectedly, Growing memory

// Console warning (React 18+)
// "Warning: Can't perform a React state update on an unmounted component"
// This indicates missing cleanup

// Chrome DevTools
// Performance tab → Memory → Take heap snapshot
// Compare snapshots before/after navigation
```

## Related

- `frontend-react` - React component patterns
- `websocket-patterns` - WebSocket handling
- `testing` - Testing cleanup behavior

---
*Created: 2026-01-03*
*Priority: Medium*
*Estimated Impact: 60%*
