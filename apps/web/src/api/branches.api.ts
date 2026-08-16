import { apiClient } from './client';

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  projectsCount?: number;
  employeesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BranchListResponse {
  data: Branch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateBranchPayload {
  name: string;
  code: string;
  location?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateBranchPayload {
  name?: string;
  code?: string;
  location?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export const branchesApi = {
  async list(query: BranchQuery = {}): Promise<BranchListResponse> {
    const params = new URLSearchParams();
    if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    const res = await apiClient.get<any>(`/branches${qs ? `?${qs}` : ''}`);
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

  async getById(id: string): Promise<Branch> {
    return apiClient.get<Branch>(`/branches/${id}`);
  },

  async create(payload: CreateBranchPayload): Promise<Branch> {
    return apiClient.post<Branch>('/branches', payload);
  },

  async update(id: string, payload: UpdateBranchPayload): Promise<Branch> {
    return apiClient.patch<Branch>(`/branches/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete<void>(`/branches/${id}`);
  },

  // Aliases for compatibility
  async getBranches(query: BranchQuery = {}): Promise<BranchListResponse> {
    return this.list(query);
  },
};
