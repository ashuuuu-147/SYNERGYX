import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Sparkles } from 'lucide-react';

export const InsightsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Operational Insights</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Evidence-based observations from your utility and production history
          </p>
        </div>
        <Button variant="primary">
          <Sparkles size={16} />
          <span>Generate Insights</span>
        </Button>
      </div>

      <Card>
        <EmptyState
          icon={<Sparkles size={28} />}
          title="No Insights Generated"
          description="Click 'Generate Insights' above after entering monthly data to run deterministic anomaly and intensity rules."
        />
      </Card>
    </div>
  );
};
