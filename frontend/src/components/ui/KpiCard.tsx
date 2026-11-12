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
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {icon && <div style={{ color: 'var(--brand-primary)' }}>{icon}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          className="tabular-nums"
          style={{
            fontSize: '32px',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            color: hasValue ? 'var(--text-primary)' : 'var(--text-disabled)',
          }}
        >
          {hasValue ? value : '—'}
        </span>
        {hasValue && unit && (
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>

      {changePercent !== null && changePercent !== undefined ? (
        <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              fontWeight: 600,
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
