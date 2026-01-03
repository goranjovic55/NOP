---
name: frontend-react
description: React component patterns with TypeScript, hooks, and composition. Use when creating new React components, managing component state, or implementing hooks.
---

# Frontend React Patterns

React component patterns with TypeScript, hooks, and composition.

## When to Use
- Creating new React components
- Managing component state
- Implementing hooks

## Checklist
- [ ] Small components (<200 lines)
- [ ] TypeScript interface for props
- [ ] Memoize callbacks with useCallback
- [ ] Optional chaining for optional callbacks
- [ ] Effects cleanup (useEffect return)

## Examples

### Basic Component
```tsx
interface CardProps {
  item: Item;
  onSelect?: (item: Item) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  item, 
  onSelect, 
  onDelete,
  className = '' 
}) => {
  const handleSelect = useCallback(() => {
    onSelect?.(item);
  }, [item, onSelect]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item.id);
  }, [item.id, onDelete]);
  
  return (
    <div className={`card ${className}`} onClick={handleSelect}>
      <h3>{item.name}</h3>
      {onDelete && <button onClick={handleDelete}>Delete</button>}
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

export const Panel: React.FC<PanelProps> = ({ title, icon, children, actions }) => (
  <div className="panel">
    <div className="panel-header">
      {icon && <span className="icon">{icon}</span>}
      <h2>{title}</h2>
      {actions && <div className="actions">{actions}</div>}
    </div>
    <div className="panel-content">{children}</div>
  </div>
);
```

### Custom Hook
```tsx
function usePolling<T>(fetcher: () => Promise<T>, interval = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const poll = async () => {
      try {
        const result = await fetcher();
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setError(err as Error);
      }
    };

    poll();
    const id = setInterval(poll, interval);
    
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [fetcher, interval]);

  return { data, loading, error };
}
```

### Zustand Store
```tsx
import { create } from 'zustand';

interface ItemStore {
  items: Item[];
  loading: boolean;
  fetchItems: () => Promise<void>;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
}

export const useItemStore = create<ItemStore>((set) => ({
  items: [],
  loading: false,
  
  fetchItems: async () => {
    set({ loading: true });
    const items = await api.getItems();
    set({ items, loading: false });
  },
  
  addItem: (item) => set((state) => ({ 
    items: [...state.items, item] 
  })),
  
  removeItem: (id) => set((state) => ({ 
    items: state.items.filter(i => i.id !== id) 
  })),
}));
```
