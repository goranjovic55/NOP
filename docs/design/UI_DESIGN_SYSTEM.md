# UI Design System - Comprehensive Standardization & Responsive Design

**Date**: 2026-01-01  
**Status**: Design Decision  
**Architect**: AKIS Framework

---

## Executive Summary

This design system addresses critical frontend issues: 100+ button variants, dual font confusion, color semantic overlap, desktop-first layout problems, 40-50% code duplication, and inadequate touch targets. The solution provides a comprehensive component library, responsive mobile-first strategy, and clear migration path.

**[AKIS] entities=8 | skills=frontend-react | patterns=component-system,responsive-design**

---

## 1. Design System Architecture

### 1.1 Folder Structure

```
frontend/src/
├── design-system/
│   ├── index.ts                    # Main export barrel
│   ├── tokens/
│   │   ├── colors.ts               # Color semantic tokens
│   │   ├── typography.ts           # Font/size scales
│   │   ├── spacing.ts              # Spacing constants
│   │   ├── breakpoints.ts          # Responsive breakpoints
│   │   └── shadows.ts              # Shadow utilities
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.types.ts
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   ├── TextArea.tsx
│   │   │   ├── Select.tsx
│   │   │   └── index.ts
│   │   ├── Typography/
│   │   │   ├── Heading.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── Code.tsx
│   │   │   └── index.ts
│   │   ├── Card/
│   │   │   ├── Card.tsx
│   │   │   ├── CardHeader.tsx
│   │   │   ├── CardContent.tsx
│   │   │   └── index.ts
│   │   ├── Modal/
│   │   │   ├── Modal.tsx
│   │   │   ├── ModalHeader.tsx
│   │   │   ├── ModalFooter.tsx
│   │   │   └── index.ts
│   │   ├── Table/
│   │   │   ├── Table.tsx
│   │   │   ├── ResponsiveTable.tsx
│   │   │   └── index.ts
│   │   └── Panel/
│   │       ├── Panel.tsx
│   │       └── index.ts
│   ├── layouts/
│   │   ├── Container.tsx           # Max-width containers
│   │   ├── Grid.tsx                # Responsive grid
│   │   ├── Stack.tsx               # Vertical/horizontal stack
│   │   └── Flex.tsx                # Flexbox utilities
│   └── hooks/
│       ├── useBreakpoint.ts        # Current breakpoint hook
│       ├── useMediaQuery.ts        # Custom media query
│       └── useTouchDevice.ts       # Touch detection
```

### 1.2 Design Principles

1. **Mobile-First**: All components designed for mobile, enhanced for desktop
2. **Accessibility**: WCAG 2.1 AA compliance (44px touch targets, ARIA labels)
3. **Performance**: Lazy loading, code splitting, tree-shaking
4. **Consistency**: Single source of truth for all design tokens
5. **Composability**: Small, reusable components that combine well
6. **Type Safety**: Full TypeScript coverage with strict types

---

## 2. Component Specifications

### 2.1 Button Component System

**Problem**: 100+ button variants with inconsistent styling.

**Solution**: 5 variants × 4 sizes × 3 states = Standardized system

#### Button Variants

```typescript
// frontend/src/design-system/components/Button/Button.types.ts

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
export type ButtonState = 'default' | 'hover' | 'active' | 'disabled';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  ariaLabel?: string;
}
```

#### Button Specifications

| Variant | Use Case | Colors | Border | Shadow |
|---------|----------|--------|--------|--------|
| **Primary** | Main actions (Start Scan, Connect) | `bg-cyber-red`, `hover:bg-cyber-red-dark` | `border-cyber-red` | `cyber-glow-red` |
| **Secondary** | Secondary actions (Cancel, Close) | `bg-cyber-darker`, `hover:bg-cyber-gray` | `border-cyber-gray` | None |
| **Danger** | Destructive actions (Delete, Stop) | `bg-transparent`, `text-cyber-red` | `border-cyber-red` | `hover:cyber-glow-red` |
| **Ghost** | Minimal actions (View, Details) | `bg-transparent`, `hover:bg-cyber-darker` | None | None |
| **Icon** | Icon-only buttons (Close, Menu) | `bg-transparent`, `hover:bg-cyber-darker` | None | None |

#### Touch Target Sizes

| Size | Height | Padding | Font | Use Case | Mobile-Safe |
|------|--------|---------|------|----------|-------------|
| **sm** | 36px | px-3 py-2 | text-xs | Compact tables, chips | ⚠️ Near minimum |
| **md** | 44px | px-4 py-2.5 | text-sm | Standard buttons | ✅ Recommended |
| **lg** | 52px | px-6 py-3 | text-base | Primary CTAs | ✅ Excellent |
| **xl** | 60px | px-8 py-4 | text-lg | Hero actions | ✅ Excellent |

#### Button Component Implementation

```typescript
// frontend/src/design-system/components/Button/Button.tsx

import React from 'react';
import { ButtonProps } from './Button.types';

const variantClasses: Record<string, string> = {
  primary: 'bg-cyber-red border-2 border-cyber-red text-cyber-black hover:bg-cyber-red-dark hover:border-cyber-red-dark hover:shadow-cyber active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'bg-cyber-darker border-2 border-cyber-gray text-cyber-gray-light hover:bg-cyber-gray hover:border-cyber-purple hover:text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  danger: 'bg-transparent border-2 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-cyber-black hover:shadow-cyber active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'bg-transparent border-2 border-transparent text-cyber-gray-light hover:bg-cyber-darker hover:text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  icon: 'bg-transparent border-0 text-cyber-gray-light hover:bg-cyber-darker hover:text-cyber-red active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-9 px-3 py-2 text-xs min-w-[36px]',      // 36px - WARNING: close to minimum
  md: 'h-11 px-4 py-2.5 text-sm min-w-[44px]',   // 44px - MINIMUM recommended
  lg: 'h-13 px-6 py-3 text-base min-w-[52px]',   // 52px - GOOD
  xl: 'h-15 px-8 py-4 text-lg min-w-[60px]',     // 60px - EXCELLENT
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  onClick,
  type = 'button',
  className = '',
  ariaLabel,
}) => {
  const baseClasses = 'font-mono font-medium uppercase tracking-wider transition-all duration-300 rounded-sm inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyber-red focus:ring-offset-2 focus:ring-offset-cyber-black';
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
    >
      {loading && <span className="animate-spin">⟳</span>}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
};
```

**Migration Strategy**: Replace inline button classes progressively:
- Week 1: Create Button component, test with Storybook
- Week 2: Migrate critical paths (Login, Scans, Access)
- Week 3: Migrate remaining pages
- Week 4: Remove old button classes from CSS

---

### 2.2 Typography System

**Problem**: Dual font families (JetBrains Mono + Source Code Pro) with unclear usage.

**Solution**: Clear hierarchy with semantic naming.

#### Font Stack Decision

| Font | Usage | Justification |
|------|-------|---------------|
| **JetBrains Mono** | Primary (UI, headings, labels) | Better readability, wider character set, modern ligatures |
| **Source Code Pro** | Secondary (code blocks, terminals) | Slightly more compact for dense code |

#### Typography Tokens

```typescript
// frontend/src/design-system/tokens/typography.ts

export const fontFamilies = {
  primary: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  code: "'Source Code Pro', 'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const fontSizes = {
  // Mobile-first: base sizes
  xs: '0.75rem',    // 12px - Small labels, captions
  sm: '0.875rem',   // 14px - Secondary text, meta info
  base: '1rem',     // 16px - Body text (WCAG recommended)
  lg: '1.125rem',   // 18px - Emphasized text
  xl: '1.25rem',    // 20px - Small headings
  '2xl': '1.5rem',  // 24px - Section headings
  '3xl': '1.875rem',// 30px - Page titles
  '4xl': '2.25rem', // 36px - Hero text
} as const;

export const lineHeights = {
  tight: '1.2',
  normal: '1.5',
  relaxed: '1.75',
} as const;

export const fontWeights = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
```

#### Typography Components

```typescript
// frontend/src/design-system/components/Typography/Heading.tsx

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  color?: 'red' | 'green' | 'purple' | 'blue' | 'default';
}

const levelStyles = {
  1: 'text-3xl md:text-4xl font-bold tracking-wider uppercase',
  2: 'text-2xl md:text-3xl font-bold tracking-wide uppercase',
  3: 'text-xl md:text-2xl font-semibold tracking-wide uppercase',
  4: 'text-lg md:text-xl font-semibold uppercase',
  5: 'text-base md:text-lg font-medium uppercase',
  6: 'text-sm md:text-base font-medium uppercase',
};

const colorStyles = {
  red: 'text-cyber-red',
  green: 'text-cyber-green',
  purple: 'text-cyber-purple',
  blue: 'text-cyber-blue',
  default: 'text-cyber-gray-light',
};

const glowStyles = {
  red: 'cyber-glow-red',
  green: 'cyber-glow-green',
  purple: 'cyber-glow-purple',
  blue: 'cyber-glow-blue',
  default: '',
};

export const Heading: React.FC<HeadingProps> = ({ 
  level, 
  children, 
  className = '', 
  glow = false,
  color = 'default' 
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const classes = `
    font-primary
    ${levelStyles[level]}
    ${colorStyles[color]}
    ${glow ? glowStyles[color] : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return React.createElement(Tag, { className: classes }, children);
};
```

**Responsive Typography**: Font sizes automatically scale up on larger screens using Tailwind's responsive prefixes (`md:`, `lg:`).

---

### 2.3 Color Semantic Mapping

**Problem**: Color semantic overlap (red for brand AND danger).

**Solution**: Separate brand colors from status colors with clear semantic meaning.

#### Color Token System

```typescript
// frontend/src/design-system/tokens/colors.ts

export const colors = {
  // Brand Identity (Primary UI colors)
  brand: {
    primary: '#ff0040',       // cyber-red - Logo, primary actions
    primaryDark: '#cc0033',   // Hover states
    secondary: '#8b5cf6',     // cyber-purple - Accents, secondary actions
    secondaryLight: '#a78bfa',
  },
  
  // Status/Semantic Colors (Feedback)
  status: {
    success: '#00ff88',       // cyber-green - Success, online, positive
    successDark: '#00cc6a',
    error: '#ff4444',         // NEW: Distinct from brand red
    errorDark: '#cc0000',
    warning: '#ffff00',       // cyber-yellow - Warnings, caution
    warningDark: '#cccc00',
    info: '#00d4ff',          // cyber-blue - Info, neutral
    infoDark: '#00a8cc',
  },
  
  // Neutral Palette
  neutral: {
    black: '#0a0a0a',
    darkest: '#111111',
    darker: '#1a1a1a',
    dark: '#2a2a2a',
    gray: '#3a3a3a',
    grayLight: '#4a4a4a',
    text: '#e0e0e0',
  },
} as const;
```

#### Tailwind Config Updates

```javascript
// frontend/tailwind.config.js - UPDATED COLORS

module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand colors (Primary UI)
        'brand-primary': '#ff0040',
        'brand-primary-dark': '#cc0033',
        'brand-secondary': '#8b5cf6',
        'brand-secondary-light': '#a78bfa',
        
        // Status colors (Semantic feedback)
        'status-success': '#00ff88',
        'status-success-dark': '#00cc6a',
        'status-error': '#ff4444',        // NEW: Distinct from brand
        'status-error-dark': '#cc0000',
        'status-warning': '#ffff00',
        'status-warning-dark': '#cccc00',
        'status-info': '#00d4ff',
        'status-info-dark': '#00a8cc',
        
        // Legacy support (gradually deprecate)
        cyber: {
          black: '#0a0a0a',
          dark: '#111111',
          darker: '#1a1a1a',
          gray: '#2a2a2a',
          'gray-light': '#3a3a3a',
          red: '#ff0040',           // DEPRECATED: Use brand-primary
          'red-dark': '#cc0033',
          purple: '#8b5cf6',        // DEPRECATED: Use brand-secondary
          'purple-dark': '#7c3aed',
          'purple-light': '#a78bfa',
          green: '#00ff88',         // DEPRECATED: Use status-success
          'green-dark': '#00cc6a',
          blue: '#00d4ff',          // DEPRECATED: Use status-info
          'blue-dark': '#00a8cc',
          yellow: '#ffff00',        // DEPRECATED: Use status-warning
          'yellow-dark': '#cccc00',
        },
      },
    },
  },
};
```

#### Color Usage Guidelines

| Context | Color | Class | Example |
|---------|-------|-------|---------|
| **Primary CTAs** | Brand Primary | `bg-brand-primary` | "Start Scan", "Connect" buttons |
| **Logo/Branding** | Brand Primary | `text-brand-primary` | NOP logo, app title |
| **Secondary Actions** | Brand Secondary | `bg-brand-secondary` | "View Details", "Settings" |
| **Success Messages** | Status Success | `text-status-success` | "Scan complete", "Connected" |
| **Error Messages** | Status Error | `text-status-error` | "Connection failed", "Invalid input" |
| **Warnings** | Status Warning | `text-status-warning` | "High CPU usage", "Low disk space" |
| **Info/Neutral** | Status Info | `text-status-info` | "Processing...", "Loading..." |
| **Danger Actions** | Status Error | `border-status-error` | "Delete", "Stop", "Terminate" |

**Migration Notes**:
- `text-cyber-red` → Check context: Brand (`text-brand-primary`) or Error (`text-status-error`)?
- `text-cyber-green` → Always `text-status-success`
- `text-cyber-purple` → Brand secondary (`text-brand-secondary`)

---

### 2.4 Responsive Breakpoint Strategy

**Problem**: Desktop-first design causing mobile issues.

**Solution**: Mobile-first breakpoints with clear scaling strategy.

#### Breakpoint System

```typescript
// frontend/src/design-system/tokens/breakpoints.ts

export const breakpoints = {
  sm: '640px',   // Mobile landscape / Small tablets
  md: '768px',   // Tablets
  lg: '1024px',  // Laptops / Small desktops
  xl: '1280px',  // Desktops
  '2xl': '1536px', // Large desktops
} as const;

export const breakpointValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;
```

#### Mobile-First Responsive Patterns

```typescript
// Pattern 1: Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>

// Pattern 2: Hidden on mobile, visible on desktop
<div className="hidden md:block">Desktop only content</div>

// Pattern 3: Different font sizes
<h1 className="text-2xl md:text-3xl lg:text-4xl">Responsive Heading</h1>

// Pattern 4: Padding scales up
<div className="p-4 md:p-6 lg:p-8">Responsive padding</div>

// Pattern 5: Grid columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Auto-responsive grid */}
</div>
```

#### useBreakpoint Hook

```typescript
// frontend/src/design-system/hooks/useBreakpoint.ts

import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1536) setBreakpoint('2xl');
      else if (width >= 1280) setBreakpoint('xl');
      else if (width >= 1024) setBreakpoint('lg');
      else if (width >= 768) setBreakpoint('md');
      else if (width >= 640) setBreakpoint('sm');
      else setBreakpoint('xs');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};

// Usage:
const breakpoint = useBreakpoint();
const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
```

---

### 2.5 Spacing & Layout Constants

**Problem**: Inconsistent spacing leading to visual misalignment.

**Solution**: 8px baseline grid system.

#### Spacing Tokens

```typescript
// frontend/src/design-system/tokens/spacing.ts

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px  - BASE UNIT
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;
```

#### Layout Components

```typescript
// frontend/src/design-system/layouts/Container.tsx

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const maxWidths = {
  sm: 'max-w-screen-sm',   // 640px
  md: 'max-w-screen-md',   // 768px
  lg: 'max-w-screen-lg',   // 1024px
  xl: 'max-w-screen-xl',   // 1280px
  '2xl': 'max-w-screen-2xl', // 1536px
  full: 'max-w-full',
};

export const Container: React.FC<ContainerProps> = ({ 
  children, 
  maxWidth = 'xl',
  className = '' 
}) => (
  <div className={`mx-auto px-4 md:px-6 lg:px-8 ${maxWidths[maxWidth]} ${className}`}>
    {children}
  </div>
);
```

---

### 2.6 Input & Form Components

**Problem**: Inconsistent form styling, poor mobile usability.

**Solution**: Unified form component system with proper touch targets.

#### Input Component

```typescript
// frontend/src/design-system/components/Input/Input.tsx

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'cyber';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClasses = {
  sm: 'h-9 px-3 text-sm',    // 36px - WARNING: close to minimum
  md: 'h-11 px-4 text-base', // 44px - MINIMUM recommended
  lg: 'h-13 px-6 text-lg',   // 52px - EXCELLENT
};

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  variant = 'cyber',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseClasses = 'w-full font-mono border-2 rounded-sm transition-all duration-300 focus:outline-none';
  const variantClasses = variant === 'cyber'
    ? 'bg-cyber-darker border-cyber-gray text-cyber-gray-light focus:border-brand-primary focus:shadow-cyber placeholder:text-cyber-gray'
    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-brand-secondary uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-gray">
            {leftIcon}
          </div>
        )}
        <input
          className={`
            ${baseClasses}
            ${variantClasses}
            ${sizeClasses[size]}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-status-error focus:border-status-error' : ''}
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-gray">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-status-error cyber-glow">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-cyber-gray-light">{helperText}</p>
      )}
    </div>
  );
};
```

---

### 2.7 Card, Panel & Modal Components

#### Card Component

```typescript
// frontend/src/design-system/components/Card/Card.tsx

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glow' | 'interactive';
  glowColor?: 'red' | 'green' | 'purple' | 'blue';
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  glowColor = 'red',
  onClick,
  className = '',
}) => {
  const baseClasses = 'bg-cyber-darker border-2 border-cyber-gray rounded-sm transition-all duration-300';
  const variantClasses = {
    default: '',
    glow: `hover:border-brand-primary hover:shadow-cyber`,
    interactive: `cursor-pointer hover:scale-105 hover:border-brand-primary hover:shadow-cyber`,
  };

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-4 py-3 md:px-6 md:py-4 border-b border-cyber-gray">
    {children}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 md:p-6">
    {children}
  </div>
);
```

#### Modal Component (Responsive)

```typescript
// frontend/src/design-system/components/Modal/Modal.tsx

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4', // Mobile: full width with margin
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`
          w-full ${sizeClasses[size]} 
          bg-cyber-dark border-2 border-brand-primary rounded-sm 
          shadow-cyber max-h-[90vh] overflow-y-auto
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-cyber-gray">
            <Heading level={3} color="red" glow>{title}</Heading>
            <button
              onClick={onClose}
              className="text-cyber-gray-light hover:text-brand-primary transition-colors text-2xl"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
```

---

### 2.8 Table Responsive Design

**Problem**: Tables overflow on mobile, poor touch interaction.

**Solution**: Responsive table with card-based mobile view.

```typescript
// frontend/src/design-system/components/Table/ResponsiveTable.tsx

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  mobileLabel?: string; // Label for mobile card view
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
}: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-cyber-gray">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-bold text-brand-secondary uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={`
                  border-b border-cyber-gray transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-cyber-darker' : ''}
                `}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 text-sm text-cyber-gray-light">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((row, idx) => (
          <Card
            key={idx}
            variant={onRowClick ? 'interactive' : 'default'}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent>
              {columns.map((col, colIdx) => (
                <div key={colIdx} className="flex justify-between py-2 border-b border-cyber-gray last:border-0">
                  <span className="text-xs font-bold text-brand-secondary uppercase">
                    {col.mobileLabel || col.header}
                  </span>
                  <span className="text-sm text-cyber-gray-light">
                    {col.render ? col.render(row) : row[col.key]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
```

---

## 3. Tailwind Configuration Updates

### 3.1 Complete Updated Config

```javascript
// frontend/tailwind.config.js - COMPLETE UPDATED VERSION

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Color System (Brand + Status separation)
      colors: {
        // Brand colors
        'brand-primary': '#ff0040',
        'brand-primary-dark': '#cc0033',
        'brand-secondary': '#8b5cf6',
        'brand-secondary-light': '#a78bfa',
        
        // Status colors
        'status-success': '#00ff88',
        'status-success-dark': '#00cc6a',
        'status-error': '#ff4444',
        'status-error-dark': '#cc0000',
        'status-warning': '#ffff00',
        'status-warning-dark': '#cccc00',
        'status-info': '#00d4ff',
        'status-info-dark': '#00a8cc',
        
        // Neutral palette
        'cyber-black': '#0a0a0a',
        'cyber-dark': '#111111',
        'cyber-darker': '#1a1a1a',
        'cyber-gray': '#2a2a2a',
        'cyber-gray-light': '#3a3a3a',
        
        // Legacy support (gradually deprecate)
        cyber: {
          black: '#0a0a0a',
          dark: '#111111',
          darker: '#1a1a1a',
          gray: '#2a2a2a',
          'gray-light': '#3a3a3a',
          red: '#ff0040',
          'red-dark': '#cc0033',
          purple: '#8b5cf6',
          'purple-dark': '#7c3aed',
          'purple-light': '#a78bfa',
          green: '#00ff88',
          'green-dark': '#00cc6a',
          blue: '#00d4ff',
          'blue-dark': '#00a8cc',
          yellow: '#ffff00',
          'yellow-dark': '#cccc00',
        },
      },
      
      // Font families
      fontFamily: {
        primary: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        code: ['Source Code Pro', 'JetBrains Mono', 'Fira Code', 'monospace'],
        mono: ['JetBrains Mono', 'Source Code Pro', 'monospace'], // Legacy
        terminal: ['Source Code Pro', 'JetBrains Mono', 'monospace'], // Legacy
      },
      
      // Typography scale (mobile-first, responsive)
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.2' }],     // 12px
        sm: ['0.875rem', { lineHeight: '1.4' }],    // 14px
        base: ['1rem', { lineHeight: '1.5' }],      // 16px - WCAG recommended
        lg: ['1.125rem', { lineHeight: '1.5' }],    // 18px
        xl: ['1.25rem', { lineHeight: '1.4' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '1.3' }],   // 24px
        '3xl': ['1.875rem', { lineHeight: '1.25' }],// 30px
        '4xl': ['2.25rem', { lineHeight: '1.2' }],  // 36px
      },
      
      // Spacing (8px baseline grid)
      spacing: {
        0: '0',
        1: '0.25rem',   // 4px
        2: '0.5rem',    // 8px
        3: '0.75rem',   // 12px
        4: '1rem',      // 16px
        5: '1.25rem',   // 20px
        6: '1.5rem',    // 24px
        8: '2rem',      // 32px
        10: '2.5rem',   // 40px
        11: '2.75rem',  // 44px - Touch target minimum
        12: '3rem',     // 48px
        13: '3.25rem',  // 52px - Good touch target
        15: '3.75rem',  // 60px - Excellent touch target
        16: '4rem',     // 64px
        20: '5rem',     // 80px
        24: '6rem',     // 96px
      },
      
      // Border radius (sharp cyberpunk aesthetic)
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
      },
      
      // Box shadows (cyberpunk glow effects)
      boxShadow: {
        cyber: '0 0 10px rgba(255, 0, 64, 0.3)',
        'cyber-purple': '0 0 10px rgba(139, 92, 246, 0.3)',
        'cyber-green': '0 0 10px rgba(0, 255, 136, 0.3)',
        'cyber-blue': '0 0 10px rgba(0, 212, 255, 0.3)',
      },
      
      // Animations
      animation: {
        'pulse-cyber': 'pulse-cyber 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-cyber': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 5px rgba(255, 0, 64, 0.5)',
          },
          '50%': {
            opacity: '.8',
            boxShadow: '0 0 20px rgba(255, 0, 64, 0.8)',
          },
        },
        'glow': {
          'from': {
            textShadow: '0 0 5px rgba(255, 0, 64, 0.5)',
          },
          'to': {
            textShadow: '0 0 20px rgba(255, 0, 64, 0.8), 0 0 30px rgba(255, 0, 64, 0.6)',
          },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 4. Migration Strategy

### 4.1 Gradual vs. Big-Bang Approach

**Recommendation**: **Gradual Migration** (Phased approach)

**Justification**:
- Lower risk of breaking existing functionality
- Team can learn the system incrementally
- User-facing features remain stable
- Easier to revert if issues arise
- Allows for refinement based on feedback

### 4.2 Migration Phases

#### Phase 1: Foundation (Week 1-2)
**Goal**: Establish design system infrastructure

**Tasks**:
1. Create `frontend/src/design-system/` folder structure
2. Implement token files (colors, typography, spacing, breakpoints)
3. Update `tailwind.config.js` with new color system
4. Create utility hooks (`useBreakpoint`, `useMediaQuery`, `useTouchDevice`)
5. Set up Storybook for component documentation (optional but recommended)

**Success Criteria**:
- All tokens accessible via imports
- Tailwind config builds without errors
- Hooks tested and working

#### Phase 2: Core Components (Week 3-4)
**Goal**: Build foundational components

**Tasks**:
1. Implement `Button` component with all variants
2. Implement `Input`, `TextArea`, `Select` components
3. Implement `Heading`, `Text`, `Code` typography components
4. Implement `Card`, `CardHeader`, `CardContent` components
5. Write unit tests for each component
6. Document components in Storybook

**Success Criteria**:
- 100% TypeScript coverage
- All variants render correctly
- Responsive behavior verified on mobile/desktop

#### Phase 3: Layout Components (Week 5)
**Goal**: Build responsive layout utilities

**Tasks**:
1. Implement `Container`, `Grid`, `Stack`, `Flex` components
2. Implement `Modal`, `Panel` components
3. Implement `ResponsiveTable` component
4. Test on various screen sizes

**Success Criteria**:
- Components work across all breakpoints
- Touch targets meet 44px minimum
- Mobile-first patterns verified

#### Phase 4: Page Migration (Week 6-8)
**Goal**: Migrate existing pages to use design system

**Priority Order**:
1. **Week 6**: `Login.tsx` (simplest, lowest risk)
2. **Week 7**: `Dashboard.tsx`, `Assets.tsx` (high visibility)
3. **Week 8**: `Scans.tsx`, `Traffic.tsx`, `Access.tsx` (complex pages)

**Migration Process per Page**:
1. Identify all button instances → Replace with `<Button variant="..." />`
2. Identify all input fields → Replace with `<Input />`
3. Identify all headings → Replace with `<Heading level={1-6} />`
4. Update color classes: `text-cyber-red` → Check context → `text-brand-primary` or `text-status-error`
5. Add responsive classes: `text-xl` → `text-xl md:text-2xl lg:text-3xl`
6. Test on mobile/tablet/desktop
7. Fix any layout issues

**Example Migration (Dashboard.tsx)**:

```diff
// BEFORE
- <button className="btn-cyber px-4 py-2 text-sm font-medium uppercase tracking-wider">
-   Start Scan
- </button>

// AFTER
+ import { Button } from '../design-system';
+ <Button variant="primary" size="md">Start Scan</Button>

// BEFORE
- <div className="text-cyber-red text-xl font-bold tracking-wider uppercase cyber-glow-red">
-   NOP NETWORK
- </div>

// AFTER
+ import { Heading } from '../design-system';
+ <Heading level={2} color="red" glow>NOP NETWORK</Heading>

// BEFORE
- <div className="text-cyber-green">Connected</div>

// AFTER
+ <span className="text-status-success">Connected</span>
```

#### Phase 5: Deprecation (Week 9-10)
**Goal**: Remove old CSS classes and duplicated code

**Tasks**:
1. Search for deprecated classes: `btn-cyber`, `input-cyber`, `text-cyber-red` (ambiguous)
2. Update or remove from `index.css`
3. Add linting rules to prevent old classes
4. Document deprecated patterns in README

**Success Criteria**:
- No deprecated classes in codebase
- CSS file size reduced by 30-40%
- No visual regressions

#### Phase 6: Optimization (Week 11-12)
**Goal**: Performance and accessibility improvements

**Tasks**:
1. Code splitting for design system components
2. Lazy loading for modals and large components
3. Accessibility audit (WCAG 2.1 AA)
4. Performance testing (Lighthouse)
5. Browser compatibility testing

**Success Criteria**:
- Lighthouse score ≥90 (Performance, Accessibility)
- All touch targets ≥44px
- Keyboard navigation works for all components

### 4.3 Big-Bang Alternative (NOT RECOMMENDED)

**If time constraints require faster migration**:

**Week 1**: Create all components + tokens  
**Week 2**: Mass find-replace across all files  
**Week 3**: Fix breaking changes and bugs  
**Week 4**: Testing and refinement

**Risks**:
- High chance of breaking changes
- Difficult to debug issues
- User-facing downtime possible
- Team overwhelmed with fixes

---

## 5. Trade-offs & Alternatives Considered

### 5.1 Component Library Choice

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Custom (Chosen)** | Full control, perfect brand fit, lightweight, no dependencies | More initial development time | ✅ **Selected** - Cyberpunk aesthetic requires custom design |
| **Tailwind UI** | Pre-built, fast implementation | Generic look, expensive ($299), hard to customize | ❌ Rejected - Doesn't match cyberpunk theme |
| **shadcn/ui** | Excellent TypeScript, customizable | Still requires heavy customization, opinionated structure | ❌ Rejected - Overhead not justified |
| **Headless UI** | Accessible primitives, flexible | Still need to style everything | 🤔 Consider for complex components (Combobox, Tabs) |

**Final Decision**: Custom components with Headless UI for complex interactions.

---

### 5.2 Color System Approach

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Separate Brand/Status (Chosen)** | Clear semantic meaning, scalable, prevents confusion | Requires migration, more color tokens | ✅ **Selected** |
| **Keep Current System** | No migration needed | Semantic confusion continues, hard to maintain | ❌ Rejected |
| **CSS Variables** | Dynamic theming possible | More complex, older browser support issues | ❌ Rejected - Not needed for single theme |

---

### 5.3 Typography Strategy

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Single Font (JetBrains Mono)** | Simplicity, smaller bundle, faster load | Less visual hierarchy | ❌ Rejected |
| **Dual Font (Chosen)** | Clear UI vs. code distinction, better readability | Slightly larger bundle (~50KB) | ✅ **Selected** |
| **Add Sans-Serif** | Better body text readability | Breaks cyberpunk aesthetic | ❌ Rejected |

**Final Decision**: JetBrains Mono (UI) + Source Code Pro (code blocks/terminals)

---

### 5.4 Responsive Strategy

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Mobile-First (Chosen)** | Better mobile experience, aligns with modern best practices, progressive enhancement | Requires rethinking desktop layouts | ✅ **Selected** |
| **Desktop-First** | Easier to implement (current state) | Poor mobile experience, doesn't scale down well | ❌ Rejected |
| **Separate Mobile App** | Optimal for each platform | Double maintenance, more resources | ❌ Rejected - Overkill |

---

### 5.5 Migration Strategy

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Gradual (Chosen)** | Low risk, incremental learning, stable production | Slower, temporary inconsistency | ✅ **Selected** |
| **Big-Bang** | Fast, immediate consistency | High risk, potential downtime, overwhelming | ❌ Rejected - Too risky |
| **Dual System (Parallel)** | Zero risk during transition | Massive code duplication, confusing for developers | ❌ Rejected - Unmaintainable |

---

## 6. Expected Outcomes

### 6.1 Quantifiable Improvements

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Button Variants** | 100+ inconsistent | 20 standardized | 80% reduction |
| **CSS File Size** | ~15KB | ~9KB | 40% reduction |
| **Code Duplication** | 40-50% | <10% | 75% reduction |
| **Mobile Touch Targets** | 32px (too small) | 44px minimum | 37.5% increase |
| **Font Families** | 2 (unclear usage) | 2 (clear roles) | 100% clarity |
| **Color Tokens** | Semantic overlap | Clear separation | Eliminates confusion |
| **Component Reusability** | Low | High | 5x faster development |

### 6.2 Developer Experience

**Before**:
```tsx
// 15 lines of inline classes, hard to read
<button className="bg-cyber-red border-2 border-cyber-red text-cyber-black hover:bg-cyber-red-dark hover:border-cyber-red-dark hover:shadow-cyber active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium uppercase tracking-wider">
  Start Scan
</button>
```

**After**:
```tsx
// 1 line, self-documenting
<Button variant="primary" size="md">Start Scan</Button>
```

### 6.3 User Experience

- **Mobile Users**: Larger touch targets, responsive layouts, no horizontal scrolling
- **Accessibility**: Screen reader support, keyboard navigation, WCAG 2.1 AA compliance
- **Performance**: Faster load times, smaller bundle size, optimized re-renders
- **Consistency**: Unified visual language across all pages

---

## 7. Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Create `design-system/` folder structure
- [ ] Implement `tokens/colors.ts`
- [ ] Implement `tokens/typography.ts`
- [ ] Implement `tokens/spacing.ts`
- [ ] Implement `tokens/breakpoints.ts`
- [ ] Update `tailwind.config.js`
- [ ] Create `hooks/useBreakpoint.ts`
- [ ] Create `hooks/useMediaQuery.ts`
- [ ] Create `hooks/useTouchDevice.ts`

### Phase 2: Core Components ✅
- [ ] Implement `Button` component + types
- [ ] Implement `Input` component
- [ ] Implement `TextArea` component
- [ ] Implement `Select` component
- [ ] Implement `Heading` component
- [ ] Implement `Text` component
- [ ] Implement `Code` component
- [ ] Write unit tests

### Phase 3: Layout Components ✅
- [ ] Implement `Container` component
- [ ] Implement `Grid` component
- [ ] Implement `Stack` component
- [ ] Implement `Flex` component
- [ ] Implement `Card` + `CardHeader` + `CardContent`
- [ ] Implement `Modal` component
- [ ] Implement `Panel` component
- [ ] Implement `ResponsiveTable` component

### Phase 4: Page Migration ✅
- [ ] Migrate `Login.tsx`
- [ ] Migrate `Dashboard.tsx`
- [ ] Migrate `Assets.tsx`
- [ ] Migrate `Scans.tsx`
- [ ] Migrate `Traffic.tsx`
- [ ] Migrate `Access.tsx`
- [ ] Migrate `Topology.tsx`
- [ ] Migrate `Settings.tsx`

### Phase 5: Deprecation ✅
- [ ] Remove deprecated CSS classes
- [ ] Update linting rules
- [ ] Document deprecated patterns
- [ ] Verify no visual regressions

### Phase 6: Optimization ✅
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Accessibility audit
- [ ] Performance testing
- [ ] Browser compatibility

---

## 8. Appendix

### 8.1 Color Palette Reference

```css
/* Brand Colors */
--brand-primary: #ff0040;           /* Logo, primary CTAs */
--brand-primary-dark: #cc0033;      /* Hover states */
--brand-secondary: #8b5cf6;         /* Secondary actions */
--brand-secondary-light: #a78bfa;   /* Hover states */

/* Status Colors */
--status-success: #00ff88;          /* Success, online */
--status-success-dark: #00cc6a;
--status-error: #ff4444;            /* Errors, danger */
--status-error-dark: #cc0000;
--status-warning: #ffff00;          /* Warnings */
--status-warning-dark: #cccc00;
--status-info: #00d4ff;             /* Info, neutral */
--status-info-dark: #00a8cc;

/* Neutral */
--neutral-black: #0a0a0a;
--neutral-darkest: #111111;
--neutral-darker: #1a1a1a;
--neutral-dark: #2a2a2a;
--neutral-gray: #3a3a3a;
--neutral-gray-light: #4a4a4a;
--neutral-text: #e0e0e0;
```

### 8.2 Breakpoint Reference

| Breakpoint | Min Width | Target Devices |
|------------|-----------|----------------|
| `xs` | 0px | Mobile portrait |
| `sm` | 640px | Mobile landscape, small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops, small desktops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### 8.3 Touch Target Guidelines

| Element | Minimum Size | Recommended Size |
|---------|--------------|------------------|
| Button | 44x44px | 52x52px |
| Icon Button | 44x44px | 48x48px |
| Input Field | 44px height | 52px height |
| Checkbox | 44x44px | 44x44px |
| Link (standalone) | 44px height | - |

---

## Conclusion

This design system provides a comprehensive, production-ready solution to standardize the NOP frontend. The mobile-first approach, clear component hierarchy, and semantic color system address all identified issues while maintaining the distinctive cyberpunk aesthetic.

**Key Recommendations**:
1. **Adopt gradual migration** strategy (12-week timeline)
2. **Start with Phase 1** (Foundation) immediately
3. **Prioritize Login and Dashboard** for early wins
4. **Measure success** via metrics (bundle size, touch targets, code duplication)

**Next Steps**:
1. Review and approve this design document
2. Create GitHub issues for each phase
3. Assign developers to Phase 1 tasks
4. Set up Storybook for component documentation
5. Begin implementation

---

**[AKIS] entities=8 | skills=frontend-react | patterns=component-system,responsive-design,mobile-first**
