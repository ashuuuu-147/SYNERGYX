import { apiClient } from '../../lib/apiClient';

export interface UserSummary {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  industry: string;
  location: string;
  country_code: string;
  production_unit: string;
  allow_external_ai: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserSummary;
  organization: OrganizationSummary;
}

export interface MeResponse {
  user: UserSummary;
  organization: OrganizationSummary;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  register: async (payload: {
    full_name: string;
    email: string;
    password: string;
    organization_name: string;
    industry: string;
    location: string;
    country_code: string;
    production_unit: string;
  }): Promise<AuthResponse> => {
    return apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: payload,
    });
  },

  getMe: async (): Promise<MeResponse> => {
    return apiClient<MeResponse>('/auth/me', {
      method: 'GET',
    });
  },
};

