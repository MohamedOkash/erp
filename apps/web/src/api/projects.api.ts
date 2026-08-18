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
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectQuery {
  branchId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
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
  clientName?: string;
  location?: string;
}

export interface UpdateProjectPayload {
  branchId?: string;
  name?: string;
  code?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  clientName?: string;
  location?: string;
}

export const projectsApi = {
  async list(query: ProjectQuery = {}): Promise<ProjectListResponse> {
    const params = new URLSearchParams();
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    const res = await apiClient.get<any>(`/projects${qs ? `?${qs}` : ''}`);

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

  async getById(id: string): Promise<Project> {
    return apiClient.get<Project>(`/projects/${id}`);
  },

  async create(payload: CreateProjectPayload): Promise<Project> {
    return apiClient.post<Project>('/projects', payload);
  },

  async update(id: string, payload: UpdateProjectPayload): Promise<Project> {
    return apiClient.patch<Project>(`/projects/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete<void>(`/projects/${id}`);
  },

  // Aliases for compatibility
  async getProjects(query: ProjectQuery = {}): Promise<ProjectListResponse> {
    return this.list(query);
  },
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    return this.create(payload);
  },
  async updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
    return this.update(id, payload);
  },
  async deleteProject(id: string): Promise<void> {
    return this.remove(id);
  },
};
