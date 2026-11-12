import React from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FileBarChart } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Monthly Performance Reports</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Export and print transparent resource summaries
        </p>
      </div>

      <Card>
        <EmptyState
          icon={<FileBarChart size={28} />}
          title="No Monthly Reports Generated"
          description="Reports synthesize utility totals, production intensity, and completed actions for a given calendar month."
        />
      </Card>
    </div>
  );
};

