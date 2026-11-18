import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', style, ...props }) => {
  let bg = 'var(--bg-secondary)';
  let color = 'var(--text-secondary)';
  let borderColor = 'var(--border-default)';

  if (variant === 'success') {
    bg = 'var(--success-bg)';
    color = 'var(--success)';
    borderColor = 'rgba(67, 141, 112, 0.25)';
  } else if (variant === 'warning') {
    bg = 'var(--warning-bg)';
    color = 'var(--warning)';
    borderColor = 'rgba(211, 155, 72, 0.25)';
  } else if (variant === 'danger') {
    bg = 'var(--danger-bg)';
    color = 'var(--danger)';
    borderColor = 'rgba(212, 111, 118, 0.25)';
  } else if (variant === 'info') {
    bg = 'var(--info-bg)';
    color = 'var(--info)';
    borderColor = 'rgba(113, 139, 198, 0.25)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '12px',
        fontWeight: 600,
        background: bg,
        color: color,
        border: `1px solid ${borderColor}`,
        lineHeight: 1.25,
        letterSpacing: '0.2px',
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
};
