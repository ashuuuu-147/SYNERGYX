import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { dashboardApi, DashboardSummary } from '../features/dashboard/dashboardApi';
import { authApi } from '../features/auth/authApi';

vi.mock('../features/dashboard/dashboardApi', () => ({
  dashboardApi: {
    getSummary: vi.fn(),
  },
}));

vi.mock('../features/auth/authApi', () => ({
  authApi: {
    getMe: vi.fn(),
  },
}));

describe('DashboardPage UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(authApi.getMe).mockResolvedValue({
      user: {
        id: 'user-1',
        organization_id: 'org-1',
        full_name: 'Vikram Joshi',
        email: 'vikram@textile.com',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      organization: {
        id: 'org-1',
        name: 'Textile Corp',
        industry: 'textile',
        location: 'Surat',
        country_code: 'IN',
        production_unit: 'kg',
        allow_external_ai: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
  });

  const emptySummary: DashboardSummary = {
    selected_month: '2026-05-01',
    latest_available_month: null,
    electricity: { resource_type: 'electricity', quantity: null, unit: 'kWh' },
    water: { resource_type: 'water', quantity: null, unit: 'm3' },
    fuel: { resource_type: 'fuel', quantity: null, unit: 'L' },
    production_quantity: null,
    production_unit: 'kg',
    total_spend_inr: null,
    is_partial_spend: false,
    utility_data_coverage: '0 of 3 utility types recorded',
    utility_recorded_count: 0,
    cost_data_coverage: '0 of 3 utility types',
    open_actions_count: 0,
    completed_actions_count: 0,
    latest_insights_count: 0,
  };

  const populatedSummary: DashboardSummary = {
    selected_month: '2026-03-01',
    latest_available_month: '2026-03-01',
    electricity: {
      resource_type: 'electricity',
      quantity: '10500',
      unit: 'kWh',
      amount_inr: '84000',
      intensity: '1.05',
      intensity_unit: 'kWh/kg',
      change_percent: '-12.5',
      observed_reduction_per_unit: '0.15',
      observed_resource_reduction: '1500',
      potential_saving_inr: '12000',
    },
    water: {
      resource_type: 'water',
      quantity: '55',
      unit: 'm3',
      amount_inr: '2200',
      intensity: '0.0055',
      intensity_unit: 'm3/kg',
    },
    fuel: {
      resource_type: 'fuel',
      quantity: '420',
      unit: 'L',
      amount_inr: '42000',
      intensity: '0.042',
      intensity_unit: 'L/kg',
    },
    production_quantity: '10000',
    production_unit: 'kg',
    total_spend_inr: '128200',
    is_partial_spend: false,
    utility_data_coverage: '3 of 3 utility types recorded',
    utility_recorded_count: 3,
    cost_data_coverage: '3 of 3 utility types',
    open_actions_count: 2,
    completed_actions_count: 1,
    latest_insights_count: 2,
  };

  it('renders honest empty state with no fabricated numbers', async () => {
    vi.mocked(dashboardApi.getSummary).mockResolvedValue(emptySummary);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Welcome back, Vikram/i)).toBeInTheDocument();
    expect(screen.getByText('No Utility or Production Records')).toBeInTheDocument();

    // Verify KPI cards render "—" for missing values
    const dashElements = screen.getAllByText('—');
    expect(dashElements.length).toBeGreaterThanOrEqual(4);
  });

  it('renders populated KPI metrics from Section 16 dataset', async () => {
    vi.mocked(dashboardApi.getSummary).mockResolvedValue(populatedSummary);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Welcome back, Vikram/i)).toBeInTheDocument();
    expect(screen.getByText('10,500')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('420')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('1.05')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 utility types recorded')).toBeInTheDocument();

    // Highlights
    expect(screen.getByText(/1,500 kWh reduced/i)).toBeInTheDocument();
    expect(screen.getByText(/12,000/)).toBeInTheDocument();
  });

  it('refetches summary when month selector changes', async () => {
    vi.mocked(dashboardApi.getSummary).mockResolvedValue(populatedSummary);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const monthInput = await screen.findByLabelText(/select dashboard month/i);
    fireEvent.change(monthInput, { target: { value: '2026-02' } });

    await waitFor(() => {
      expect(dashboardApi.getSummary).toHaveBeenCalledWith('2026-02');
    });
  });
});
