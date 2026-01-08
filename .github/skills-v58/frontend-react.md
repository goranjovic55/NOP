---
name: frontend-react
description: .tsx, .jsx, components/, pages/ - React/TypeScript patterns
---
# Frontend React

## ⚠️ Critical
- JSX comments: `{/* comment */}` not `/* */`
- Keys in map(): `key={item.id}`
- Deps in hooks: include all in useEffect/useCallback

## ❌ Bad → ✅ Good
| Bad | Good |
|-----|------|
| Prop drilling | Context/Zustand |
| `useEffect(async () => {})` | `useEffect(() => { fn(); }, [])` |
| Missing keys | `key={item.id}` |

## Patterns
```tsx
// Typed component
interface Props { item: Item; onSelect?: (item: Item) => void; }
export const Card: FC<Props> = ({ item, onSelect }) => (
  <div onClick={() => onSelect?.(item)}>{item.name}</div>
);

// Custom hook with cleanup
function usePolling<T>(fetcher: () => Promise<T>, interval = 5000) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let mounted = true;
    const poll = async () => { if (mounted) setData(await fetcher()); };
    poll(); const id = setInterval(poll, interval);
    return () => { mounted = false; clearInterval(id); };
  }, [fetcher, interval]);
  return data;
}
```

## Errors
| Error | Fix |
|-------|-----|
| ')' expected | Use `{/* */}` for JSX comments |
| Cannot read undefined | Optional chaining `?.` |
| Stale closure | Add to dependency array |
