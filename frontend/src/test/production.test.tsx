import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductionTab } from '../features/records/ProductionTab';
import { productionApi, ProductionRecordItem } from '../features/records/productionApi';
import { organizationApi } from '../features/settings/organizationApi';

vi.mock('../features/records/productionApi', () => ({
  productionApi: {
    getRecords: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  },
}));

vi.mock('../features/settings/organizationApi', () => ({
  organizationApi: {
    getOrganization: vi.fn(),
  },
}));

describe('ProductionTab UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(organizationApi.getOrganization).mockResolvedValue({
      id: 'org-1',
      name: 'Super Textiles',
      industry: 'textile',
      location: 'Surat',
      country_code: 'IN',
      production_unit: 'kg',
      allow_external_ai: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  });

  const mockProduction: ProductionRecordItem[] = [
    {
      id: 'prod-1',
      organization_id: 'org-1',
      period_month: '2026-05-01',
      quantity: '45000.000',
      unit: 'kg',
      notes: 'Record shift output',
      created_at: '2026-05-01T10:00:00Z',
      updated_at: '2026-05-01T10:00:00Z',
    },
  ];

  it('renders empty state when no production records exist', async () => {
    vi.mocked(productionApi.getRecords).mockResolvedValueOnce([]);

    render(
      <QueryClientProvider client={queryClient}>
        <ProductionTab />
      </QueryClientProvider>
    );

    expect(await screen.findByText('No production records found')).toBeInTheDocument();
  });

  it('renders production records with inherited unit', async () => {
    vi.mocked(productionApi.getRecords).mockResolvedValueOnce(mockProduction);

    render(
      <QueryClientProvider client={queryClient}>
        <ProductionTab />
      </QueryClientProvider>
    );

    expect(await screen.findByText('45,000')).toBeInTheDocument();
    expect(screen.getByText('Unit: kg')).toBeInTheDocument();
    expect(screen.getByText('Record shift output')).toBeInTheDocument();
  });

  it('opens create modal with disabled unit field and submits new production record', async () => {
    vi.mocked(productionApi.getRecords).mockResolvedValueOnce(mockProduction);
    vi.mocked(productionApi.createRecord).mockResolvedValueOnce({
      id: 'prod-2',
      organization_id: 'org-1',
      period_month: '2026-06-01',
      quantity: '48000.000',
      unit: 'kg',
      notes: null,
      created_at: '2026-06-01T10:00:00Z',
      updated_at: '2026-06-01T10:00:00Z',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProductionTab />
      </QueryClientProvider>
    );

    await screen.findByText('45,000');

    const newBtn = screen.getByRole('button', { name: /new production record/i });
    fireEvent.click(newBtn);

    expect(screen.getByText('Record Monthly Production Output')).toBeInTheDocument();

    const qtyInput = screen.getByLabelText(/output quantity/i);
    fireEvent.change(qtyInput, { target: { value: '48000' } });

    const submitBtn = screen.getByRole('button', { name: /save production/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(productionApi.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: '48000',
        })
      );
    });
  });

  it('deletes production record after confirmation', async () => {
    vi.mocked(productionApi.getRecords).mockResolvedValueOnce(mockProduction);
    vi.mocked(productionApi.deleteRecord).mockResolvedValueOnce();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <QueryClientProvider client={queryClient}>
        <ProductionTab />
      </QueryClientProvider>
    );

    await screen.findByText('45,000');

    const deleteBtn = screen.getByRole('button', { name: /delete production record/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(productionApi.deleteRecord).toHaveBeenCalledWith('prod-1');
    });

    confirmSpy.mockRestore();
  });
});

