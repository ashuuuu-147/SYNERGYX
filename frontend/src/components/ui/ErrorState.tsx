import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  return (
    <Card
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        textAlign: 'center',
        gap: 'var(--space-3)',
        border: '1px solid var(--danger-bg)',
      }}
    >
      <div
        style={{
          color: 'var(--danger)',
          background: 'var(--danger-bg)',
          padding: '12px',
          borderRadius: '50%',
        }}
      >
        <AlertCircle size={28} />
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px' }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} style={{ marginTop: 'var(--space-2)' }}>
          Try Again
        </Button>
      )}
    </Card>
  );
};
