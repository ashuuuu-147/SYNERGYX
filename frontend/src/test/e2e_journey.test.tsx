import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { InsightsPage } from '../features/insights/InsightsPage';
import { RecommendationsPage } from '../features/recommendations/RecommendationsPage';
import { ActionsPage } from '../features/actions/ActionsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { authStorage } from '../lib/authStorage';
import { authApi } from '../features/auth/authApi';
import { dashboardApi } from '../features/dashboard/dashboardApi';
import { insightsApi } from '../features/insights/insightsApi';
import { recommendationsApi, RecommendationSummary } from '../features/recommendations/recommendationsApi';
import { actionsApi } from '../features/actions/actionsApi';
import { reportsApi } from '../features/reports/reportsApi';

vi.mock('../features/auth/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
  },
}));

vi.mock('../features/dashboard/dashboardApi', () => ({
  dashboardApi: {
    getSummary: vi.fn(),
  },
}));

vi.mock('../features/insights/insightsApi', () => ({
  insightsApi: {
    generateInsights: vi.fn(),
    listInsights: vi.fn(),
    dismissInsight: vi.fn(),
  },
}));

vi.mock('../features/recommendations/recommendationsApi', () => ({
  recommendationsApi: {
    listRecommendations: vi.fn(),
    acceptRecommendation: vi.fn(),
    dismissRecommendation: vi.fn(),
  },
}));

vi.mock('../features/actions/actionsApi', () => ({
  actionsApi: {
    listActions: vi.fn(),
    createAction: vi.fn(),
    updateAction: vi.fn(),
    deleteAction: vi.fn(),
  },
}));

vi.mock('../features/reports/reportsApi', () => ({
  reportsApi: {
    getMonthlyReport: vi.fn(),
    downloadMonthlyCsv: vi.fn(),
    downloadAnalyticsCsv: vi.fn(),
  },
}));

describe('Frontend End-to-End User Journey Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    authStorage.clearToken();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('completes the full user lifecycle: auth -> dashboard -> insights -> recommendation acceptance -> action tracker -> reports', async () => {
    // 1. Auth Step: Login
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'mock-jwt-token-xyz',
      token_type: 'bearer',
      user: {
        id: 'usr-1',
        email: 'rajesh@surattextiles.in',
        full_name: 'Rajesh Kumar',
        organization_id: 'org-1',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      organization: {
        id: 'org-1',
        name: 'Surat Textiles Ltd',
        industry: 'textile',
        location: 'Surat',
        country_code: 'IN',
        production_unit: 'kg',
        allow_external_ai: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    const { unmount: unmountLogin } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'rajesh@surattextiles.in' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'SecurePassword123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authStorage.getToken()).toBe('mock-jwt-token-xyz');
    });
    unmountLogin();

    // 2. Dashboard Step: View Section 16 KPI Vectors
    vi.mocked(dashboardApi.getSummary).mockResolvedValue({
      selected_month: '2026-03-01',
      latest_available_month: '2026-03-01',
      electricity: {
        resource_type: 'electricity',
        quantity: '10500',
        unit: 'kWh',
        amount_inr: '84000',
        intensity: '1.0500',
        intensity_unit: 'kWh/kg',
        change_percent: '-12.50',
        observed_reduction_per_unit: '0.1500',
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
        change_percent: '-8.33',
        observed_reduction_per_unit: null,
        observed_resource_reduction: null,
        potential_saving_inr: null,
      },
      fuel: {
        resource_type: 'fuel',
        quantity: '420',
        unit: 'L',
        amount_inr: '42000',
        intensity: '0.0420',
        intensity_unit: 'L/kg',
        change_percent: '-4.55',
        observed_reduction_per_unit: null,
        observed_resource_reduction: null,
        potential_saving_inr: null,
      },
      production_quantity: '10000',
      production_unit: 'kg',
      total_spend_inr: '128200',
      is_partial_spend: false,
      utility_data_coverage: '3 of 3 utility types recorded',
      utility_recorded_count: 3,
      cost_data_coverage: '3 of 3 utility types',
      open_actions_count: 0,
      completed_actions_count: 0,
      latest_insights_count: 0,
    });

    const { unmount: unmountDash } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('1.05')).toBeDefined();
    expect(screen.getByText('Electricity Intensity')).toBeDefined();
    expect(screen.getByText(/1,500 kWh/)).toBeDefined();
    expect(screen.getByText(/observed reduction vs previous month/i)).toBeDefined();
    unmountDash();

    // 3. Insights Step: Generate Insights
    const mockInsightItem = {
      id: 'ins-1',
      organization_id: 'org-1',
      period_month: '2026-03-01',
      metric_code: 'electricity_intensity_reduction',
      resource_type: 'electricity',
      severity: 'high' as const,
      title: 'Electricity Intensity Drop of 12.5%',
      summary: 'Observed reduction of 1,500 kWh vs previous month',
      observed_value: '1.05',
      comparison_value: '1.20',
      change_percent: '-12.5',
      unit: 'kWh/kg',
      source_type: 'rules' as const,
      caveat: 'Observed reduction vs previous month; does not prove recommendation causality',
      engine_version: '1.0.0',
      created_at: '2026-03-31T00:00:00Z',
      recommendations: [],
    };

    vi.mocked(insightsApi.generateInsights).mockResolvedValue({
      month: '2026-03',
      insights_generated_count: 1,
      recommendations_generated_count: 1,
      engine_version: '1.0.0',
      insights: [mockInsightItem],
    });

    vi.mocked(insightsApi.listInsights).mockResolvedValue([mockInsightItem]);

    const { unmount: unmountInsights } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InsightsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Electricity Intensity Drop of 12.5%')).toBeDefined();
    unmountInsights();

    // 4. Recommendations Step: Accept Recommendation
    const mockRecItem: RecommendationSummary = {
      id: 'rec-1',
      organization_id: 'org-1',
      insight_id: 'ins-1',
      title: 'Audit Compressed Air Leaks in Loom Shed',
      description: 'Address distribution manifold leakage points',
      priority: 'high',
      status: 'proposed',
      steps_json: ['Survey lines with ultrasonic detector', 'Replace cracked push-fit fittings'],
      estimated_saving_quantity: '1500',
      estimated_saving_unit: 'kWh',
      estimated_saving_inr: '12000',
      assumptions: 'Calculated using previous unit rate',
      created_at: '2026-03-31T00:00:00Z',
      updated_at: '2026-03-31T00:00:00Z',
    };

    vi.mocked(recommendationsApi.listRecommendations).mockResolvedValue([mockRecItem]);

    vi.mocked(recommendationsApi.acceptRecommendation).mockResolvedValue({
      ...mockRecItem,
      status: 'accepted',
    });

    const { unmount: unmountRecs } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RecommendationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Audit Compressed Air Leaks in Loom Shed')).toBeDefined();
    const acceptBtn = screen.getByRole('button', { name: /accept recommendation/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(recommendationsApi.acceptRecommendation).toHaveBeenCalledWith('rec-1');
    });
    unmountRecs();

    // 5. Actions Step: Complete Action in Tracker
    vi.mocked(actionsApi.listActions).mockResolvedValue([
      {
        id: 'act-1',
        organization_id: 'org-1',
        recommendation_id: 'rec-1',
        title: 'Audit Compressed Air Leaks in Loom Shed',
        description: 'Address distribution manifold leakage points',
        status: 'pending',
        due_date: null,
        completed_at: null,
        notes: null,
        created_by: null,
        created_at: '2026-03-31T00:00:00Z',
        updated_at: '2026-03-31T00:00:00Z',
        recommendation_title: 'Audit Compressed Air Leaks in Loom Shed',
      },
    ]);

    vi.mocked(actionsApi.updateAction).mockResolvedValue({
      id: 'act-1',
      organization_id: 'org-1',
      recommendation_id: 'rec-1',
      title: 'Audit Compressed Air Leaks in Loom Shed',
      description: 'Address distribution manifold leakage points',
      status: 'completed',
      due_date: null,
      completed_at: '2026-03-31T15:00:00Z',
      notes: null,
      created_by: null,
      created_at: '2026-03-31T00:00:00Z',
      updated_at: '2026-03-31T15:00:00Z',
      recommendation_title: 'Audit Compressed Air Leaks in Loom Shed',
    });

    const { unmount: unmountActions } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ActionsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Audit Compressed Air Leaks in Loom Shed')).toBeDefined();
    const completeBtn = screen.getByRole('button', { name: /mark completed/i });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(actionsApi.updateAction).toHaveBeenCalledWith('act-1', { status: 'completed' });
    });
    unmountActions();

    // 6. Reports Step: Generate Monthly Performance Report
    vi.mocked(reportsApi.getMonthlyReport).mockResolvedValue({
      metadata: {
        organization_name: 'Surat Textiles Ltd',
        industry: 'textile',
        location: 'Surat, IN',
        report_month: '2026-03',
        generated_at: '2026-03-31T16:00:00Z',
        production_unit: 'kg',
      },
      summary: {
        production_quantity: '10000',
        production_unit: 'kg',
        total_spend_inr: '128200',
        spend_coverage: '3 of 3 utility types recorded',
        active_actions_count: 0,
        has_missing_data: false,
      },
      utilities: [
        {
          resource_type: 'electricity',
          quantity: '10500',
          unit: 'kWh',
          spend_inr: '84000',
          intensity: '1.05',
          intensity_unit: 'kWh/kg',
          mom_quantity_change_pct: '-12.50',
          mom_intensity_change_pct: '-12.50',
          notes: null,
        },
      ],
      insights: [],
      recommendations: [],
      actions: [
        {
          title: 'Audit Compressed Air Leaks in Loom Shed',
          status: 'completed',
          due_date: null,
          completed_at: '2026-03-31T15:00:00Z',
        },
      ],
      caveats: [
        'Operational resource summary based strictly on user-entered utility bills and production logs; not an externally certified ESG assurance report.',
      ],
    });

    const { unmount: unmountReports } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Surat Textiles Ltd')).toBeDefined();
    expect(screen.getByText(/not an externally verified ESG audit report/i)).toBeDefined();
    expect(screen.getByText(/₹1,28,200/)).toBeDefined();
    expect(screen.getByRole('button', { name: /download csv/i })).toBeDefined();
    unmountReports();
  });
});
