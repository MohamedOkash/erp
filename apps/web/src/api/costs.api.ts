import { apiClient } from './client';

export interface CostEntry {
  id: string;
  companyId: string;
  projectId?: string | null;
  projectName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  category: 'labor' | 'material' | 'equipment' | 'subcontractor' | 'overhead' | 'other';
  description: string;
  amount: number;
  costDate: string;
  quantity?: number | null;
  unitCost?: number | null;
}

export interface CostListResponse {
  data: CostEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCostPayload {
  projectId?: string;
  branchId?: string;
  category: string;
  description: string;
  amount?: number;
  costDate: string;
  quantity?: number;
  unitCost?: number;
}

export interface CostSummaryResponse {
  totalAmount: number;
  byCategory: Array<{ category: string; totalAmount: number }>;
  byProject: Array<{ projectId: string; projectName: string; totalAmount: number }>;
}

export const costsApi = {
  async getCosts(query: {
    projectId?: string;
    branchId?: string;
    category?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<CostListResponse> {
    const params = new URLSearchParams();
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.category) params.append('category', query.category);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiClient.get<CostListResponse>(`/costs${qs ? `?${qs}` : ''}`);
  },

  async createCost(payload: CreateCostPayload): Promise<CostEntry> {
    return apiClient.post<CostEntry>('/costs', payload);
  },

  async getSummary(query: { fromDate?: string; toDate?: string } = {}): Promise<CostSummaryResponse> {
    const params = new URLSearchParams();
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    const qs = params.toString();
    return apiClient.get<CostSummaryResponse>(`/costs/summary${qs ? `?${qs}` : ''}`);
  },

  async laborAutoCalculate(payload: { fromDate: string; toDate: string; projectId?: string; branchId?: string }): Promise<{
    calculatedCount: number;
    totalAmount: number;
    entries: any[];
  }> {
    return apiClient.post('/costs/labor-auto-calculate', payload);
  },
};
