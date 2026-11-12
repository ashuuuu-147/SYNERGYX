import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient, ApiError } from '../lib/apiClient';
import { authStorage } from '../lib/authStorage';

describe('apiClient', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches Bearer token from sessionStorage', async () => {
    authStorage.setToken('test-jwt-token');

    let capturedHeaders: HeadersInit | undefined;
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      capturedHeaders = options?.headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });
    });

    const result = await apiClient<{ success: boolean }>('/health/live');
    expect(result).toEqual({ success: true });

    const headers = new Headers(capturedHeaders);
    expect(headers.get('Authorization')).toBe('Bearer test-jwt-token');
  });

  it('throws typed ApiError on 400 with detail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ detail: 'Invalid parameter', code: 'BAD_REQUEST', request_id: 'test-req-id' }),
    });

    await expect(apiClient('/test')).rejects.toThrow('Invalid parameter');

    try {
      await apiClient('/test');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe('BAD_REQUEST');
      expect(apiErr.requestId).toBe('test-req-id');
    }
  });

  it('clears token on 401 response', async () => {
    authStorage.setToken('expired-token');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ detail: 'Unauthorized' }),
    });

    await expect(apiClient('/protected')).rejects.toThrow('Session expired');
    expect(authStorage.getToken()).toBeNull();
  });
});

