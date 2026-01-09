---
name: frontend-react
description: Load when editing .tsx, .jsx files or working in components/, pages/, store/, hooks/. Provides React and TypeScript patterns for frontend development.
---

# Frontend React

## Rules
- **JSX comments:** Must use `{/* comment */}`
- **Keys in lists:** Always `key={item.id}`
- **Dependency arrays:** Include all deps
- **Async in effects:** Never async callback directly

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Prop drilling | Context/Zustand |
| `useEffect(async)` | Wrapper function |
| Missing keys | `key={id}` |

## Patterns

```tsx
// Typed component
interface Props { item: Item; onSelect?: (item: Item) => void; }
export const Card: FC<Props> = ({ item, onSelect }) => {
  const handleClick = useCallback(() => onSelect?.(item), [item, onSelect]);
  return <div onClick={handleClick}>{item.name}</div>;
};

// Zustand store
export const useStore = create<State>((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
}));
```

## Errors
| Error | Fix |
|-------|-----|
| `')' expected` | Use `{/* */}` |
| Stale closure | Add to deps array |
