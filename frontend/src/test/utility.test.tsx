import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UtilityTab } from '../features/records/UtilityTab';
import { utilityApi, UtilityRecordItem } from '../features/records/utilityApi';
import { documentApi } from '../features/records/documentApi';

vi.mock('../features/records/utilityApi', () => ({
  utilityApi: {
    getRecords: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  },
}));

vi.mock('../features/records/documentApi', () => ({
  documentApi: {
    getDocuments: vi.fn(),
  },
}));

describe('UtilityTab UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(documentApi.getDocuments).mockResolvedValue([]);
  });

  const mockRecords: UtilityRecordItem[] = [
    {
      id: 'util-1',
      organization_id: 'org-1',
      resource_type: 'electricity',
      period_month: '2026-05-01',
      quantity: '14500.000',
      unit: 'kWh',
      amount_inr: '116000.00',
      document_id: null,
      notes: 'Main meter',
      created_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-05-01T10:00:00Z',
    },
    {
      id: 'util-2',
      organization_id: 'org-1',
      resource_type: 'water',
      period_month: '2026-05-01',
      quantity: '250.000',
      unit: 'm3',
      amount_inr: '12500.00',
      document_id: 'doc-1',
      notes: null,
      created_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-05-01T10:00:00Z',
    },
  ];

  it('renders empty state when no records exist', async () => {
    vi.mocked(utilityApi.getRecords).mockResolvedValueOnce([]);

    render(
      <QueryClientProvider client={queryClient}>
        <UtilityTab />
      </QueryClientProvider>
    );

    expect(await screen.findByText('No utility records found')).toBeInTheDocument();
  });

  it('renders utility records table with canonical quantities and units', async () => {
    vi.mocked(utilityApi.getRecords).mockResolvedValueOnce(mockRecords);

    render(
      <QueryClientProvider client={queryClient}>
        <UtilityTab />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/14[,.]?500 kWh/i)).toBeInTheDocument();
    expect(screen.getByText('250 m3')).toBeInTheDocument();
    expect(screen.getByText(/₹\s*1.*16.*000/)).toBeInTheDocument();
    expect(screen.getByText('Attached')).toBeInTheDocument();
  });

  it('opens create modal with correct initial units and saves a new record', async () => {
    vi.mocked(utilityApi.getRecords).mockResolvedValueOnce(mockRecords);
    vi.mocked(utilityApi.createRecord).mockResolvedValueOnce({
      id: 'util-3',
      organization_id: 'org-1',
      resource_type: 'fuel',
      period_month: '2026-05-01',
      quantity: '500.000',
      unit: 'L',
      amount_inr: '45000.00',
      document_id: null,
      notes: null,
      created_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-05-01T10:00:00Z',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UtilityTab />
      </QueryClientProvider>
    );

    await screen.findByText('14,500 kWh');

    const newBtn = screen.getByRole('button', { name: /new utility record/i });
    fireEvent.click(newBtn);

    expect(screen.getByText('Record Monthly Utility Entry')).toBeInTheDocument();

    const qtyInput = screen.getByLabelText(/quantity consumed/i);
    fireEvent.change(qtyInput, { target: { value: '500' } });

    const submitBtn = screen.getByRole('button', { name: /save record/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(utilityApi.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: '500',
          input_unit: 'kWh',
        })
      );
    });
  });

  it('deletes a utility record upon confirmation', async () => {
    vi.mocked(utilityApi.getRecords).mockResolvedValueOnce(mockRecords);
    vi.mocked(utilityApi.deleteRecord).mockResolvedValueOnce();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <QueryClientProvider client={queryClient}>
        <UtilityTab />
      </QueryClientProvider>
    );

    await screen.findByText('14,500 kWh');

    const deleteButtons = screen.getAllByRole('button', { name: /delete electricity record/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(utilityApi.deleteRecord).toHaveBeenCalledWith('util-1');
    });

    confirmSpy.mockRestore();
  });
});
