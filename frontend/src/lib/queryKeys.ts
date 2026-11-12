/**
 * Central TanStack Query keys for SYNERGYX.
 */

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  organization: {
    current: ['organization', 'current'] as const,
  },
  utilityRecords: {
    all: ['utility-records'] as const,
    list: (filters?: Record<string, unknown>) => ['utility-records', 'list', filters] as const,
    detail: (id: string) => ['utility-records', 'detail', id] as const,
  },
  productionRecords: {
    all: ['production-records'] as const,
    list: (filters?: Record<string, unknown>) => ['production-records', 'list', filters] as const,
    detail: (id: string) => ['production-records', 'detail', id] as const,
  },
  documents: {
    all: ['documents'] as const,
    list: () => ['documents', 'list'] as const,
  },
  dashboard: {
    summary: (month?: string) => ['dashboard', 'summary', month] as const,
  },
  analytics: {
    series: (params?: Record<string, unknown>) => ['analytics', 'series', params] as const,
  },
  insights: {
    list: (month?: string) => ['insights', 'list', month] as const,
  },
  recommendations: {
    list: (filters?: Record<string, unknown>) => ['recommendations', 'list', filters] as const,
  },
  actions: {
    list: (filters?: Record<string, unknown>) => ['actions', 'list', filters] as const,
  },
  reports: {
    monthly: (month: string) => ['reports', 'monthly', month] as const,
  },
};
