import { apiClient } from '../../lib/apiClient';

export interface ProductionRecordItem {
  id: string;
  organization_id: string;
  period_month: string;
  quantity: string | number;
  unit: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionPayload {
  period_month: string;
  quantity: number | string;
  unit?: string;
  notes?: string | null;
}

export interface UpdateProductionPayload {
  quantity?: number | string;
  notes?: string | null;
}

export const productionApi = {
  getRecords: async (params?: { month?: string }): Promise<ProductionRecordItem[]> => {
    return apiClient<ProductionRecordItem[]>('/production-records', {
      method: 'GET',
      params,
    });
  },

  getRecord: async (id: string): Promise<ProductionRecordItem> => {
    return apiClient<ProductionRecordItem>(`/production-records/${id}`, {
      method: 'GET',
    });
  },

  createRecord: async (payload: CreateProductionPayload): Promise<ProductionRecordItem> => {
    return apiClient<ProductionRecordItem>('/production-records', {
      method: 'POST',
      body: payload,
    });
  },

  updateRecord: async (id: string, payload: UpdateProductionPayload): Promise<ProductionRecordItem> => {
    return apiClient<ProductionRecordItem>(`/production-records/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  deleteRecord: async (id: string): Promise<void> => {
    return apiClient<void>(`/production-records/${id}`, {
      method: 'DELETE',
    });
  },
};
