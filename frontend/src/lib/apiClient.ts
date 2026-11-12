/**
 * Central typed API client for SYNERGYX.
 * Follows blueprint section 12.1 standards.
 */

import { authStorage } from './authStorage';

export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;
  data?: unknown;

  constructor(status: number, message: string, code: string = 'API_ERROR', requestId?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.data = data;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

let isRedirectingToLogin = false;

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers: customHeaders, ...customConfig } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = authStorage.getToken();
  const headers = new Headers(customHeaders);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let requestBody: BodyInit | null = null;

  if (body instanceof FormData) {
    requestBody = body;
    // Let browser set multipart content-type with boundary automatically
  } else if (body !== undefined && body !== null) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    requestBody = JSON.stringify(body);
  }

  const config: RequestInit = {
    ...customConfig,
    headers,
    body: requestBody,
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      authStorage.clearToken();
      if (!isRedirectingToLogin && !window.location.pathname.startsWith('/login')) {
        isRedirectingToLogin = true;
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
      throw new ApiError(401, 'Session expired or invalid credentials.', 'UNAUTHORIZED');
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    let responseData: unknown = null;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      let message = response.statusText;
      let code = 'UNKNOWN_ERROR';
      let requestId: string | undefined = response.headers.get('x-request-id') || undefined;

      if (typeof responseData === 'object' && responseData !== null) {
        const errorObj = responseData as Record<string, unknown>;
        if (typeof errorObj.detail === 'string') {
          message = errorObj.detail;
        }
        if (typeof errorObj.code === 'string') {
          code = errorObj.code;
        }
        if (typeof errorObj.request_id === 'string') {
          requestId = errorObj.request_id;
        }
      }

      throw new ApiError(response.status, message, code, requestId, responseData);
    }

    return responseData as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'Network request failed. Check your connection.',
      'NETWORK_ERROR'
    );
  }
}

