import React from 'react';
import { Card } from './Card';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <Card
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-10) var(--space-6)',
        textAlign: 'center',
        gap: 'var(--space-3)',
      }}
    >
      {icon && (
        <div
          style={{
            color: 'var(--brand-primary)',
            background: 'var(--brand-soft)',
            padding: '16px',
            borderRadius: '50%',
            marginBottom: '4px',
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '420px' }}>
        {description}
      </p>
      {action && <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>}
    </Card>
  );
};
