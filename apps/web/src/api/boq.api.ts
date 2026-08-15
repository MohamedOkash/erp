import { apiClient } from './client';

export interface BoqItemProgress {
  id: string;
  boqId: string;
  itemNumber?: string | null;
  description?: string | null;
  projectId: string;
  projectName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  workItemId: string;
  workItemName?: string | null;
  unitName?: string | null;
  unitSymbol?: string | null;
  unitRate?: number | null;
  totalPrice?: number | null;
  totalQuantity: number;
  executedQuantity: number;
  remainingQuantity: number;
  progressPercentage: number;
}

export interface BoqProgressResponse {
  data: BoqItemProgress[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const boqApi = {
  async getBoqProgress(query: {
    projectId?: string;
    branchId?: string;
    workItemId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<BoqProgressResponse> {
    const params = new URLSearchParams();
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.workItemId) params.append('workItemId', query.workItemId);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiClient.get<BoqProgressResponse>(`/boq${qs ? `?${qs}` : ''}`);
  },

  async getBoqItemProgressById(id: string): Promise<BoqItemProgress> {
    return apiClient.get<BoqItemProgress>(`/boq/${id}`);
  },
};
