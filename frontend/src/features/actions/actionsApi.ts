/**
 * Action Tracker API Client and Type Definitions
 */

import { apiClient } from '../../lib/apiClient';

export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ActionResponse {
  id: string;
  organization_id: string;
  recommendation_id: string | null;
  title: string;
  description: string | null;
  status: ActionStatus;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  recommendation_title: string | null;
}

export interface ActionCreatePayload {
  title: string;
  description?: string;
  recommendation_id?: string;
  status?: ActionStatus;
  due_date?: string;
  notes?: string;
}

export interface ActionUpdatePayload {
  title?: string;
  description?: string;
  status?: ActionStatus;
  due_date?: string;
  notes?: string;
}

export interface ActionFilters {
  status?: string;
  from?: string;
  to?: string;
}

export const actionsApi = {
  listActions: async (filters?: ActionFilters): Promise<ActionResponse[]> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);

    const query = params.toString();
    const endpoint = query ? `/actions?${query}` : '/actions';
    return apiClient<ActionResponse[]>(endpoint, { method: 'GET' });
  },

  createAction: async (payload: ActionCreatePayload): Promise<ActionResponse> => {
    return apiClient<ActionResponse>('/actions', {
      method: 'POST',
      body: payload,
    });
  },

  updateAction: async (id: string, payload: ActionUpdatePayload): Promise<ActionResponse> => {
    return apiClient<ActionResponse>(`/actions/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  deleteAction: async (id: string): Promise<void> => {
    return apiClient<void>(`/actions/${id}`, {
      method: 'DELETE',
    });
  },
};
