import { apiClient } from './client';

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  location?: string | null;
  isActive: boolean;
  projectsCount?: number;
  employeesCount?: number;
}

export interface BranchListResponse {
  data: Branch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const branchesApi = {
  async getBranches(query: { isActive?: boolean; search?: string } = {}): Promise<BranchListResponse> {
    const params = new URLSearchParams();
    if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
    if (query.search) params.append('search', query.search);
    const qs = params.toString();
    return apiClient.get<BranchListResponse>(`/branches${qs ? `?${qs}` : ''}`);
  },
};
