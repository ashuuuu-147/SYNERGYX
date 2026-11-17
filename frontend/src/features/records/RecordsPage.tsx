import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DocumentsTab } from './DocumentsTab';
import { UtilityTab } from './UtilityTab';
import { ProductionTab } from './ProductionTab';
import { CsvImportModal } from './CsvImportModal';

export const RecordsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'utility' | 'production' | 'documents'>('utility');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Tab Navigation & Bulk Import Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--border-default)',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
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

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsImportModalOpen(true)}
          style={{ gap: '6px' }}
        >
          <FileSpreadsheet size={16} />
          <span>Import CSV</span>
        </Button>
      </div>

      {activeTab === 'utility' ? (
        <UtilityTab />
      ) : activeTab === 'production' ? (
        <ProductionTab />
      ) : (
        <DocumentsTab />
      )}

      {/* CSV Bulk Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

