import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from '../features/settings/SettingsPage';
import { organizationApi } from '../features/settings/organizationApi';
import { ApiError } from '../lib/apiClient';

vi.mock('../features/settings/organizationApi', () => ({
  organizationApi: {
    getOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    updateAiConsent: vi.fn(),
  },
}));

describe('SettingsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const mockOrg = {
    id: 'org-123',
    name: 'Apex Textiles Ltd',
    industry: 'textile',
    location: 'Surat, Gujarat',
    country_code: 'IN',
    production_unit: 'kg',
    allow_external_ai: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('loads and displays organization profile settings', async () => {
    vi.mocked(organizationApi.getOrganization).mockResolvedValueOnce(mockOrg);

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Apex Textiles Ltd')).toBeInTheDocument();
      expect(screen.getByDisplayValue('textile')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Surat, Gujarat')).toBeInTheDocument();
      expect(screen.getByDisplayValue('IN')).toBeInTheDocument();
    });

    const aiCheckbox = screen.getByRole('checkbox', {
      name: /allow external ai/i,
    }) as HTMLInputElement;
    expect(aiCheckbox.checked).toBe(false);
  });

  it('updates AI consent when checkbox is toggled', async () => {
    vi.mocked(organizationApi.getOrganization).mockResolvedValueOnce(mockOrg);
    vi.mocked(organizationApi.updateAiConsent).mockResolvedValueOnce({
      ...mockOrg,
      allow_external_ai: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    const checkbox = (await screen.findByRole('checkbox', {
      name: /allow external ai/i,
    })) as HTMLInputElement;

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(organizationApi.updateAiConsent).toHaveBeenCalledWith(true);
    });
  });

  it('displays error banner when production unit update is rejected by backend', async () => {
    vi.mocked(organizationApi.getOrganization).mockResolvedValueOnce(mockOrg);
    vi.mocked(organizationApi.updateOrganization).mockRejectedValueOnce(
      new ApiError(400, 'Production unit cannot be changed once production records exist.', 'PRODUCTION_UNIT_LOCKED')
    );

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    await screen.findByDisplayValue('Apex Textiles Ltd');

    const submitBtn = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Production unit cannot be changed once production records exist.')
      ).toBeInTheDocument();
    });
  });
});
