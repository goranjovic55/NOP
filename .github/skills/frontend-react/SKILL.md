---
name: frontend-react
description: Load when editing .tsx, .jsx files or working in components/, pages/, store/, hooks/. Provides React, TypeScript, Zustand state management, and WebSocket client patterns.
---

# Frontend React

## Merged Skills
- **state-management**: Zustand stores, selectors, subscriptions

## ⚠️ Critical Gotchas
- **401 errors:** Call `logout()` from authStore, don't show page-level error UI
- **JSX comments:** Must use `{/* comment */}` not `//`
- **Stale closures:** Add all deps to useEffect dependency array
- **State persistence:** Use localStorage for settings that survive page refresh
- **Zustand subscriptions:** Clean up selectors to avoid memory leaks

## Rules
- **Keys in lists:** Always `key={item.id}`
- **Dependency arrays:** Include all deps
- **Async in effects:** Never async callback directly
- **State management:** Zustand for global, useState for local

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Prop drilling | Context/Zustand |
| `useEffect(async)` | Wrapper function |
| Missing keys | `key={id}` |
| Page-level 401 UI | `logout()` redirect |

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

// Zustand store with persistence
import { persist } from 'zustand/middleware';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'settings-storage' }
  )
);

// Zustand selector (prevents re-renders)
const items = useStore((s) => s.items);
const addItem = useStore((s) => s.addItem);

// WebSocket client hook
const useWebSocket = (url: string) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'closed'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setStatus('connected');
    ws.onclose = () => setStatus('closed');
    return () => ws.close();
  }, [url]);

  return { ws: wsRef.current, status };
};
```

## Errors
| Error | Fix |
|-------|-----|
| `')' expected` | Use `{/* */}` |
| Stale closure | Add to deps array |
