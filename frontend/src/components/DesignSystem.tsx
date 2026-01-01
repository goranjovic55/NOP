import React from 'react';

/**
 * Design System Component Library
 * Reusable UI components following cyberpunk theme
 */

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'info' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  active = false,
  className = '',
  children,
  ...props
}) => {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    info: 'btn-info',
    ghost: 'btn-ghost',
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
    xl: 'btn-xl',
  };

  const activeClass = active
    ? variant === 'success'
      ? 'btn-active-green'
      : variant === 'secondary'
      ? 'btn-active-purple'
      : 'btn-active-red'
    : '';

  return (
    <button
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${activeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Input Component
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'input-sm',
    md: 'input-md',
    lg: 'input-lg',
  };

  return (
    <input
      className={`input ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
};

// Select Component
interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'input-sm',
    md: 'input-md',
    lg: 'input-lg',
  };

  return (
    <select
      className={`select ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

// Card Component
interface CardProps {
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  hover = false,
  className = '',
  children,
}) => {
  return (
    <div className={`${hover ? 'card-hover' : 'card'} ${className}`}>
      {children}
    </div>
  );
};

// Card Header
export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`card-header ${className}`}>{children}</div>;
};

// Card Title
export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <h3 className={`card-title ${className}`}>{children}</h3>;
};

// Badge Component
interface BadgeProps {
  variant?: 'red' | 'green' | 'purple' | 'blue';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'red',
  children,
  className = '',
}) => {
  const variantClass = `badge-${variant}`;
  return <span className={`${variantClass} ${className}`}>{children}</span>;
};

// Status Indicator
interface StatusProps {
  status: 'online' | 'offline' | 'warning' | 'unknown';
  label?: string;
}

export const StatusIndicator: React.FC<StatusProps> = ({ status, label }) => {
  const statusClass = `status-${status}`;
  return (
    <div className="flex items-center space-x-2">
      <span className={statusClass}></span>
      {label && <span className="text-sm-cyber text-cyber-gray-light">{label}</span>}
    </div>
  );
};

// Icon Button
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <button className={`btn-icon ${className}`} {...props}>
      {children}
    </button>
  );
};

// Responsive Grid Container
interface GridProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export const ResponsiveGrid: React.FC<GridProps> = ({
  size = 'sm',
  className = '',
  children,
}) => {
  const sizeClass = size === 'md' ? 'grid-responsive-md' : size === 'lg' ? 'grid-responsive-lg' : 'grid-responsive';
  return <div className={`${sizeClass} ${className}`}>{children}</div>;
};

// Section Container with Responsive Padding
export const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`padding-responsive ${className}`}>{children}</div>;
};
