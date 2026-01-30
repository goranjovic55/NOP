---
applyTo: 'frontend/**/*.tsx,frontend/**/*.jsx,components/**/*.tsx,pages/**/*.tsx'
description: 'Frontend React development patterns for components, Zustand state management, and WebSocket clients.'
---

# Frontend React Instructions

> Extends main skill from `.github/skills/frontend-react/SKILL.md`

## When This Applies
- Editing `.tsx` or `.jsx` files
- Working in `components/`, `pages/`, `store/`, `hooks/`
- Creating new React components
- Managing Zustand state

## Quick Patterns

### Component with Zustand Selector
```tsx
const items = useStore((s) => s.items);

const Card: FC<{ item: Item }> = ({ item }) => (
  <div key={item.id}>{item.name}</div>
);
```

### Zustand Store with Persistence
```tsx
export const useStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      addItem: (i) => set((s) => ({ items: [...s.items, i] }))
    }),
    { name: 'store-key' }
  )
);
```

### Async State Capture (⚠️ CRITICAL)
```tsx
const handleSave = async () => {
  const capturedParams = { ...localParams };  // Capture BEFORE async
  await updateNode(nodeId, { data: { ...node.data, ...capturedParams }});
  await saveCurrentWorkflow();  // Persist to backend
};
```

### Auth-Aware API Call
```tsx
const fetchData = async () => {
  try {
    return await api.get('/resource');
  } catch (error) {
    if (error.response?.status === 401) {
      logout();  // Redirect, don't show error
      return;
    }
    throw error;
  }
};
```

## Validation

Run before committing:
```bash
python .github/skills/frontend-react/scripts/validate.py
```

## ⚠️ Gotchas

| Issue | Solution |
|-------|----------|
| JSX comment error | Use `{/* comment */}` not `//` |
| Stale closures | Add all deps to useEffect array |
| Settings lost on refresh | Use localStorage for persistence |
| 401 errors | Call `logout()` from authStore |
| Wrong storage key | Use `nop-auth` not `token` |
