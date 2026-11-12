import { apiClient } from '../../lib/apiClient';

export interface ResourceDashboardKpi {
  resource_type: string;
  quantity?: number | string | null;
  unit: string;
  amount_inr?: number | string | null;
  intensity?: number | string | null;
  intensity_unit?: string | null;
  change_percent?: number | string | null;
  observed_reduction_per_unit?: number | string | null;
  observed_resource_reduction?: number | string | null;
  potential_saving_inr?: number | string | null;
}

export interface DashboardSummary {
  selected_month: string;
  latest_available_month?: string | null;
  electricity: ResourceDashboardKpi;
  water: ResourceDashboardKpi;
  fuel: ResourceDashboardKpi;
  production_quantity?: number | string | null;
  production_unit: string;
  total_spend_inr?: number | string | null;
  is_partial_spend: boolean;
  utility_data_coverage: string;
  utility_recorded_count: number;
  cost_data_coverage: string;
  open_actions_count: number;
  completed_actions_count: number;
  latest_insights_count: number;
}

export const dashboardApi = {
  getSummary: async (month?: string): Promise<DashboardSummary> => {
    return apiClient<DashboardSummary>('/dashboard/summary', {
      method: 'GET',
      params: month ? { month } : undefined,
    });
  },
};
