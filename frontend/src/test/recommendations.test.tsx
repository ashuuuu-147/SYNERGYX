import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RecommendationsPage } from '../features/recommendations/RecommendationsPage';
import {
  recommendationsApi,
  RecommendationSummary,
} from '../features/recommendations/recommendationsApi';

vi.mock('../features/recommendations/recommendationsApi', () => ({
  recommendationsApi: {
    listRecommendations: vi.fn(),
    acceptRecommendation: vi.fn(),
    dismissRecommendation: vi.fn(),
  },
}));

describe('RecommendationsPage UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const mockRecommendations: RecommendationSummary[] = [
    {
      id: 'rec-1',
      organization_id: 'org-1',
      insight_id: 'ins-1',
      title: 'Review Machine Idle Time & Operating Schedules',
      description: 'Review machine idle time and operating schedules. Record which equipment remains on during non-production periods.',
      steps_json: [
        'Audit equipment running during non-operational hours.',
        'Establish strict shutdown procedures for idle machinery.',
      ],
      priority: 'high',
      status: 'proposed',
      estimated_saving_quantity: '1500',
      estimated_saving_unit: 'kWh',
      estimated_saving_inr: '12000',
      assumptions: 'Calculated as observed reduction multiplied by prior unit cost.',
      created_at: '2026-03-02T10:00:00Z',
      updated_at: '2026-03-02T10:00:00Z',
    },
    {
      id: 'rec-2',
      organization_id: 'org-1',
      insight_id: 'ins-2',
      title: 'Inspect Visible Leaks & Clean Valves',
      description: 'Inspect visible leaks across pipelines.',
      steps_json: ['Inspect valves and pipelines.'],
      priority: 'medium',
      status: 'accepted',
      estimated_saving_quantity: null,
      estimated_saving_unit: null,
      estimated_saving_inr: null,
      assumptions: null,
      created_at: '2026-03-02T10:00:00Z',
      updated_at: '2026-03-02T10:00:00Z',
    },
  ];

  it('renders honest empty state when no recommendations exist', async () => {
    vi.mocked(recommendationsApi.listRecommendations).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RecommendationsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No Recommendations')).toBeInTheDocument();
  });

  it('renders populated recommendations with steps and estimated savings', async () => {
    vi.mocked(recommendationsApi.listRecommendations).mockResolvedValue(mockRecommendations);

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RecommendationsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Review Machine Idle Time & Operating Schedules')).toBeInTheDocument();
    expect(screen.getByText('Audit equipment running during non-operational hours.')).toBeInTheDocument();
    expect(screen.getByText(/1,500 kWh/)).toBeInTheDocument();
    expect(screen.getByText(/12,000/)).toBeInTheDocument();
    expect(screen.getByText('HIGH PRIORITY')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept recommendation/i })).toBeInTheDocument();
  });

  it('accepts recommendation and updates status', async () => {
    vi.mocked(recommendationsApi.listRecommendations).mockResolvedValue(mockRecommendations);
    vi.mocked(recommendationsApi.acceptRecommendation).mockResolvedValue({
      ...mockRecommendations[0],
      status: 'accepted',
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RecommendationsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const acceptBtn = await screen.findByRole('button', { name: /accept recommendation/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(recommendationsApi.acceptRecommendation).toHaveBeenCalledWith('rec-1');
    });

    expect(await screen.findByText(/Linked task created in Action Tracker/i)).toBeInTheDocument();
  });

  it('dismisses recommendation when dismiss clicked', async () => {
    vi.mocked(recommendationsApi.listRecommendations).mockResolvedValue(mockRecommendations);
    vi.mocked(recommendationsApi.dismissRecommendation).mockResolvedValue({
      ...mockRecommendations[0],
      status: 'dismissed',
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <RecommendationsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    const dismissBtn = await screen.findByRole('button', { name: /^dismiss$/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(recommendationsApi.dismissRecommendation).toHaveBeenCalledWith('rec-1');
    });

    expect(await screen.findByText(/Dismissed "Review Machine Idle Time & Operating Schedules"/i)).toBeInTheDocument();
  });
});
