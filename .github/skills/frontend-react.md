# Frontend React Patterns

React/TypeScript development patterns for any project.

## Critical Rules

- **JSX Comments:** Must use `{/* comment */}` - plain `/* */` breaks build
- **Keys in Lists:** Always provide unique `key` prop in map()
- **Dependency Arrays:** Include all dependencies in useEffect/useCallback
- **Async in Effects:** Never make useEffect callback async directly

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Prop drilling | Context/Zustand/Redux |
| Missing keys | `key={item.id}` |
| `useEffect(async () => {})` | `useEffect(() => { fn(); }, [])` |
| Inline objects in deps | useMemo for objects |
| Direct DOM manipulation | Use refs properly |

## Patterns

### Typed Component with Optional Callback
```tsx
interface CardProps {
  item: Item;
  onSelect?: (item: Item) => void;
}

export const Card: React.FC<CardProps> = ({ item, onSelect }) => {
  const handleClick = useCallback(() => onSelect?.(item), [item, onSelect]);
  return <div onClick={handleClick}>{item.name}</div>;
};
```

### Custom Hook with Cleanup
```tsx
function usePolling<T>(fetcher: () => Promise<T>, interval = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const result = await fetcher();
        if (mounted) setData(result);
      } catch (e) {
        if (mounted) setError(e as Error);
      }
    };
    poll();
    const id = setInterval(poll, interval);
    return () => { mounted = false; clearInterval(id); };
  }, [fetcher, interval]);

  return { data, error };
}
```

### Zustand Store (State Management)
```tsx
import { create } from 'zustand';

interface ItemStore {
  items: Item[];
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
}

export const useItemStore = create<ItemStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({ 
    items: state.items.filter(i => i.id !== id) 
  })),
}));
```

### Context with Custom Hook
```tsx
const MyContext = createContext<ContextType | null>(null);

export const useMyContext = () => {
  const ctx = useContext(MyContext);
  if (!ctx) throw new Error('useMyContext must be within Provider');
  return ctx;
};

export const MyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState(initialState);
  return <MyContext.Provider value={{ state, setState }}>{children}</MyContext.Provider>;
};
```

### Conditional Rendering
```tsx
// Prefer early return for loading/error states
if (loading) return <Spinner />;
if (error) return <ErrorDisplay error={error} />;
if (!data) return null;

return <DataDisplay data={data} />;
```

### Form with Controlled Inputs
```tsx
const [form, setForm] = useState({ name: '', email: '' });

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
};

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  await submitForm(form);
};
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `')' expected` | JSX comment syntax | Use `{/* */}` |
| `Cannot read property of undefined` | Missing null check | Optional chaining `?.` |
| Stale closure | Missing dependency | Add to dependency array |
| Infinite loop | Object in deps | useMemo the object |
| Key warning | Missing key prop | Add unique `key={id}` |

## Build Commands
```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # Lint check
npm run test     # Run tests
```
