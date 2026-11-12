import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Lightbulb } from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Practical Recommendations</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Targeted efficiency measures based on detected inefficiencies
        </p>
      </div>

      <Card>
        <EmptyState
          icon={<Lightbulb size={28} />}
          title="No Active Recommendations"
          description="Recommendations will be generated automatically when operational insights detect actionable improvement opportunities."
        />
      </Card>
    </div>
  );
};
