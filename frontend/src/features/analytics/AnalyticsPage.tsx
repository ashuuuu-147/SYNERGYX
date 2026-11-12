import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LineChart as ChartIcon } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Resource Analytics & Trends</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Historical consumption and production-normalized intensity
        </p>
      </div>

      <Card>
        <EmptyState
          icon={<ChartIcon size={28} />}
          title="Analytics Unavailable"
          description="At least two consecutive months of utility and production data are required to generate comparative trends and intensity curves."
        />
      </Card>
    </div>
  );
};

