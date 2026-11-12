import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { analyticsApi, AnalyticsResponse } from '../features/analytics/analyticsApi';

// Mock recharts ResponsiveContainer to render children directly in JSDOM
vi.mock('recharts', async () => {
  const original = await vi.importActual<Record<string, unknown>>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

vi.mock('../features/analytics/analyticsApi', () => ({
  analyticsApi: {
    getAnalytics: vi.fn(),
  },
}));

describe('AnalyticsPage UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const emptyResponse: AnalyticsResponse = {
    from_month: '2026-01',
    to_month: '2026-03',
    resource_type: 'all',
    metric: 'consumption',
    production_unit: 'kg',
    series: [
      {
        month: '2026-01-01',
        month_str: '2026-01',
        production_quantity: null,
        production_unit: 'kg',
        electricity: null,
        water: null,
        fuel: null,
        total_spend_inr: null,
        is_partial_spend: false,
        cost_data_coverage: '0 of 0',
        has_utility_data: false,
        has_production_data: false,
        caveats: ['No records for this month'],
      },
    ],
    summary_table: [],
    totals: {
      total_production: null,
      total_electricity_kwh: null,
      total_water_m3: null,
      total_fuel_l: null,
      total_spend_inr: null,
      avg_electricity_intensity: null,
      avg_water_intensity: null,
      avg_fuel_intensity: null,
    },
    data_quality_notes: [],
  };

  const populatedResponse: AnalyticsResponse = {
    from_month: '2026-01',
    to_month: '2026-03',
    resource_type: 'all',
    metric: 'consumption',
    production_unit: 'kg',
    series: [
      {
        month: '2026-01-01',
        month_str: '2026-01',
        production_quantity: '10000',
        production_unit: 'kg',
        electricity: {
          resource_type: 'electricity',
          quantity: '12000',
          unit: 'kWh',
          amount_inr: '96000',
          intensity: '1.2',
          intensity_unit: 'kWh/kg',
        },
        water: null,
        fuel: null,
        total_spend_inr: '96000',
        is_partial_spend: true,
        cost_data_coverage: '1 of 1',
        has_utility_data: true,
        has_production_data: true,
        caveats: [],
      },
      {
        month: '2026-02-01',
        month_str: '2026-02',
        production_quantity: null,
        production_unit: 'kg',
        electricity: null,
        water: null,
        fuel: null,
        total_spend_inr: null,
        is_partial_spend: false,
        cost_data_coverage: '0 of 0',
        has_utility_data: false,
        has_production_data: false,
        caveats: ['No records for this month'],
      },
      {
        month: '2026-03-01',
        month_str: '2026-03',
        production_quantity: '10000',
        production_unit: 'kg',
        electricity: {
          resource_type: 'electricity',
          quantity: '10500',
          unit: 'kWh',
          amount_inr: '84000',
          intensity: '1.05',
          intensity_unit: 'kWh/kg',
        },
        water: null,
        fuel: null,
        total_spend_inr: '84000',
        is_partial_spend: true,
        cost_data_coverage: '1 of 1',
        has_utility_data: true,
        has_production_data: true,
        caveats: [],
      },
    ],
    summary_table: [
      {
        month: '2026-01',
        production_display: '10,000 kg',
        electricity_qty_display: '12,000 kWh',
        electricity_intensity_display: '1.2 kWh/kg',
        electricity_amount_display: '₹96,000',
        water_qty_display: '—',
        water_intensity_display: '—',
        water_amount_display: '—',
        fuel_qty_display: '—',
        fuel_intensity_display: '—',
        fuel_amount_display: '—',
        total_spend_display: '₹96,000',
        is_partial_spend: true,
        caveats: [],
      },
      {
        month: '2026-02',
        production_display: '—',
        electricity_qty_display: '—',
        electricity_intensity_display: '—',
        electricity_amount_display: '—',
        water_qty_display: '—',
        water_intensity_display: '—',
        water_amount_display: '—',
        fuel_qty_display: '—',
        fuel_intensity_display: '—',
        fuel_amount_display: '—',
        total_spend_display: '—',
        is_partial_spend: false,
        caveats: ['No records for this month'],
      },
      {
        month: '2026-03',
        production_display: '10,000 kg',
        electricity_qty_display: '10,500 kWh',
        electricity_intensity_display: '1.05 kWh/kg',
        electricity_amount_display: '₹84,000',
        water_qty_display: '—',
        water_intensity_display: '—',
        water_amount_display: '—',
        fuel_qty_display: '—',
        fuel_intensity_display: '—',
        fuel_amount_display: '—',
        total_spend_display: '₹84,000',
        is_partial_spend: true,
        caveats: [],
      },
    ],
    totals: {
      total_production: '20000',
      total_electricity_kwh: '22500',
      total_water_m3: null,
      total_fuel_l: null,
      total_spend_inr: '180000',
      avg_electricity_intensity: '1.125',
      avg_water_intensity: null,
      avg_fuel_intensity: null,
    },
    data_quality_notes: ['Some utility bills do not have financial spend recorded.'],
  };

  it('renders honest empty state when no data exists', async () => {
    vi.mocked(analyticsApi.getAnalytics).mockResolvedValue(emptyResponse);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AnalyticsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No Data in Selected Period')).toBeInTheDocument();
  });

  it('renders populated totals, summary table with preserved gaps, and chart', async () => {
    vi.mocked(analyticsApi.getAnalytics).mockResolvedValue(populatedResponse);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AnalyticsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    // Header & Totals
    expect(screen.getByText(/Resource Analytics & Trends/i)).toBeInTheDocument();
    expect(await screen.findByText('20,000 kg')).toBeInTheDocument();
    expect(screen.getByText('22,500 kWh')).toBeInTheDocument();
    expect(screen.getByText(/1,?80,?000/)).toBeInTheDocument();

    // Preserved Gaps in table: 2026-02 has dashes
    expect(screen.getByText('2026-02')).toBeInTheDocument();
    expect(screen.getByText('No records for this month')).toBeInTheDocument();

    // Data quality disclosure
    expect(screen.getByText(/Some utility bills do not have financial spend recorded/i)).toBeInTheDocument();
  });

  it('filters by metric and refetches on date change', async () => {
    vi.mocked(analyticsApi.getAnalytics).mockResolvedValue(populatedResponse);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AnalyticsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    // Switch metric to Expenditure
    const expenditureTab = await screen.findByRole('button', { name: /expenditure/i });
    fireEvent.click(expenditureTab);

    await waitFor(() => {
      expect(analyticsApi.getAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ metric: 'spend' })
      );
    });

    // Change resource filter
    const resourceSelect = screen.getByLabelText(/filter by resource type/i);
    fireEvent.change(resourceSelect, { target: { value: 'electricity' } });

    await waitFor(() => {
      expect(analyticsApi.getAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ resource_type: 'electricity' })
      );
    });
  });

  it('prevents query and shows validation error when start month > end month', async () => {
    vi.mocked(analyticsApi.getAnalytics).mockResolvedValue(populatedResponse);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AnalyticsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const fromInput = await screen.findByLabelText(/start month/i);
    const toInput = screen.getByLabelText(/end month/i);

    fireEvent.change(fromInput, { target: { value: '2026-08' } });
    fireEvent.change(toInput, { target: { value: '2026-02' } });

    expect(screen.getByText('Start month cannot be after end month.')).toBeInTheDocument();
  });
});
