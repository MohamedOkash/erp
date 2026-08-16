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
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkItemQuery {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface WorkItemListResponse {
  data: WorkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateWorkItemPayload {
  name: string;
  code?: string;
  unitId?: string;
  defaultDailyTarget?: number;
  isActive?: boolean;
}

export interface UpdateWorkItemPayload {
  name?: string;
  code?: string;
  unitId?: string;
  defaultDailyTarget?: number;
  isActive?: boolean;
}

export const workItemsApi = {
  async list(query: WorkItemQuery = {}): Promise<WorkItemListResponse> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    const res = await apiClient.get<any>(`/work-items${qs ? `?${qs}` : ''}`);
    if (Array.isArray(res)) {
      return {
        data: res,
        total: res.length,
        page: 1,
        limit: res.length,
        totalPages: 1,
      };
    }
    return {
      data: res.data || [],
      total: res.total !== undefined ? res.total : (res.data ? res.data.length : 0),
      page: res.page || 1,
      limit: res.limit || 15,
      totalPages: res.totalPages || 1,
    };
  },

  async getById(id: string): Promise<WorkItem> {
    return apiClient.get<WorkItem>(`/work-items/${id}`);
  },

  async create(payload: CreateWorkItemPayload): Promise<WorkItem> {
    return apiClient.post<WorkItem>('/work-items', payload);
  },

  async update(id: string, payload: UpdateWorkItemPayload): Promise<WorkItem> {
    return apiClient.patch<WorkItem>(`/work-items/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete<void>(`/work-items/${id}`);
  },

  // Alias
  async getWorkItems(query: WorkItemQuery = {}): Promise<WorkItemListResponse> {
    return this.list(query);
  },
};
