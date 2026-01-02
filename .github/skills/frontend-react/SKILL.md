---
name: frontend-react
description: React component patterns with TypeScript, hooks, and composition. Use when creating React components.
---

# Frontend React Patterns

## When to Use
- Creating new React components
- Refactoring component structure
- Defining component interfaces
- Managing component state
- Implementing hooks

## Pattern
Component composition with TypeScript interfaces and React.FC

## Checklist
- [ ] Small components (<200 lines)
- [ ] Define TypeScript interface for props
- [ ] Use React.FC with interface type
- [ ] Memoize callbacks with useCallback
- [ ] Optional chaining for optional callbacks
- [ ] State in stores (Zustand/Redux)
- [ ] Effects cleanup (useEffect return)
- [ ] Provide default values for optional props

## Examples

### Basic Component
```tsx
interface ScanCardProps {
  scan: Scan;
  onSelect?: (scan: Scan) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export const ScanCard: React.FC<ScanCardProps> = ({ 
  scan, 
  onSelect, 
  onDelete,
  className = '' 
}) => {
  const handleSelect = useCallback(() => {
    onSelect?.(scan);
  }, [scan, onSelect]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(scan.id);
  }, [scan.id, onDelete]);
  
  return (
    <div className={`scan-card ${className}`} onClick={handleSelect}>
      <h3>{scan.target}</h3>
      <span className={`status ${scan.status}`}>{scan.status}</span>
      {onDelete && (
        <button onClick={handleDelete} className="delete-btn">
          Delete
        </button>
      )}
    </div>
  );
};
```

### Component with Children
```tsx
interface PanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ 
  title, 
  icon, 
  children, 
  actions 
}) => {
  return (
    <div className="panel">
      <div className="panel-header">
        {icon && <span className="icon">{icon}</span>}
        <h2>{title}</h2>
        {actions && <div className="actions">{actions}</div>}
      </div>
      <div className="panel-content">
        {children}
      </div>
    </div>
  );
};
```

### Custom Hook
```tsx
function useScanPolling(scanId: string, interval = 5000) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const pollScan = async () => {
      try {
        const data = await apiService.getScan(scanId);
        setScan(data);
      } catch (err) {
        setError(err);
      }
    };
    
    const timer = setInterval(pollScan, interval);
    pollScan(); // Initial fetch
    
    return () => clearInterval(timer); // Cleanup
  }, [scanId, interval]);
  
  return { scan, error };
}

// Usage
const { scan, error } = useScanPolling(scanId);
```

### Zustand Store Integration
```tsx
import { useScanStore } from '@/store/scanStore';

export const ScanList: React.FC = () => {
  const scans = useScanStore(state => state.scans);
  const loadScans = useScanStore(state => state.loadScans);
  
  useEffect(() => {
    loadScans();
  }, [loadScans]);
  
  return (
    <div>
      {scans.map(scan => (
        <ScanCard key={scan.id} scan={scan} />
      ))}
    </div>
  );
};
```

### Conditional Rendering
```tsx
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };
  
  const colors = {
    success: 'text-green-400 border-green-500',
    error: 'text-red-400 border-red-500',
    warning: 'text-yellow-400 border-yellow-500',
    info: 'text-blue-400 border-blue-500'
  };
  
  return (
    <div className={`alert ${colors[type]}`}>
      <span className="icon">{icons[type]}</span>
      <span className="message">{message}</span>
      {onClose && (
        <button onClick={onClose} className="close">×</button>
      )}
    </div>
  );
};
```

### Generic List Component
```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function List<T>({ 
  items, 
  renderItem, 
  emptyMessage = 'No items',
  className = '' 
}: ListProps<T>) {
  if (items.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }
  
  return (
    <div className={`list ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="list-item">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

// Usage
<List
  items={scans}
  renderItem={(scan) => <ScanCard scan={scan} />}
  emptyMessage="No scans found"
/>
```

### Form Component with State
```tsx
interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await onSubmit(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [username, password, onSubmit]);
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        disabled={loading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        disabled={loading}
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### Effect Cleanup
```tsx
export const LiveTraffic: React.FC = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/api/traffic/stream');
    
    ws.onmessage = (event) => {
      const packet = JSON.parse(event.data);
      setPackets(prev => [...prev.slice(-99), packet]); // Keep last 100
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, []);
  
  return (
    <div>
      {packets.map((packet, i) => (
        <PacketRow key={i} packet={packet} />
      ))}
    </div>
  );
};
```

## Best Practices

- Keep components small and focused
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for all props
- Memoize callbacks to prevent unnecessary re-renders
- Clean up effects (timers, subscriptions, websockets)
- Handle loading and error states
- Provide meaningful default values
