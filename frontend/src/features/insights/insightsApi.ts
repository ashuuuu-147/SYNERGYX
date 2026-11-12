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

export const insightsApi = {
  listInsights: async (month?: string): Promise<InsightResponse[]> => {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return apiClient<InsightResponse[]>(`/insights${query}`, { method: 'GET' });
  },

  generateInsights: async (month: string): Promise<InsightGenerateResponse> => {
    return apiClient<InsightGenerateResponse>(`/insights/generate?month=${encodeURIComponent(month)}`, {
      method: 'POST',
    });
  },
};
