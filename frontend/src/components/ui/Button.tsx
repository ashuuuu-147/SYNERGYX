import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      style,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: 'var(--radius-md)',
      fontWeight: 600,
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      opacity: disabled || isLoading ? 0.65 : 1,
      minHeight: size === 'sm' ? '36px' : size === 'lg' ? '50px' : '44px',
      padding: size === 'sm' ? '0 14px' : size === 'lg' ? '0 24px' : '0 18px',
      fontSize: size === 'sm' ? '13px' : size === 'lg' ? '16px' : '14px',
      border: '1px solid transparent',
      textDecoration: 'none',
      userSelect: 'none',
      position: 'relative',
    };

    let variantStyle: React.CSSProperties = {};
    if (variant === 'primary') {
      variantStyle = {
        background: 'var(--gradient-brand)',
        color: 'var(--text-inverse)',
        boxShadow: '0 2px 8px rgba(63, 51, 77, 0.25)',
      };
    } else if (variant === 'secondary') {
      variantStyle = {
        background: 'var(--brand-soft)',
        color: 'var(--brand-deep)',
        borderColor: 'var(--border-default)',
      };
    } else if (variant === 'outline') {
      variantStyle = {
        background: 'transparent',
        borderColor: 'var(--border-default)',
        color: 'var(--text-primary)',
      };
    } else if (variant === 'danger') {
      variantStyle = {
        background: 'var(--danger)',
        color: 'var(--text-inverse)',
      };
    } else if (variant === 'ghost') {
      variantStyle = {
        background: 'transparent',
        color: 'var(--text-secondary)',
      };
    }

    const buttonClass = `btn-animated btn-animated-${variant} ${className}`.trim();

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={buttonClass}
        style={{ ...baseStyle, ...variantStyle, ...style }}
        {...props}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
