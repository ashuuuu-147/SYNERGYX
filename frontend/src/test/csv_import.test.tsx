import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RecordsPage } from '../features/records/RecordsPage';
import { recordsImportApi } from '../features/records/recordsImportApi';

vi.mock('../features/records/recordsImportApi', () => ({
  recordsImportApi: {
    importCsv: vi.fn(),
  },
}));

vi.mock('../features/records/utilityApi', () => ({
  utilityApi: {
    getRecords: vi.fn().mockResolvedValue([]),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  },
}));

vi.mock('../features/records/productionApi', () => ({
  productionApi: {
    getRecords: vi.fn().mockResolvedValue([]),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  },
}));

vi.mock('../features/documents/documentApi', () => ({
  documentApi: {
    getDocuments: vi.fn().mockResolvedValue([]),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
}));

vi.mock('../features/organization/organizationApi', () => ({
  organizationApi: {
    getProfile: vi.fn().mockResolvedValue({
      id: 'org-123',
      name: 'Acme Textiles',
      industry: 'textile',
      production_unit: 'kg',
      location: 'Mumbai, IN',
      allow_external_ai: false,
    }),
  },
}));

describe('RecordsPage & CSV Bulk Import UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RecordsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders "Import CSV" button and opens the import modal', async () => {
    renderComponent();

    const importBtn = screen.getByRole('button', { name: /import csv/i });
    expect(importBtn).toBeInTheDocument();

    fireEvent.click(importBtn);

    expect(screen.getByText('Bulk Import Monthly Records')).toBeInTheDocument();
    expect(screen.getByText(/upload a csv file containing monthly utility and production records/i)).toBeInTheDocument();
    expect(screen.getByText(/download sample template/i)).toBeInTheDocument();
  });

  it('handles CSV upload and displays successful import summary', async () => {
    vi.mocked(recordsImportApi.importCsv).mockResolvedValueOnce({
      success: true,
      message: 'Successfully processed 5 months of records.',
      months_processed: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
      utility_records_created: 15,
      utility_records_updated: 0,
      production_records_created: 5,
      production_records_updated: 0,
      details: [
        {
          month: '2026-01',
          electricity_kwh: '4820.000',
          water_m3: '38.500',
          fuel_l: '620.000',
          production: '12400.000',
        },
      ],
    });

    renderComponent();

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /import csv/i }));

    // Simulate file selection
    const file = new File(['Month,Electricity\nJanuary,4820'], 'energy.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
    });
    fireEvent.change(fileInput);

    expect(screen.getByText('energy.csv')).toBeInTheDocument();

    // Click Import
    const uploadBtn = screen.getByRole('button', { name: /import records/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(screen.getByText('CSV Import Successful!')).toBeInTheDocument();
      expect(screen.getByText(/^15 entries$/)).toBeInTheDocument();
      expect(screen.getByText(/^5 entries$/)).toBeInTheDocument();
    });
  });
});
