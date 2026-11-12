import { apiClient } from '../../lib/apiClient';
import { OrganizationSummary } from '../auth/authApi';

export interface OrganizationUpdatePayload {
  name?: string;
  industry?: string;
  location?: string;
  country_code?: string;
  production_unit?: string;
}

export const organizationApi = {
  getOrganization: async (): Promise<OrganizationSummary> => {
    return apiClient<OrganizationSummary>('/organization', {
      method: 'GET',
    });
  },

  updateOrganization: async (payload: OrganizationUpdatePayload): Promise<OrganizationSummary> => {
    return apiClient<OrganizationSummary>('/organization', {
      method: 'PATCH',
      body: payload,
    });
  },

  updateAiConsent: async (allow_external_ai: boolean): Promise<OrganizationSummary> => {
    return apiClient<OrganizationSummary>('/organization/ai-consent', {
      method: 'PATCH',
      body: { allow_external_ai },
    });
  },
};

