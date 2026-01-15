---
title: Unified Style Guide
type: reference
category: design
last_updated: 2026-01-14
---

# Unified Style Guide - NOP Frontend

## Overview

This document defines the standardized styling system for the Network Observatory Platform (NOP) frontend. All pages and components should use these unified classes and components for visual consistency.

---

## 🎨 Color Palette

### Primary Colors
- **Cyber Red**: `#ff0040` - Primary alerts, warnings, critical actions
- **Cyber Green**: `#00ff88` - Success states, online status, confirmations  
- **Cyber Blue**: `#00d4ff` - Information, links, secondary actions
- **Cyber Purple**: `#8b5cf6` - Special features, highlights

### Background Colors
- **Black**: `#0a0a0a` - Page background
- **Dark**: `#111111` - Card/container background
- **Darker**: `#1a1a1a` - Panel background
- **Gray**: `#2a2a2a` - Borders, dividers
- **Gray Light**: `#3a3a3a` - Hover borders

---

## 📦 Components (CyberUI)

Import from: `import { ComponentName } from '../components/CyberUI';`

### Cards & Containers

#### CyberCard
Standard container with cyberpunk gradient background.

```tsx
<CyberCard interactive onClick={() => navigate('/path')}>
  {/* Content */}
</CyberCard>
```

**Props:**
- `interactive?: boolean` - Adds hover effects and cursor pointer
- `onClick?: () => void` - Click handler
- `className?: string` - Additional classes

**CSS Classes (if not using component):**
- `.cyber-card` - Base card styling
- `.cyber-card-interactive` - Add hover effects

#### CyberPanel
Panel with standardized borders and background.

```tsx
<CyberPanel>
  <CyberSectionHeader title="Section Name" />
  {/* Content */}
</CyberPanel>
```

**CSS Classes:**
- `.cyber-panel` - Panel styling

---

### Headers

#### CyberPageTitle
Main page title with color variants and glow effects.

```tsx
<CyberPageTitle color="red">Page Name</CyberPageTitle>
```

**Props:**
- `color?: 'red' | 'blue' | 'green' | 'purple'` - Title color (default: 'red')
- `className?: string` - Additional classes

**CSS Classes:**
- `.cyber-page-title` - Base title
- `.cyber-page-title-red/blue/green/purple` - Color variants

#### CyberSectionHeader
Section header for panels and containers.

```tsx
<CyberSectionHeader 
  title="Configuration" 
  subtitle="Network Settings"
  actions={<button>Action</button>}
/>
```

**Props:**
- `title: string` - Main title
- `subtitle?: string` - Optional subtitle
- `actions?: ReactNode` - Optional action buttons/elements
- `className?: string` - Additional classes

**CSS Classes:**
- `.cyber-section-header` - Header container
- `.cyber-section-title` - Title text
- `.cyber-section-subtitle` - Subtitle text

---

### Form Elements

#### CyberInput
Standardized text input with focus states.

```tsx
<CyberInput 
  type="text"
  placeholder="Enter value"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

**CSS Classes:**
- `.cyber-input` - Input styling with focus effects

#### CyberSelect
Standardized select dropdown.

```tsx
<CyberSelect value={selected} onChange={(e) => setSelected(e.target.value)}>
  <option value="option1">Option 1</option>
</CyberSelect>
```

**CSS Classes:**
- `.cyber-select` - Select styling

#### CyberSlider
Slider/range input with value display.

```tsx
<CyberSlider
  label="Packet Rate"
  value={rate}
  min={1}
  max={1000}
  unit="pps"
  onChange={setRate}
  description="Packets per second"
/>
```

**Props:**
- `label: string` - Label text
- `value: number` - Current value
- `min: number` - Minimum value
- `max: number` - Maximum value
- `unit?: string` - Unit of measurement
- `onChange: (value: number) => void` - Change handler
- `description?: string` - Help text
- `className?: string` - Additional classes

**CSS Classes:**
- `.cyber-slider` - Slider track and thumb styling

---

### Buttons

#### CyberButton
Standardized button with size and color variants.

```tsx
<CyberButton variant="red" size="md" onClick={handleClick}>
  Execute
</CyberButton>
```

**Props:**
- `variant?: 'red' | 'blue' | 'green' | 'purple' | 'gray'` - Button color
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `className?: string` - Additional classes
- All standard button HTML attributes

**CSS Classes (alternative to component):**
- `.btn-base` - Base button (always include)
- `.btn-sm / .btn-md / .btn-lg` - Size variants
- `.btn-red / .btn-blue / .btn-green / .btn-purple / .btn-gray` - Color variants

**Legacy Classes (still supported):**
- `.btn-cyber` - Original cyberpunk button style

---

### Tabs

#### CyberTabs
Tab navigation with color-coded active states.

```tsx
<CyberTabs 
  tabs={[
    { id: 'tab1', label: 'Overview', color: 'blue' },
    { id: 'tab2', label: 'Details', color: 'green' }
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

**Props:**
- `tabs: Array<{ id: string; label: string; color?: 'red'|'blue'|'green'|'purple' }>` - Tab definitions
- `activeTab: string` - Currently active tab ID
- `onChange: (tabId: string) => void` - Tab change handler
- `className?: string` - Additional classes

**CSS Classes (if implementing custom tabs):**
- `.cyber-tab` - Tab button base
- `.cyber-tab-active` - Active tab state
- `.cyber-tab-red/blue/green/purple` - Color variants

---

### Badges

#### CyberBadge
Status badges with color variants.

```tsx
<CyberBadge variant="online">ACTIVE</CyberBadge>
```

**Props:**
- `variant?: 'online' | 'offline' | 'warning' | 'info'` - Badge type
- `className?: string` - Additional classes

**CSS Classes:**
- `.cyber-badge` - Base badge
- `.cyber-badge-online/offline/warning/info` - Variants

---

### Dividers

#### CyberDivider
Horizontal divider lines.

```tsx
<CyberDivider glow />
```

**Props:**
- `glow?: boolean` - Add glow effect
- `className?: string` - Additional classes

**CSS Classes:**
- `.cyber-divider` - Standard divider
- `.cyber-divider-glow` - Divider with glow effect

---

## 🎯 Utility Classes

### Scrollbars
```css
.custom-scrollbar /* Cyber-themed scrollbar */
```

### Status Indicators
```css
.status-online    /* Green glow */
.status-offline   /* Red glow */
.status-warning   /* Yellow glow */
.status-unknown   /* Purple glow */
```

### Glow Effects
```css
.cyber-glow           /* Generic glow */
.cyber-glow-red       /* Red text glow */
.cyber-glow-green     /* Green text glow */
.cyber-glow-blue      /* Blue text glow */
.cyber-glow-purple    /* Purple text glow */
```

### Borders
```css
.cyber-border         /* Standard border with hover effect */
```

---

## 📏 Typography

### Font Family
- **Primary**: `'JetBrains Mono', monospace`
- **Terminal**: `'Source Code Pro', 'JetBrains Mono', monospace`

### Font Sizes (Tailwind)
- `text-xs` - 0.75rem (11.25px) - Labels
- `text-sm` - 0.875rem (13.125px) - Secondary text
- `text-base` - 1rem (15px) - Default body
- `text-lg` - 1.125rem (16.875px) - Emphasis
- `text-xl` - 1.25rem (18.75px) - Headings
- `text-2xl` - 1.5rem (22.5px) - Large headings
- `text-3xl` - 1.875rem (28.125px) - Page titles

---

## 🎨 Spacing & Layout

### Border Radius
- `rounded-sm` - 2px (sharp, minimal)
- `rounded-md` - 4px (subtle)
- `rounded-lg` - 6px (moderate)

### Standard Padding
- Sections: `p-4` (1rem)
- Cards: `p-6` (1.5rem)
- Buttons: `px-4 py-2` or use size classes

---

## ✅ Best Practices

### DO:
✅ Use `CyberCard` for all container elements  
✅ Use `CyberPageTitle` for page headers  
✅ Use `CyberSectionHeader` for panel/section headers  
✅ Use `CyberButton` or `.btn-base` + variants for buttons  
✅ Use `CyberTabs` for tab navigation  
✅ Use standardized color classes from the palette  
✅ Apply `.custom-scrollbar` to scrollable areas  

### DON'T:
❌ Create inline custom button styles  
❌ Use arbitrary colors outside the palette  
❌ Mix old `.dashboard-card` with new `.cyber-card`  
❌ Create custom slider styling (use `CyberSlider`)  
❌ Use generic HTML headings without styling  

---

## 🔄 Migration Guide

### Old → New

**Cards:**
```tsx
// Old
<div className="dashboard-card p-4">...</div>
<div className="bg-cyber-darker border border-cyber-gray p-4">...</div>

// New
<CyberCard>...</CyberCard>
```

**Section Headers:**
```tsx
// Old
<div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray">
  <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest">
    Title
  </span>
</div>

// New
<CyberSectionHeader title="Title" />
```

**Page Titles:**
```tsx
// Old
<h2 className="text-2xl font-bold text-cyber-red uppercase tracking-wider cyber-glow-red">
  Page Name
</h2>

// New
<CyberPageTitle color="red">Page Name</CyberPageTitle>
```

**Sliders:**
```tsx
// Old
<input type="range" className="w-full h-2 bg-cyber-darker..." />

// New
<CyberSlider label="Rate" value={val} min={0} max={100} onChange={setVal} />
```

---

## 📋 Implementation Checklist

When creating a new page or component:

- [ ] Import necessary CyberUI components
- [ ] Use `CyberPageTitle` for main page heading
- [ ] Wrap content in `CyberCard` or `CyberPanel`
- [ ] Use `CyberSectionHeader` for sections
- [ ] Use `CyberButton` with appropriate variant
- [ ] Apply `.custom-scrollbar` to scrollable containers
- [ ] Use color classes from the palette
- [ ] Use `CyberTabs` for tab navigation
- [ ] Apply consistent spacing (p-4, p-6)
- [ ] Test all hover states and interactions

---

## 🔍 Examples

See these files for reference implementations:
- `/frontend/src/pages/Traffic.tsx` - CyberTabs usage
- `/frontend/src/pages/Storm.tsx` - CyberSectionHeader, CyberPageTitle
- `/frontend/src/pages/Settings.tsx` - CyberSlider usage
- `/frontend/src/components/PacketCrafting.tsx` - CyberSectionHeader in panels
- `/frontend/src/pages/Dashboard.tsx` - CyberCard with interactive prop

---

**End of Style Guide**
