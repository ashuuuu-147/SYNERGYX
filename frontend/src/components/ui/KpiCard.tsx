import React from 'react';
import { Card } from './Card';

export interface KpiCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  subtitle?: string;
  changePercent?: number | null;
  changeCaveat?: string;
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  changePercent,
  changeCaveat,
  icon,
}) => {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <Card
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {icon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-surface)',
              color: 'var(--brand-primary)',
              border: '1px solid var(--border-default)',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          className="tabular-nums"
          style={{
            fontSize: '32px',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            color: hasValue ? 'var(--text-primary)' : 'var(--text-disabled)',
            letterSpacing: '-0.5px',
          }}
        >
          {hasValue ? value : '—'}
        </span>
        {hasValue && unit && (
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>

      {changePercent !== null && changePercent !== undefined ? (
        <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: changePercent <= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: changePercent <= 0 ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {changePercent > 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>vs previous month</span>
        </div>
      ) : changeCaveat ? (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{changeCaveat}</span>
      ) : subtitle ? (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtitle}</span>
      ) : null}
    </Card>
  );
};
