import { apiClient } from '../../lib/apiClient';
import { authStorage } from '../../lib/authStorage';

export interface UtilityReportItem {
  resource_type: string;
  quantity: string | null;
  unit: string;
  spend_inr: string | null;
  intensity: string | null;
  intensity_unit: string;
  mom_quantity_change_pct: string | null;
  mom_intensity_change_pct: string | null;
  notes: string | null;
}

export interface InsightReportItem {
  title: string;
  severity: string;
  resource_type: string | null;
  description: string;
  source: string;
  caveat: string | null;
}

export interface RecommendationReportItem {
  title: string;
  priority: string;
  status: string;
  potential_saving_inr: string | null;
  practical_action: string | null;
}

export interface ActionReportItem {
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
}

export interface ReportMetadata {
  organization_name: string;
  industry: string;
  location: string | null;
  report_month: string;
  generated_at: string;
  production_unit: string;
}

export interface ReportSummary {
  production_quantity: string | null;
  production_unit: string;
  total_spend_inr: string;
  spend_coverage: string;
  active_actions_count: number;
  has_missing_data: boolean;
}

export interface MonthlyReportResponse {
  metadata: ReportMetadata;
  summary: ReportSummary;
  utilities: UtilityReportItem[];
  insights: InsightReportItem[];
  recommendations: RecommendationReportItem[];
  actions: ActionReportItem[];
  caveats: string[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

async function downloadFileFromUrl(pathWithQuery: string, defaultFilename: string): Promise<void> {
  const token = authStorage.getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${pathWithQuery}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  // Extract filename from Content-Disposition if present
  let filename = defaultFilename;
  const disposition = response.headers.get('Content-Disposition');
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

export const reportsApi = {
  getMonthlyReport: (month: string): Promise<MonthlyReportResponse> => {
    return apiClient<MonthlyReportResponse>(`/reports/monthly?month=${encodeURIComponent(month)}`);
  },

  downloadMonthlyCsv: (month: string): Promise<void> => {
    return downloadFileFromUrl(
      `/reports/monthly/csv?month=${encodeURIComponent(month)}`,
      `synergyx_monthly_report_${month}.csv`
    );
  },

  downloadAnalyticsCsv: (params: {
    from?: string;
    to?: string;
    resource_type?: string;
    metric?: string;
  }): Promise<void> => {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.resource_type && params.resource_type !== 'all') query.set('resource_type', params.resource_type);
    if (params.metric) query.set('metric', params.metric);

    return downloadFileFromUrl(
      `/reports/analytics/csv?${query.toString()}`,
      'synergyx_analytics_export.csv'
    );
  },
};
