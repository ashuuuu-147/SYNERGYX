import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', style, ...props }) => {
  let bg = 'var(--bg-secondary)';
  let color = 'var(--text-secondary)';

  if (variant === 'success') {
    bg = 'var(--success-bg)';
    color = 'var(--success)';
  } else if (variant === 'warning') {
    bg = 'var(--warning-bg)';
    color = 'var(--warning)';
  } else if (variant === 'danger') {
    bg = 'var(--danger-bg)';
    color = 'var(--danger)';
  } else if (variant === 'info') {
    bg = 'var(--info-bg)';
    color = 'var(--info)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '12px',
        fontWeight: 600,
        background: bg,
        color: color,
        lineHeight: 1.2,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
};
