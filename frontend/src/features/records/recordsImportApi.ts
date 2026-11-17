import { authStorage } from '../../lib/authStorage';
import { ApiError } from '../../lib/apiClient';

export interface CsvImportDetail {
  month: string;
  electricity_kwh?: string | null;
  electricity_bill_inr?: string | null;
  water_m3?: string | null;
  water_bill_inr?: string | null;
  fuel_l?: string | null;
  fuel_bill_inr?: string | null;
  production?: string | null;
}

export interface CsvImportResponse {
  success: boolean;
  message: string;
  months_processed: string[];
  utility_records_created: number;
  utility_records_updated: number;
  production_records_created: number;
  production_records_updated: number;
  details: CsvImportDetail[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');

export const recordsImportApi = {
  importCsv: async (file: File, year?: number): Promise<CsvImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (year) {
      formData.append('year', String(year));
    }

    const token = authStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/records/import-csv`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // fallback
      }
      throw new ApiError(
        response.status,
        errorData.detail?.message || errorData.detail || 'Failed to import CSV records',
        errorData.detail?.code || 'IMPORT_FAILED',
        errorData.detail?.request_id
      );
    }

    return response.json();
  },
};
