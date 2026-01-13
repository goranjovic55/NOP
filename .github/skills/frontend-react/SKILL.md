---
name: frontend-react
description: Load when editing .tsx, .jsx files or working in components/, pages/, store/, hooks/. Provides React, TypeScript, Zustand state management, and WebSocket client patterns.
---

# Frontend React

## Merged Skills
- **state-management**: Zustand stores, selectors, subscriptions
- **internationalization**: i18n, translation, locale patterns
- **performance**: React.memo, useMemo, useCallback optimization
- **authentication**: Login flows, token storage, auth guards
- **websocket-realtime**: WebSocket client, reconnection, message handling

## ⚠️ Critical Gotchas
- **401 errors:** Call `logout()` from authStore, don't show page-level error UI
- **JSX comments:** Must use `{/* comment */}` not `//`
- **Stale closures:** Add all deps to useEffect dependency array
- **State persistence:** Use localStorage for settings that survive page refresh
- **Zustand subscriptions:** Clean up selectors to avoid memory leaks
- **Auth token key:** Use `localStorage.getItem('auth_token')` not `'token'`
- **Async race condition:** Capture state with `{ ...localState }` BEFORE any `updateNode()` or async calls
- **ConfigPanel save:** Must call `saveCurrentWorkflow()` after `updateNode()` to persist to backend

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

// Execution visualization in node component
const executionStatus = (data as any).executionStatus as NodeExecutionStatus;
const borderColor = executionStatus ? statusColors[executionStatus] : categoryColor;
const isExecuting = executionStatus === 'running';

// Pass execution data via node.data
updateNode(nodeId, { data: { ...node.data, executionStatus, executionOutput, executionDuration }});
```

## Execution Visualization
| Status | Border Color | Effect |
|--------|-------------|--------|
| running | cyan | animate-pulse + glow |
| completed | green | static glow |
| failed | red | static glow |
| pending | gray | default |
