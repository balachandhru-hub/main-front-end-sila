import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    fontWeight: 600,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid transparent',
    outline: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    width: fullWidth ? '100%' : 'auto',
  };

  // Harmonious theme matching the premium design system
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, var(--primary-color, #6366f1) 0%, var(--accent-color, #4f46e5) 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
    },
    secondary: {
      background: 'var(--surface-color, #1e293b)',
      color: 'var(--text-color, #f8fafc)',
      border: '1px solid var(--border-color, #334155)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--primary-color, #6366f1)',
      border: '1px solid var(--primary-color, #6366f1)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-muted, #94a3b8)',
      boxShadow: 'none',
    },
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '0.875rem' },
    md: { padding: '10px 20px', fontSize: '0.95rem' },
    lg: { padding: '14px 28px', fontSize: '1.1rem' },
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.md;

  // Hover animations handled inline or via simple dynamic style combining
  const combinedStyle = {
    ...baseStyle,
    ...currentVariant,
    ...currentSize,
    ...style,
  };

  return (
    <button
      style={combinedStyle}
      className={`vosox-button btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
