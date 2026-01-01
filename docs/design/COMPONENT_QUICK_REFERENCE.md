# Component Quick Reference Guide

**Quick lookup for developers migrating to the design system**

---

## Button Migration

### ❌ Old Pattern
```tsx
<button className="btn-cyber px-4 py-2 text-sm font-medium uppercase tracking-wider">
  Click Me
</button>
```

### ✅ New Pattern
```tsx
import { Button } from '../design-system';

<Button variant="primary" size="md">Click Me</Button>
```

### Variant Mapping

| Old Class | New Variant | Example |
|-----------|-------------|---------|
| `btn-cyber` (red border/text) | `variant="primary"` | Primary action |
| `btn-cyber-purple` | `variant="secondary"` | Secondary action |
| `bg-transparent border-cyber-red` | `variant="danger"` | Delete, stop |
| `bg-transparent hover:bg-cyber-darker` | `variant="ghost"` | Minimal action |
| Icon only, no text | `variant="icon"` | Close, menu |

---

## Color Migration

### Brand vs Status Colors

| Context | ❌ Old | ✅ New | Reason |
|---------|--------|--------|--------|
| **Logo/Branding** | `text-cyber-red` | `text-brand-primary` | Brand identity |
| **Primary CTA** | `bg-cyber-red` | `bg-brand-primary` | Brand color |
| **Error Message** | `text-cyber-red` | `text-status-error` | Semantic meaning |
| **Delete Button** | `border-cyber-red` | `border-status-error` | Danger action |
| **Success** | `text-cyber-green` | `text-status-success` | Status feedback |
| **Warning** | `text-cyber-yellow` | `text-status-warning` | Status feedback |
| **Info** | `text-cyber-blue` | `text-status-info` | Neutral info |
| **Secondary UI** | `text-cyber-purple` | `text-brand-secondary` | Secondary brand |

### Quick Decision Tree

```
Is it the NOP logo or primary branding?
├─ YES → text-brand-primary
└─ NO → Is it feedback/status?
    ├─ YES → Is it positive?
    │   ├─ YES → text-status-success (green)
    │   └─ NO → Is it negative/error?
    │       ├─ YES → text-status-error (red)
    │       └─ NO → Is it warning?
    │           ├─ YES → text-status-warning (yellow)
    │           └─ NO → text-status-info (blue)
    └─ NO → Is it a secondary action/accent?
        └─ YES → text-brand-secondary (purple)
```

---

## Typography Migration

### Headings

#### ❌ Old Pattern
```tsx
<div className="text-cyber-red text-xl font-bold tracking-wider uppercase cyber-glow-red">
  Page Title
</div>
```

#### ✅ New Pattern
```tsx
import { Heading } from '../design-system';

<Heading level={1} color="red" glow>Page Title</Heading>
```

### Heading Levels

| Old Size | New Level | Responsive Size | Use Case |
|----------|-----------|-----------------|----------|
| `text-3xl` | `level={1}` | 30px → 36px | Page titles |
| `text-2xl` | `level={2}` | 24px → 30px | Section titles |
| `text-xl` | `level={3}` | 20px → 24px | Subsections |
| `text-lg` | `level={4}` | 18px → 20px | Card headers |
| `text-base` | `level={5}` | 16px → 18px | Small headings |
| `text-sm` | `level={6}` | 14px → 16px | Tiny headings |

---

## Input Migration

### ❌ Old Pattern
```tsx
<input
  type="text"
  className="input-cyber w-full px-4 py-2 text-sm"
  placeholder="Enter value"
/>
```

### ✅ New Pattern
```tsx
import { Input } from '../design-system';

<Input
  label="Field Label"
  placeholder="Enter value"
  size="md"
  error={errors.field}
/>
```

---

## Card Migration

### ❌ Old Pattern
```tsx
<div className="dashboard-card p-4 hover:border-opacity-100">
  <h3 className="text-cyber-purple text-sm font-bold">Title</h3>
  <div className="mt-2">Content</div>
</div>
```

### ✅ New Pattern
```tsx
import { Card, CardHeader, CardContent, Heading } from '../design-system';

<Card variant="glow">
  <CardHeader>
    <Heading level={4} color="purple">Title</Heading>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

---

## Responsive Patterns

### Stack on Mobile, Side-by-Side on Desktop

```tsx
// ❌ Old: Desktop-first
<div className="flex flex-row gap-4">
  <div className="w-1/2">Left</div>
  <div className="w-1/2">Right</div>
</div>

// ✅ New: Mobile-first
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>
```

### Hide on Mobile

```tsx
// ❌ Old: Desktop-first
<div className="block lg:hidden">Mobile only</div>
<div className="hidden lg:block">Desktop only</div>

// ✅ New: Mobile-first (clearer intent)
<div className="md:hidden">Mobile only</div>
<div className="hidden md:block">Desktop only</div>
```

### Responsive Font Sizes

```tsx
// ❌ Old: Fixed size
<h1 className="text-3xl">Title</h1>

// ✅ New: Scales up on larger screens
<h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>

// ✅✅ Best: Use Heading component (auto-responsive)
<Heading level={1}>Title</Heading>
```

### Responsive Padding

```tsx
// ❌ Old: Fixed padding
<div className="p-6">Content</div>

// ✅ New: Scales up on larger screens
<div className="p-4 md:p-6 lg:p-8">Content</div>
```

### Responsive Grid

```tsx
// ❌ Old: Fixed columns
<div className="grid grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>

// ✅ New: Responsive columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>
```

---

## Touch Target Checklist

### Minimum Size Requirements

| Element | Current | Target | Status |
|---------|---------|--------|--------|
| Button (primary) | 32-36px | 44px | ⚠️ FIX |
| Icon button | 28-32px | 44px | ⚠️ FIX |
| Input field | 36px | 44px | ⚠️ FIX |
| Table row | 28px | 44px | ⚠️ FIX |
| Checkbox | 20px | 44px (touch area) | ⚠️ FIX |

### How to Fix

```tsx
// ❌ Old: Too small for touch
<button className="px-2 py-1 text-xs">Click</button>  // ~28px height

// ✅ New: Touch-safe
<Button size="md">Click</Button>  // 44px height

// ✅ Alternative: Manual sizing
<button className="h-11 px-4 py-2.5">Click</button>  // 44px height
```

---

## Common Patterns

### Status Badge

```tsx
// ❌ Old
<span className={`px-2 py-1 text-xs font-bold uppercase ${
  status === 'online' 
    ? 'text-cyber-green border border-cyber-green' 
    : 'text-cyber-red border border-cyber-red'
}`}>
  {status}
</span>

// ✅ New
<span className={`px-2 py-1 text-xs font-bold uppercase border ${
  status === 'online'
    ? 'text-status-success border-status-success'
    : 'text-status-error border-status-error'
}`}>
  {status}
</span>
```

### Loading Button

```tsx
// ❌ Old
<button className="btn-cyber" disabled={loading}>
  {loading ? '⟳' : 'Start Scan'}
</button>

// ✅ New
<Button variant="primary" loading={loading}>
  Start Scan
</Button>
```

### Icon Button

```tsx
// ❌ Old
<button className="text-cyber-gray-light hover:text-cyber-red transition-colors text-2xl">
  ✕
</button>

// ✅ New
<Button variant="icon" ariaLabel="Close">
  ✕
</Button>
```

---

## Import Reference

```tsx
// Core components
import {
  Button,
  Input,
  TextArea,
  Select,
  Heading,
  Text,
  Code,
  Card,
  CardHeader,
  CardContent,
  Modal,
  Panel,
  ResponsiveTable,
} from '../design-system';

// Layout components
import {
  Container,
  Grid,
  Stack,
  Flex,
} from '../design-system/layouts';

// Hooks
import {
  useBreakpoint,
  useMediaQuery,
  useTouchDevice,
} from '../design-system/hooks';

// Tokens (if needed)
import { colors, spacing, breakpoints } from '../design-system/tokens';
```

---

## Migration Checklist (Per Page)

```markdown
## [Page Name] Migration

- [ ] Replace all `<button>` with `<Button variant="..." />`
- [ ] Replace all `<input>` with `<Input />`
- [ ] Replace all `<h1-h6>` with `<Heading level={1-6} />`
- [ ] Update `text-cyber-red` → Check context → `text-brand-primary` OR `text-status-error`
- [ ] Update `text-cyber-green` → `text-status-success`
- [ ] Update `text-cyber-purple` → `text-brand-secondary`
- [ ] Update `text-cyber-blue` → `text-status-info`
- [ ] Update `text-cyber-yellow` → `text-status-warning`
- [ ] Add responsive classes: `flex-col md:flex-row`
- [ ] Add responsive font sizes: `text-xl md:text-2xl`
- [ ] Verify touch targets ≥44px on mobile
- [ ] Test on mobile (DevTools responsive mode)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1280px)
- [ ] Verify no visual regressions
```

---

## Testing Breakpoints

### DevTools Responsive Mode

```bash
# Mobile Portrait
320px × 568px (iPhone SE)
375px × 667px (iPhone 8)
414px × 896px (iPhone 11)

# Mobile Landscape
568px × 320px
667px × 375px
896px × 414px

# Tablet
768px × 1024px (iPad)
834px × 1194px (iPad Pro)

# Desktop
1280px × 720px (Laptop)
1920px × 1080px (Desktop)
```

### Quick Test Command

```tsx
// Add to any component during development
const breakpoint = useBreakpoint();
console.log('Current breakpoint:', breakpoint);
```

---

## Common Issues & Fixes

### Issue: Button too small on mobile
```tsx
// ❌ Problem
<Button size="sm">Click</Button>  // 36px - too small

// ✅ Solution
<Button size="md">Click</Button>  // 44px - minimum
```

### Issue: Text too small on mobile
```tsx
// ❌ Problem
<div className="text-xs">Important text</div>  // 12px - too small

// ✅ Solution
<div className="text-sm md:text-xs">Important text</div>  // 14px mobile, 12px desktop
```

### Issue: Layout breaks on mobile
```tsx
// ❌ Problem
<div className="flex flex-row">  // Overflows on mobile
  <div className="w-1/3">Col 1</div>
  <div className="w-1/3">Col 2</div>
  <div className="w-1/3">Col 3</div>
</div>

// ✅ Solution
<div className="flex flex-col md:flex-row">  // Stacks on mobile
  <div className="w-full md:w-1/3">Col 1</div>
  <div className="w-full md:w-1/3">Col 2</div>
  <div className="w-full md:w-1/3">Col 3</div>
</div>
```

### Issue: Table overflows on mobile
```tsx
// ❌ Problem: Regular table
<table className="w-full">...</table>  // Horizontal scroll on mobile

// ✅ Solution: Use ResponsiveTable
<ResponsiveTable
  data={items}
  columns={columns}
  onRowClick={handleClick}
/>
// Automatically switches to card view on mobile
```

---

## Performance Tips

### 1. Import only what you need
```tsx
// ❌ Imports everything
import * as DS from '../design-system';

// ✅ Imports only what you need (tree-shaking)
import { Button, Input } from '../design-system';
```

### 2. Lazy load modals
```tsx
// ✅ Lazy load modal content
const SettingsModal = lazy(() => import('./SettingsModal'));

<Suspense fallback={<div>Loading...</div>}>
  {showSettings && <SettingsModal />}
</Suspense>
```

### 3. Memoize large lists
```tsx
// ✅ Prevent unnecessary re-renders
const MemoizedCard = memo(Card);

{items.map(item => (
  <MemoizedCard key={item.id} {...item} />
))}
```

---

**Quick Links**:
- [Full Design System Documentation](./UI_DESIGN_SYSTEM.md)
- [Migration Strategy](./UI_DESIGN_SYSTEM.md#4-migration-strategy)
- [Color Reference](./UI_DESIGN_SYSTEM.md#81-color-palette-reference)
- [Breakpoint Reference](./UI_DESIGN_SYSTEM.md#82-breakpoint-reference)
