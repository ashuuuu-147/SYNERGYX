/**
 * Insights API Client and Type Definitions
 */

import { apiClient } from '../../lib/apiClient';
import { RecommendationSummary } from '../recommendations/recommendationsApi';

export type InsightSeverity = 'low' | 'medium' | 'high';
export type InsightSourceType = 'rules' | 'ai_assisted';

export interface InsightResponse {
  id: string;
  organization_id: string;
  period_month: string;
  metric_code: string;
  resource_type: string | null;
  severity: InsightSeverity;
  title: string;
  summary: string;
  observed_value: string | number | null;
  comparison_value: string | number | null;
  change_percent: string | number | null;
  unit: string | null;
  source_type: InsightSourceType;
  caveat: string | null;
  engine_version: string;
  created_at: string;
  recommendations: RecommendationSummary[];
}

export interface InsightGenerateResponse {
  month: string;
  insights_generated_count: number;
  recommendations_generated_count: number;
  engine_version: string;
  insights: InsightResponse[];
}

export interface InsightListParams {
  month?: string;
  start_month?: string;
  end_month?: string;
}

export interface InsightGenerateParams {
  month?: string;
  start_month?: string;
  end_month?: string;
}

export const insightsApi = {
  listInsights: async (params?: string | InsightListParams): Promise<InsightResponse[]> => {
    let query = '';
    if (typeof params === 'string') {
      query = params ? `?month=${encodeURIComponent(params)}` : '';
    } else if (params) {
      const searchParams = new URLSearchParams();
      if (params.month) searchParams.append('month', params.month);
      if (params.start_month) searchParams.append('start_month', params.start_month);
      if (params.end_month) searchParams.append('end_month', params.end_month);
      const qs = searchParams.toString();
      if (qs) query = `?${qs}`;
    }
    return apiClient<InsightResponse[]>(`/insights${query}`, { method: 'GET' });
  },

  generateInsights: async (params: string | InsightGenerateParams): Promise<InsightGenerateResponse> => {
    let query = '';
    if (typeof params === 'string') {
      query = `?month=${encodeURIComponent(params)}`;
    } else {
      const searchParams = new URLSearchParams();
      if (params.month) searchParams.append('month', params.month);
      if (params.start_month) searchParams.append('start_month', params.start_month);
      if (params.end_month) searchParams.append('end_month', params.end_month);
      query = `?${searchParams.toString()}`;
    }
    return apiClient<InsightGenerateResponse>(`/insights/generate${query}`, {
      method: 'POST',
    });
  },
};
