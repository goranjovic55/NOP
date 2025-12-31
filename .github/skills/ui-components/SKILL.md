---
name: ui-components
description: Cyberpunk-themed UI component patterns with Tailwind CSS. Use when creating or styling UI components.
---

# UI Component Patterns

## When to Use
- Creating new UI components
- Styling existing components
- Maintaining theme consistency
- Implementing accessibility

## Pattern
Cyberpunk theme with Tailwind CSS

## Checklist
- [ ] Cyberpunk theme colors (green/cyan accents)
- [ ] Consistent spacing (Tailwind scale)
- [ ] Animated transitions (glowing borders)
- [ ] Accessibility (ARIA labels, keyboard nav)

## Theme Constants
```tsx
export const cyberpunkTheme = {
  colors: {
    primary: '#22c55e',      // green-500
    primaryDark: '#16a34a',  // green-600
    accent: '#06b6d4',       // cyan-500
    background: '#111827',   // gray-900
    surface: '#1f2937',      // gray-800
    border: '#374151',       // gray-700
    text: '#f3f4f6',         // gray-100
    textMuted: '#9ca3af',    // gray-400
  },
  effects: {
    glow: 'shadow-lg shadow-green-500/50',
    glowHover: 'hover:shadow-xl hover:shadow-green-500/70',
    borderGlow: 'border border-green-500/30',
  }
};
```

## Component Examples

### Card Component
```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`
      bg-gray-800 
      border border-green-500/30 
      rounded-lg 
      p-4 
      transition-all 
      duration-300
      hover:border-green-500/50
      ${className}
    `}>
      <h3 className="text-xl font-bold text-green-400 mb-4">
        {title}
      </h3>
      <div className="text-gray-100">
        {children}
      </div>
    </div>
  );
};
```

### Button Component
```tsx
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary',
  disabled = false 
}) => {
  const baseClasses = "px-4 py-2 rounded border font-medium transition-all duration-200";
  
  const variantClasses = {
    primary: "bg-green-600/20 hover:bg-green-600/40 border-green-500 text-green-400",
    secondary: "bg-gray-700/20 hover:bg-gray-700/40 border-gray-600 text-gray-300"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} disabled:opacity-50`}
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {children}
    </button>
  );
};
```

### Input Component
```tsx
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export const Input: React.FC<InputProps> = ({ 
  value, 
  onChange, 
  placeholder,
  type = 'text' 
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="
        bg-gray-900 
        border border-gray-700 
        focus:border-green-500 
        focus:ring-2 
        focus:ring-green-500/20
        text-white 
        px-3 
        py-2 
        rounded
        outline-none
        transition-all
      "
      aria-label={placeholder}
    />
  );
};
```

### Glowing Effect
```tsx
export const GlowingBadge: React.FC<{ text: string }> = ({ text }) => {
  return (
    <span className="
      inline-block
      px-3
      py-1
      bg-green-500/10
      border border-green-500
      rounded-full
      text-green-400
      text-sm
      font-medium
      shadow-lg shadow-green-500/50
      animate-pulse
    ">
      ▲ {text}
    </span>
  );
};
```
