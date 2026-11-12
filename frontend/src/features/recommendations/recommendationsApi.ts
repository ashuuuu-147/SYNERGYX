/**
 * Recommendations API Client and Type Definitions
 */

import { apiClient } from '../../lib/apiClient';

export type RecommendationPriority = 'low' | 'medium' | 'high';
export type RecommendationStatus = 'proposed' | 'accepted' | 'dismissed' | 'completed';

export interface RecommendationSummary {
  id: string;
  organization_id: string;
  insight_id: string | null;
  title: string;
  description: string;
  steps_json: string[];
  priority: RecommendationPriority;
  status: RecommendationStatus;
  estimated_saving_quantity: string | number | null;
  estimated_saving_unit: string | null;
  estimated_saving_inr: string | number | null;
  assumptions: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationFilters {
  status?: string;
  priority?: string;
}

export const recommendationsApi = {
  listRecommendations: async (filters?: RecommendationFilters): Promise<RecommendationSummary[]> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.priority && filters.priority !== 'all') params.set('priority', filters.priority);

    const query = params.toString();
    const endpoint = query ? `/recommendations?${query}` : '/recommendations';
    return apiClient<RecommendationSummary[]>(endpoint, { method: 'GET' });
  },

  acceptRecommendation: async (id: string): Promise<RecommendationSummary> => {
    return apiClient<RecommendationSummary>(`/recommendations/${id}/accept`, {
      method: 'POST',
    });
  },

  dismissRecommendation: async (id: string): Promise<RecommendationSummary> => {
    return apiClient<RecommendationSummary>(`/recommendations/${id}/dismiss`, {
      method: 'POST',
    });
  },
};

