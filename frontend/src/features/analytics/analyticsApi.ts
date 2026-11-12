/**
 * Analytics API Client and Type Definitions
 */

import { apiClient } from '../../lib/apiClient';

export type ResourceTypeFilter = 'all' | 'electricity' | 'water' | 'fuel';
export type MetricTypeFilter = 'consumption' | 'intensity' | 'spend';

export interface ResourceMonthlyData {
  resource_type: string;
  quantity: string | number | null;
  unit: string;
  amount_inr: string | number | null;
  intensity: string | number | null;
  intensity_unit: string | null;
}

export interface AnalyticsMonthPoint {
  month: string;
  month_str: string;
  production_quantity: string | number | null;
  production_unit: string;
  electricity: ResourceMonthlyData | null;
  water: ResourceMonthlyData | null;
  fuel: ResourceMonthlyData | null;
  total_spend_inr: string | number | null;
  is_partial_spend: boolean;
  cost_data_coverage: string;
  has_utility_data: boolean;
  has_production_data: boolean;
  caveats: string[];
}

export interface AnalyticsSummaryRow {
  month: string;
  production_display: string;
  electricity_qty_display: string;
  electricity_intensity_display: string;
  electricity_amount_display: string;
  water_qty_display: string;
  water_intensity_display: string;
  water_amount_display: string;
  fuel_qty_display: string;
  fuel_intensity_display: string;
  fuel_amount_display: string;
  total_spend_display: string;
  is_partial_spend: boolean;
  caveats: string[];
}

export interface AnalyticsTotals {
  total_production: string | number | null;
  total_electricity_kwh: string | number | null;
  total_water_m3: string | number | null;
  total_fuel_l: string | number | null;
  total_spend_inr: string | number | null;
  avg_electricity_intensity: string | number | null;
  avg_water_intensity: string | number | null;
  avg_fuel_intensity: string | number | null;
}

export interface AnalyticsResponse {
  from_month: string;
  to_month: string;
  resource_type: ResourceTypeFilter;
  metric: MetricTypeFilter;
  production_unit: string;
  series: AnalyticsMonthPoint[];
  summary_table: AnalyticsSummaryRow[];
  totals: AnalyticsTotals;
  data_quality_notes: string[];
}

export interface AnalyticsQueryParams {
  from?: string;
  to?: string;
  resource_type?: ResourceTypeFilter;
  metric?: MetricTypeFilter;
}

export const analyticsApi = {
  getAnalytics: async (params?: AnalyticsQueryParams): Promise<AnalyticsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.resource_type) searchParams.set('resource_type', params.resource_type);
    if (params?.metric) searchParams.set('metric', params.metric);

    const query = searchParams.toString();
    const endpoint = query ? `/analytics?${query}` : '/analytics';
    return apiClient<AnalyticsResponse>(endpoint, { method: 'GET' });
  },
};
