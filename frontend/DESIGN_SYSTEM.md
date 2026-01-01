# AKIS Design System - Cyberpunk Theme

## Overview
Unified design system for Network Observatory Platform with cyberpunk aesthetic, responsive layouts, and consistent component styling.

## Color Palette

### Primary Colors
- **Cyber Black**: `#0a0a0a` - Main background
- **Cyber Dark**: `#111111` - Secondary backgrounds
- **Cyber Darker**: `#1a1a1a` - Tertiary backgrounds, cards
- **Cyber Gray**: `#2a2a2a` - Borders, separators
- **Cyber Gray Light**: `#3a3a3a` - Light borders, disabled states

### Accent Colors
- **Cyber Red**: `#ff0040` - Primary CTAs, errors, focus
- **Cyber Purple**: `#8b5cf6` - Secondary actions, badges
- **Cyber Green**: `#00ff88` - Success states, online status
- **Cyber Blue**: `#00d4ff` - Info, links, highlights
- **Cyber Yellow**: `#ffff00` - Warnings

## Typography

### Font Families
- **Primary**: JetBrains Mono
- **Secondary**: Source Code Pro
- **Fallback**: Fira Code, Consolas, Monaco

### Font Scale
| Class | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `text-xs-cyber` | 0.75rem (11.25px) | 1.2 | Labels, metadata |
| `text-sm-cyber` | 0.875rem (13.125px) | 1.4 | Secondary text, captions |
| `text-base-cyber` | 1rem (15px) | 1.5 | Body text (default) |
| `text-lg-cyber` | 1.125rem (16.875px) | 1.5 | Emphasis, subheadings |
| `text-xl-cyber` | 1.25rem (18.75px) | 1.4 | Headings |
| `text-2xl-cyber` | 1.5rem (22.5px) | 1.3 | Large headings |
| `text-3xl-cyber` | 1.875rem (28.125px) | 1.25 | Page titles |

## Components

### Buttons

#### Usage
```tsx
import { Button } from '../components/DesignSystem';

<Button variant="primary" size="md">Click Me</Button>
```

#### Variants
- **primary** - Red accent (primary CTAs)
- **secondary** - Purple accent (secondary actions)
- **success** - Green accent (confirm, success)
- **info** - Blue accent (information)
- **ghost** - Minimal, no border

#### Sizes
- **sm** - Small (px-3 py-1.5)
- **md** - Medium (px-4 py-2) - Default
- **lg** - Large (px-6 py-3)
- **xl** - Extra Large (px-8 py-4)

#### States
- `active={true}` - Active/selected state with glow
- `disabled={true}` - Disabled state

### Inputs

#### Usage
```tsx
import { Input, Select } from '../components/DesignSystem';

<Input size="md" placeholder="Enter value..." />
<Select size="md">
  <option value="1">Option 1</option>
</Select>
```

#### Types
- **Input** - Text, password, number, etc.
- **Select** - Dropdown with custom styling
- **Textarea** - Multi-line text (`.textarea`)
- **Checkbox** - Custom styled checkbox
- **Radio** - Custom styled radio button
- **Range** - Slider input

#### Sizes
- **sm** - Small
- **md** - Medium (default)
- **lg** - Large

### Cards

#### Usage
```tsx
import { Card, CardHeader, CardTitle } from '../components/DesignSystem';

<Card hover={true}>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <p>Card content...</p>
</Card>
```

#### Variants
- `hover={true}` - Adds hover effects (lift, glow)
- `hover={false}` - Static card (default)

### Badges

#### Usage
```tsx
import { Badge } from '../components/DesignSystem';

<Badge variant="red">Active</Badge>
```

#### Variants
- **red** - Error, critical, active
- **green** - Success, online
- **purple** - Info, status
- **blue** - Links, highlights

### Status Indicators

#### Usage
```tsx
import { StatusIndicator } from '../components/DesignSystem';

<StatusIndicator status="online" label="Connected" />
```

#### States
- **online** - Green dot with glow
- **offline** - Red dot with glow
- **warning** - Yellow dot with glow
- **unknown** - Purple dot with glow

## Responsive Design

### Breakpoints
```css
/* Mobile First */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large */
```

### Responsive Utilities

#### Responsive Grid
```tsx
import { ResponsiveGrid } from '../components/DesignSystem';

<ResponsiveGrid size="md">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</ResponsiveGrid>
```

Automatically adjusts columns based on screen size.

#### Responsive Text
```css
.text-responsive     /* Adjusts from sm → base → base */
.text-responsive-sm  /* Adjusts from xs → sm → sm */
.text-responsive-lg  /* Adjusts from base → lg → xl */
```

#### Responsive Padding
```tsx
<Section>
  {/* Padding automatically adjusts: p-4 (mobile) → p-6 (tablet) → p-8 (desktop) */}
</Section>
```

## Spacing Scale

### Padding/Margin Utilities
```css
.space-xs  /* 8px padding */
.space-sm  /* 12px padding */
.space-md  /* 16px padding */
.space-lg  /* 24px padding */
.space-xl  /* 32px padding */
```

## Animations

### Cyber Pulse
```css
.animate-cyber-pulse  /* Pulsing opacity + glow effect */
```

### Cyber Glow
```css
.animate-cyber-glow   /* Animated text-shadow glow */
```

## Best Practices

### 1. Use Design System Components
✅ **DO**:
```tsx
<Button variant="primary" size="md">Save</Button>
```

❌ **DON'T**:
```tsx
<button className="px-4 py-2 border border-cyber-red...">Save</button>
```

### 2. Consistent Typography
✅ **DO**:
```tsx
<h2 className="text-2xl-cyber text-cyber-red">Title</h2>
<p className="text-base-cyber">Body text</p>
```

❌ **DON'T**:
```tsx
<h2 className="text-2xl">Title</h2>
<p>Body text</p>
```

### 3. Responsive by Default
✅ **DO**:
```tsx
<div className="padding-responsive">
  <ResponsiveGrid size="md">
    {items.map(item => <Card>{item}</Card>)}
  </ResponsiveGrid>
</div>
```

❌ **DON'T**:
```tsx
<div className="p-4">
  <div className="grid grid-cols-3">
    {items.map(item => <Card>{item}</Card>)}
  </div>
</div>
```

### 4. Status Colors
Use semantic colors:
- **Red** - Errors, critical, destructive actions
- **Green** - Success, online, confirmation
- **Purple** - Info, neutral status
- **Blue** - Links, highlights, informational
- **Yellow** - Warnings, caution

### 5. Accessibility
- Always provide `:focus` states (built into components)
- Use `disabled` attribute, not just styling
- Provide labels for inputs
- Maintain color contrast (AA minimum)

## Migration Guide

### Replacing Old Components

#### Buttons
```tsx
// Old
<button className="btn-cyber px-4 py-2">Click</button>

// New
<Button variant="primary" size="md">Click</Button>
```

#### Inputs
```tsx
// Old
<input className="input-cyber" />

// New
<Input size="md" />
```

#### Cards
```tsx
// Old
<div className="dashboard-card">Content</div>

// New
<Card hover={true}>Content</Card>
```

## Testing Checklist

When updating a page:
- [ ] All buttons use `<Button>` component
- [ ] All inputs use `<Input>` or `<Select>` components
- [ ] Typography uses `text-*-cyber` classes
- [ ] Layout is responsive (test at 375px, 768px, 1024px, 1920px)
- [ ] Colors use cyber palette (`cyber-red`, `cyber-purple`, etc.)
- [ ] Spacing uses design system scale
- [ ] Hover states work correctly
- [ ] Focus states are visible
- [ ] Animations are smooth (60fps)
