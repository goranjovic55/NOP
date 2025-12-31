---
name: cyberpunk-theme
description: Cyberpunk UI theming with Tailwind CSS and green accents. Use when styling UI components for consistency.
---

# Cyberpunk UI Theme

## When to Use
- Styling new components
- Maintaining visual consistency
- Creating themed UI elements
- Implementing dark mode

## Pattern
Consistent color palette and styling system

## Checklist
- [ ] Use green (#22c55e) as primary accent color
- [ ] Gray-800/900 for backgrounds
- [ ] Border with green-500 at 30% opacity
- [ ] Hover states increase opacity
- [ ] Geometric symbols for visual interest

## Theme Configuration

### Tailwind Config
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        cyber: {
          green: '#22c55e',
          greenDark: '#16a34a',
          cyan: '#06b6d4',
          purple: '#a855f7',
          bg: '#111827',
          surface: '#1f2937',
          border: '#374151',
        }
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.5)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
      },
      animation: {
        'pulse-glow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  }
}
```

### Theme Constants
```tsx
export const theme = {
  colors: {
    primary: '#22c55e',        // green-500
    primaryHover: '#16a34a',   // green-600
    accent: '#06b6d4',         // cyan-500
    background: '#111827',     // gray-900
    surface: '#1f2937',        // gray-800
    surfaceHover: '#374151',   // gray-700
    border: '#374151',         // gray-700
    borderAccent: '#22c55e4d', // green-500/30
    text: '#f3f4f6',           // gray-100
    textMuted: '#9ca3af',      // gray-400
    textAccent: '#22c55e',     // green-400
  },
  
  shadows: {
    glow: 'shadow-lg shadow-green-500/50',
    glowHover: 'shadow-xl shadow-green-500/70',
    glowCyan: 'shadow-lg shadow-cyan-500/50',
  },
  
  classes: {
    card: 'bg-gray-800 border border-green-500/30 rounded-lg p-4 transition-all duration-300 hover:border-green-500/50',
    button: 'bg-green-600/20 hover:bg-green-600/40 border border-green-500 text-green-400 px-4 py-2 rounded transition-all',
    input: 'bg-gray-900 border border-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-white px-3 py-2 rounded',
    badge: 'inline-block px-3 py-1 bg-green-500/10 border border-green-500 rounded-full text-green-400 text-sm',
  }
};
```

## Component Examples

### Glowing Card
```tsx
export const GlowingCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="
      relative
      bg-gray-800
      border border-green-500/30
      rounded-lg
      p-6
      transition-all
      duration-300
      hover:border-green-500/60
      hover:shadow-lg
      hover:shadow-green-500/50
      group
    ">
      {/* Corner accent */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-green-500" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-green-500" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-green-500" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-green-500" />
      
      {children}
    </div>
  );
};
```

### Status Indicator
```tsx
interface StatusProps {
  status: 'active' | 'completed' | 'failed' | 'pending';
}

export const StatusIndicator: React.FC<StatusProps> = ({ status }) => {
  const config = {
    active: {
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500',
      glow: 'shadow-green-500/50',
      icon: '●'
    },
    completed: {
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500',
      glow: 'shadow-cyan-500/50',
      icon: '✓'
    },
    failed: {
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500',
      glow: 'shadow-red-500/50',
      icon: '✗'
    },
    pending: {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500',
      glow: 'shadow-yellow-500/50',
      icon: '⏱'
    }
  };
  
  const { color, bg, border, glow, icon } = config[status];
  
  return (
    <span className={`
      inline-flex items-center gap-2
      px-3 py-1
      ${bg} ${border} ${color}
      border rounded-full
      text-sm font-medium
      shadow-lg ${glow}
      animate-pulse
    `}>
      <span>{icon}</span>
      <span>{status.toUpperCase()}</span>
    </span>
  );
};
```

### Geometric Border
```tsx
export const GeometricPanel: React.FC<{ title: string; children: React.ReactNode }> = ({ 
  title, 
  children 
}) => {
  return (
    <div className="relative bg-gray-800 p-6">
      {/* Top border pattern */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent" />
      
      {/* Side accents */}
      <div className="absolute top-0 left-0 w-px h-8 bg-green-500" />
      <div className="absolute top-0 right-0 w-px h-8 bg-green-500" />
      
      <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
        <span>▲</span>
        {title}
        <span>▲</span>
      </h2>
      
      <div className="text-gray-100">
        {children}
      </div>
    </div>
  );
};
```

### Animated Background
```tsx
export const CyberBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-green-900/20" />
      
      {/* Animated grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse" />
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
    </div>
  );
};
```

### Typography
```tsx
export const CyberText = {
  h1: "text-4xl font-bold text-green-400 tracking-wider",
  h2: "text-3xl font-bold text-green-400",
  h3: "text-2xl font-semibold text-green-400",
  body: "text-gray-100",
  muted: "text-gray-400",
  accent: "text-green-400",
  mono: "font-mono text-green-400",
};

// Usage
<h1 className={CyberText.h1}>NETWORK OBSERVATORY</h1>
<p className={CyberText.body}>Monitoring active connections...</p>
<code className={CyberText.mono}>192.168.1.1</code>
```
