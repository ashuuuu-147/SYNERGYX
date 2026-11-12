import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Database, Plus } from 'lucide-react';
import { DocumentsTab } from './DocumentsTab';

export const RecordsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'utility' | 'production' | 'documents'>('utility');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
        <Button
          variant={activeTab === 'utility' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('utility')}
        >
          Utility Records
        </Button>
        <Button
          variant={activeTab === 'production' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('production')}
        >
          Production Records
        </Button>
        <Button
          variant={activeTab === 'documents' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </Button>
      </div>

      {activeTab === 'documents' ? (
        <DocumentsTab />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
              {activeTab === 'utility' ? 'Monthly Utility Records' : 'Monthly Production Records'}
            </h2>
            <Button variant="outline" size="sm">
              <Plus size={16} />
              <span>{activeTab === 'utility' ? 'New Utility Record' : 'New Production Record'}</span>
            </Button>
          </div>

          <Card>
            <EmptyState
              icon={<Database size={28} />}
              title={`No ${activeTab} records found`}
              description={`Start tracking by creating your first monthly ${activeTab} entry.`}
            />
          </Card>
        </div>
      )}
    </div>
  );
};
