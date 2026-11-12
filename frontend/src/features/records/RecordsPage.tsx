import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { DocumentsTab } from './DocumentsTab';
import { UtilityTab } from './UtilityTab';
import { ProductionTab } from './ProductionTab';


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

      {activeTab === 'utility' ? (
        <UtilityTab />
      ) : activeTab === 'production' ? (
        <ProductionTab />
      ) : (
        <DocumentsTab />
      )}
    </div>
  );
};

