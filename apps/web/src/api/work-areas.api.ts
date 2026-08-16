import { apiClient } from './client';

export interface WorkArea {
  id: string;
  companyId: string;
  projectId: string;
  projectName?: string;
  parentId?: string | null;
  parentName?: string | null;
  name: string;
  code?: string | null;
  level: number;
  path?: string;
  sortOrder: number;
  isActive: boolean;
  children?: WorkArea[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkAreaQuery {
  projectId?: string;
  parentId?: string;
  level?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkAreaListResponse {
  data: WorkArea[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateWorkAreaPayload {
  projectId: string;
  parentId?: string | null;
  name: string;
  code?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateWorkAreaPayload {
  name?: string;
  code?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export const workAreasApi = {
  async list(query: WorkAreaQuery = {}): Promise<WorkAreaListResponse> {
    const params = new URLSearchParams();
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.parentId) params.append('parentId', query.parentId);
    if (query.level !== undefined) params.append('level', String(query.level));
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    const res = await apiClient.get<any>(`/work-areas${qs ? `?${qs}` : ''}`);
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
      limit: res.limit || 50,
      totalPages: res.totalPages || 1,
    };
  },

  async getById(id: string): Promise<WorkArea> {
    return apiClient.get<WorkArea>(`/work-areas/${id}`);
  },

  async create(payload: CreateWorkAreaPayload): Promise<WorkArea> {
    return apiClient.post<WorkArea>('/work-areas', payload);
  },

  async update(id: string, payload: UpdateWorkAreaPayload): Promise<WorkArea> {
    return apiClient.patch<WorkArea>(`/work-areas/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete<void>(`/work-areas/${id}`);
  },
};
