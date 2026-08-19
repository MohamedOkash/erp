import { apiClient } from './client';

export interface WorkItemStageItem {
  id: string;
  name: string;
  code?: string | null;
  percentage: number;
  standard_productivity?: number | null;
  stage_order?: number;
  sort_order?: number;
  unit_name?: string | null;
}

export interface WorkItem {
  id: string;
  companyId: string;
  name: string;
  name_en?: string | null;
  name_ur?: string | null;
  code?: string | null;
  category?: string | null;
  category_name_en?: string | null;
  category_name_ur?: string | null;
  categoryId?: string | null;
  category_id?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_ur?: string | null;
  unitId?: string | null;
  unitName?: string | null;
  unit_name_en?: string | null;
  unit_name_ur?: string | null;
  unitSymbol?: string | null;
  unit_symbol_en?: string | null;
  unit_symbol_ur?: string | null;
  defaultUnitRate?: number | null;
  default_unit_rate?: number | null;
  defaultDailyTarget?: number | null;
  default_daily_target?: number | null;
  branchRate?: number | null;
  branchDailyTarget?: number | null;
  stages?: WorkItemStageItem[];
  isActive: boolean;
  is_active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkItemQuery {
  search?: string;
  category?: string;
  categoryId?: string;
  branchId?: string;
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
  categoryId?: string;
  category?: string;
  description?: string;
  unitId?: string;
  defaultUnitRate?: number;
  defaultDailyTarget?: number;
  branchId?: string;
  isActive?: boolean;
}

export interface UpdateWorkItemPayload {
  name?: string;
  code?: string;
  categoryId?: string;
  category?: string;
  description?: string;
  unitId?: string;
  defaultUnitRate?: number;
  defaultDailyTarget?: number;
  branchId?: string;
  isActive?: boolean;
}

export const workItemsApi = {
  async list(query: WorkItemQuery = {}): Promise<WorkItemListResponse> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.categoryId) params.append('categoryId', query.categoryId);
    if (query.category) params.append('category', query.category);
    if (query.branchId) params.append('branchId', query.branchId);
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
