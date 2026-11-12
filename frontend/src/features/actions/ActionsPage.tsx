import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { ClipboardCheck, Plus } from 'lucide-react';

export const ActionsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Action Tracker</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Track implementation status of efficiency projects
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Plus size={16} />
          <span>New Action</span>
        </Button>
      </div>

      <Card>
        <EmptyState
          icon={<ClipboardCheck size={28} />}
          title="No Tracked Actions"
          description="Accept recommendations or create custom actions to log operational interventions and track before-and-after baselines."
        />
      </Card>
    </div>
  );
};

