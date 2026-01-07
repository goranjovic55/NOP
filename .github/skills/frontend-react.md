# Frontend React Patterns

## Critical Rules

**Docker:** Use `docker-compose.dev.yml` for local builds (not production compose)  
**JSX Comments:** Must be in braces `{/* comment */}` - plain `/* */` breaks build

## Avoid
- ❌ Prop drilling → ✅ Context/state management
- ❌ Missing keys in lists → ✅ Unique key props
- ❌ `docker-compose build` → ✅ `docker-compose.dev.yml`

## Patterns

### Basic Component
```tsx
interface CardProps {
  item: Item;
  onSelect?: (item: Item) => void;
}

export const Card: React.FC<CardProps> = ({ item, onSelect }) => {
  const handleSelect = useCallback(() => onSelect?.(item), [item, onSelect]);
  return <div onClick={handleSelect}>{item.name}</div>;
};
```

### POV Mode (Agent Filtering)
```tsx
import { usePOV, getPOVHeaders } from '../context/POVContext';

const MyComponent = () => {
  const { activeAgent } = usePOV();
  
  useEffect(() => {
    fetch('/api/data', { headers: getPOVHeaders(activeAgent) });
  }, [activeAgent]);  // Include in deps!
};
```

### Custom Hook with Polling
```tsx
function usePolling<T>(fetcher: () => Promise<T>, interval = 5000) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const result = await fetcher();
      if (mounted) setData(result);
    };
    poll();
    const id = setInterval(poll, interval);
    return () => { mounted = false; clearInterval(id); };
  }, [fetcher, interval]);
  return data;
}
```

### Zustand Store
```tsx
export const useItemStore = create<ItemStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),
}));
```

## CyberUI Components

Import: `import { CyberCard, CyberButton, CyberInput } from '../components/CyberUI'`

```tsx
<CyberCard interactive onClick={handleClick}>
  <CyberSectionHeader title="Title" subtitle="Desc" />
  <CyberButton variant="red" size="md">Action</CyberButton>
</CyberCard>
```

## Build Checklist

```bash
docker-compose -f docker-compose.dev.yml build frontend
docker-compose -f docker-compose.dev.yml up -d frontend
# Tell user: Ctrl+Shift+R to hard refresh
```

| Error | Fix |
|-------|-----|
| `')' expected` | Wrap comment in `{/* */}` |
| Old code shows | Use dev compose + hard refresh |

## Related
- `ui-consistency.md` - Theme patterns
- `debugging.md` - Build errors
