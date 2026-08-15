import { apiClient } from './client';

export interface Project {
  id: string;
  companyId: string;
  branchId: string;
  branchName?: string;
  name: string;
  code?: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  startDate?: string | null;
  endDate?: string | null;
  contractValue?: number | null;
  description?: string | null;
  isActive: boolean;
  workAreasCount?: number;
  boqItemsCount?: number;
}

export interface ProjectListResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProjectPayload {
  branchId: string;
  name: string;
  code?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  contractValue?: number;
  description?: string;
}

export interface UpdateProjectPayload {
  branchId?: string;
  name?: string;
  code?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  contractValue?: number;
  description?: string;
  isActive?: boolean;
}

export const projectsApi = {
  async getProjects(query: { branchId?: string; status?: string; search?: string; page?: number; limit?: number } = {}): Promise<ProjectListResponse> {
    const params = new URLSearchParams();
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiClient.get<ProjectListResponse>(`/projects${qs ? `?${qs}` : ''}`);
  },

  async createProject(payload: CreateProjectPayload): Promise<Project> {
    return apiClient.post<Project>('/projects', payload);
  },

  async updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
    return apiClient.patch<Project>(`/projects/${id}`, payload);
  },

  async deleteProject(id: string): Promise<void> {
    return apiClient.delete<void>(`/projects/${id}`);
  },
};
