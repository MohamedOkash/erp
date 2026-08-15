import { apiClient } from './client';

export interface WorkItem {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  unitId?: string | null;
  unitName?: string | null;
  unitSymbol?: string | null;
  defaultDailyTarget?: number | null;
  isActive: boolean;
}

export interface WorkItemListResponse {
  data: WorkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const workItemsApi = {
  async getWorkItems(query: { isActive?: boolean; search?: string } = {}): Promise<WorkItemListResponse> {
    const params = new URLSearchParams();
    if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
    if (query.search) params.append('search', query.search);
    const qs = params.toString();
    return apiClient.get<WorkItemListResponse>(`/work-items${qs ? `?${qs}` : ''}`);
  },
};
