import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { authStorage } from '../lib/authStorage';
import { authApi } from '../features/auth/authApi';

vi.mock('../features/auth/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('Frontend Authentication', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('renders login form and handles successful submission', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      access_token: 'valid-test-token',
      token_type: 'bearer',
      user: {
        id: 'user-1',
        organization_id: 'org-1',
        full_name: 'Test User',
        email: 'user@test.com',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      organization: {
        id: 'org-1',
        name: 'Test Org',
        industry: 'textile',
        location: 'Surat',
        country_code: 'IN',
        production_unit: 'kg',
        allow_external_ai: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('user@test.com', 'Password123!');
      expect(authStorage.getToken()).toBe('valid-test-token');
    });
  });

  it('validates password mismatch on registration and does not submit confirmPassword', async () => {
    vi.mocked(authApi.register).mockResolvedValueOnce({
      access_token: 'reg-test-token',
      token_type: 'bearer',
      user: {
        id: 'user-2',
        organization_id: 'org-2',
        full_name: 'New Owner',
        email: 'owner@textile.com',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      organization: {
        id: 'org-2',
        name: 'New Factory',
        industry: 'textile',
        location: 'Ahmedabad',
        country_code: 'IN',
        production_unit: 'kg',
        allow_external_ai: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'New Owner' } });
    fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'owner@textile.com' } });
    fireEvent.change(screen.getByLabelText(/organization \/ factory name/i), { target: { value: 'New Factory' } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: 'Ahmedabad' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'ValidPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'MismatchPass123!' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Should display mismatch validation error
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      expect(authApi.register).not.toHaveBeenCalled();
    });

    // Fix confirmation password
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'ValidPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledTimes(1);
      const callArg = vi.mocked(authApi.register).mock.calls[0][0];
      // Acceptance test: confirmPassword must NOT be sent to the backend
      expect((callArg as Record<string, unknown>).confirmPassword).toBeUndefined();
      expect((callArg as Record<string, unknown>).confirm_password).toBeUndefined();
      expect(callArg.full_name).toBe('New Owner');
      expect(callArg.email).toBe('owner@textile.com');
      expect(authStorage.getToken()).toBe('reg-test-token');
    });
  });
});
