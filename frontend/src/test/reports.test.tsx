import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '../features/reports/ReportsPage';
import { reportsApi, MonthlyReportResponse } from '../features/reports/reportsApi';

vi.mock('../features/reports/reportsApi', () => ({
  reportsApi: {
    getMonthlyReport: vi.fn(),
    downloadMonthlyCsv: vi.fn(),
    downloadAnalyticsCsv: vi.fn(),
  },
}));

describe('ReportsPage UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const mockReport: MonthlyReportResponse = {
    metadata: {
      organization_name: 'Apex Fabrics Ltd',
      industry: 'textile',
      location: 'Surat, IN',
      report_month: '2026-03',
      generated_at: '2026-03-31T12:00:00Z',
      production_unit: 'kg',
    },
    summary: {
      production_quantity: '10000',
      production_unit: 'kg',
      total_spend_inr: '128200',
      spend_coverage: '3 of 3 utility types recorded',
      active_actions_count: 2,
      has_missing_data: false,
    },
    utilities: [
      {
        resource_type: 'electricity',
        quantity: '10500',
        unit: 'kWh',
        spend_inr: '84000',
        intensity: '1.0500',
        intensity_unit: 'kWh/kg',
        mom_quantity_change_pct: '-12.5',
        mom_intensity_change_pct: '-12.5',
        notes: 'Main plant sub-station meter',
      },
      {
        resource_type: 'water',
        quantity: '55',
        unit: 'm3',
        spend_inr: '2200',
        intensity: '0.0055',
        intensity_unit: 'm3/kg',
        mom_quantity_change_pct: '-8.3',
        mom_intensity_change_pct: '-8.3',
        notes: null,
      },
      {
        resource_type: 'fuel',
        quantity: '420',
        unit: 'L',
        spend_inr: '42000',
        intensity: '0.0420',
        intensity_unit: 'L/kg',
        mom_quantity_change_pct: '-4.5',
        mom_intensity_change_pct: '-4.5',
        notes: null,
      },
    ],
    insights: [
      {
        title: 'High Electricity Intensity Delta',
        severity: 'high',
        resource_type: 'electricity',
        description: 'Consumption decreased 12.5% following efficiency drive',
        source: 'rules',
        caveat: 'Observed reduction relative to prior calendar month',
      },
    ],
    recommendations: [
      {
        title: 'Optimise air compressor operating hours',
        priority: 'high',
        status: 'accepted',
        potential_saving_inr: '12000',
        practical_action: 'Audit leak points on line 2',
      },
    ],
    actions: [
      {
        title: 'Fix Loom Shed Air Leaks',
        status: 'in_progress',
        due_date: '2026-06-15',
        completed_at: null,
      },
    ],
    caveats: [
      'Operational resource summary based strictly on user-entered utility bills and production logs; not an externally certified ESG assurance report.',
    ],
  };

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders monthly report with metadata, KPIs, utility table, and non-certified disclosure', async () => {
    vi.mocked(reportsApi.getMonthlyReport).mockResolvedValue(mockReport);

    renderComponent();

    // Verify metadata
    expect(await screen.findByText('Apex Fabrics Ltd')).toBeDefined();
    expect(screen.getByText(/textile/i)).toBeDefined();
    expect(screen.getByText(/Surat, IN/i)).toBeDefined();
    expect(screen.getByText('Complete Record Set')).toBeDefined();

    // Verify non-certified disclosure per blueprint Section 5.10
    expect(screen.getByText(/not an externally verified ESG audit report/i)).toBeDefined();

    // Verify KPI summary
    expect(screen.getByText(/10,000 kg/)).toBeDefined();
    expect(screen.getByText(/₹1,28,200/)).toBeDefined();
    expect(screen.getByText(/Coverage: 3 of 3 utility types recorded/)).toBeDefined();

    // Verify utility consumption rows
    expect(screen.getByText('electricity')).toBeDefined();
    expect(screen.getByText(/10,500 kWh/)).toBeDefined();
    expect(screen.getByText(/1.0500 kWh\/kg/)).toBeDefined();
    expect(screen.getAllByText('-12.5%').length).toBeGreaterThanOrEqual(1);

    // Verify insight
    expect(screen.getByText('High Electricity Intensity Delta')).toBeDefined();

    // Verify caveats
    expect(screen.getByText(/not an externally certified ESG assurance report/i)).toBeDefined();
  });

  it('allows changing month and regenerating report', async () => {
    vi.mocked(reportsApi.getMonthlyReport).mockResolvedValue(mockReport);

    renderComponent();

    await screen.findByText('Apex Fabrics Ltd');

    const monthInput = screen.getByLabelText(/report calendar month/i);
    fireEvent.change(monthInput, { target: { value: '2026-02' } });

    const generateBtn = screen.getByRole('button', { name: /generate report/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(reportsApi.getMonthlyReport).toHaveBeenCalledWith('2026-02');
    });
  });

  it('triggers CSV download and window.print on action buttons', async () => {
    vi.mocked(reportsApi.getMonthlyReport).mockResolvedValue(mockReport);
    vi.mocked(reportsApi.downloadMonthlyCsv).mockResolvedValue(undefined);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    renderComponent();

    await screen.findByText('Apex Fabrics Ltd');

    // Test print
    const printBtn = screen.getByRole('button', { name: /print \/ save pdf/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();

    // Test CSV download
    const csvBtn = screen.getByRole('button', { name: /download csv/i });
    fireEvent.click(csvBtn);

    await waitFor(() => {
      expect(reportsApi.downloadMonthlyCsv).toHaveBeenCalled();
    });

    printSpy.mockRestore();
  });
});
