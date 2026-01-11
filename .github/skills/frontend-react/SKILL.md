---
name: frontend-react
description: Load when editing .tsx, .jsx files or working in components/, pages/, store/, hooks/. Provides React, TypeScript, Zustand state management, and WebSocket client patterns.
---

# Frontend React

## Merged Skills
- **state-management**: Zustand stores, selectors, subscriptions
- **internationalization**: i18n, translation, locale patterns
- **performance**: React.memo, useMemo, useCallback optimization

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
// Component + Zustand selector
const items = useStore((s) => s.items);
const Card: FC<{item: Item}> = ({ item }) => <div key={item.id}>{item.name}</div>;

// Store with persistence
export const useStore = create<State>()(persist((set) => ({
  items: [], addItem: (i) => set((s) => ({ items: [...s.items, i] }))
}), { name: 'store' }));
```
