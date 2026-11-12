import { apiClient } from '../../lib/apiClient';

export interface UtilityRecordItem {
  id: string;
  organization_id: string;
  resource_type: 'electricity' | 'water' | 'fuel';
  period_month: string;
  quantity: string | number;
  unit: string;
  amount_inr?: string | number | null;
  document_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUtilityPayload {
  resource_type: 'electricity' | 'water' | 'fuel';
  period_month: string;
  quantity: number | string;
  input_unit: string;
  amount_inr?: number | string | null;
  document_id?: string | null;
  notes?: string | null;
}

export interface UpdateUtilityPayload {
  quantity?: number | string;
  input_unit?: string;
  amount_inr?: number | string | null;
  document_id?: string | null;
  notes?: string | null;
}

export const utilityApi = {
  getRecords: async (params?: { resource_type?: string; month?: string }): Promise<UtilityRecordItem[]> => {
    return apiClient<UtilityRecordItem[]>('/utility-records', {
      method: 'GET',
      params,
    });
  },

  getRecord: async (id: string): Promise<UtilityRecordItem> => {
    return apiClient<UtilityRecordItem>(`/utility-records/${id}`, {
      method: 'GET',
    });
  },

  createRecord: async (payload: CreateUtilityPayload): Promise<UtilityRecordItem> => {
    return apiClient<UtilityRecordItem>('/utility-records', {
      method: 'POST',
      body: payload,
    });
  },

  updateRecord: async (id: string, payload: UpdateUtilityPayload): Promise<UtilityRecordItem> => {
    return apiClient<UtilityRecordItem>(`/utility-records/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  deleteRecord: async (id: string): Promise<void> => {
    return apiClient<void>(`/utility-records/${id}`, {
      method: 'DELETE',
    });
  },
};
