import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { InsightsPage } from '../features/insights/InsightsPage';
import { insightsApi, InsightResponse } from '../features/insights/insightsApi';

vi.mock('../features/insights/insightsApi', () => ({
  insightsApi: {
    listInsights: vi.fn(),
    generateInsights: vi.fn(),
  },
}));

describe('InsightsPage UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const mockInsights: InsightResponse[] = [
    {
      id: 'ins-1',
      organization_id: 'org-1',
      period_month: '2026-03-01',
      metric_code: 'electricity_intensity_down',
      resource_type: 'electricity',
      severity: 'low',
      title: 'Observed Electricity Reduction (-12.5%)',
      summary: 'Electricity consumption decreased by 12.5% vs previous month.',
      observed_value: '1.0500',
      comparison_value: '1.2000',
      change_percent: '-12.5',
      unit: 'kWh/kg',
      source_type: 'rules',
      caveat: 'Observed improvement vs previous month.',
      engine_version: 'rules_v1.0',
      created_at: '2026-03-02T10:00:00Z',
      recommendations: [],
    },
    {
      id: 'ins-2',
      organization_id: 'org-1',
      period_month: '2026-03-01',
      metric_code: 'water_intensity_up',
      resource_type: 'water',
      severity: 'high',
      title: 'Water Intensity Increased by 25.0%',
      summary: 'Water consumption rose by 25.0% vs previous month.',
      observed_value: '0.0055',
      comparison_value: '0.0044',
      change_percent: '25.0',
      unit: 'm³/kg',
      source_type: 'ai_assisted',
      caveat: 'Heuristic threshold.',
      engine_version: 'rules_v1.0',
      created_at: '2026-03-02T10:00:00Z',
      recommendations: [],
    },
  ];

  it('renders honest empty state when no insights exist', async () => {
    vi.mocked(insightsApi.listInsights).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <InsightsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No Insights Found')).toBeInTheDocument();
  });

  it('renders populated insight cards with severity badges, source type, and observed values', async () => {
    vi.mocked(insightsApi.listInsights).mockResolvedValue(mockInsights);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <InsightsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Observed Electricity Reduction (-12.5%)')).toBeInTheDocument();
    expect(screen.getByText('Water Intensity Increased by 25.0%')).toBeInTheDocument();
    expect(screen.getByText('Deterministic Rule')).toBeInTheDocument();
    expect(screen.getByText(/AI-Assisted/i)).toBeInTheDocument();
    expect(screen.getByText('HIGH PRIORITY')).toBeInTheDocument();
    expect(screen.getByText('LOW PRIORITY')).toBeInTheDocument();
  });

  it('filters insights by severity', async () => {
    vi.mocked(insightsApi.listInsights).mockResolvedValue(mockInsights);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <InsightsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await screen.findByText('Observed Electricity Reduction (-12.5%)');

    const severitySelect = screen.getByLabelText(/filter by severity/i);
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    // High severity remains, low severity is filtered out
    expect(screen.getByText('Water Intensity Increased by 25.0%')).toBeInTheDocument();
    expect(screen.queryByText('Observed Electricity Reduction (-12.5%)')).not.toBeInTheDocument();
  });

  it('triggers generate insights mutation when button clicked', async () => {
    vi.mocked(insightsApi.listInsights).mockResolvedValue(mockInsights);
    vi.mocked(insightsApi.generateInsights).mockResolvedValue({
      month: '2026-03-01',
      insights_generated_count: 2,
      recommendations_generated_count: 1,
      engine_version: 'rules_v1.0',
      insights: mockInsights,
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <InsightsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await screen.findByText('Observed Electricity Reduction (-12.5%)');

    const monthInput = screen.getByLabelText(/filter insights by month/i);
    fireEvent.change(monthInput, { target: { value: '2026-03' } });

    const generateBtn = screen.getByRole('button', { name: /generate insights/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(insightsApi.generateInsights).toHaveBeenCalledWith('2026-03');
    });
  });
});
