import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, glass = false, style, className = '', ...props }) => {
  return (
    <div
      className={glass ? `glass-panel ${className}` : `premium-card ${className}`}
      style={{
        padding: 'var(--space-6)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
