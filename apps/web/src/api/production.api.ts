import { apiClient } from './client';

export interface ProductionWorkerItem {
  employeeId: string;
  workerType?: 'individual' | 'crew_member';
  individualQuantity?: number;
  hoursWorked?: number;
}

export interface ProductionRecord {
  id: string;
  companyId: string;
  branchId: string;
  branchName?: string;
  projectId: string;
  projectName?: string;
  workItemId: string;
  workItemName?: string;
  date: string;
  productionType: 'individual' | 'crew' | 'mixed';
  actualQuantity: number;
  targetQuantity: number;
  status: 'draft' | 'submitted' | 'supervisor_approved' | 'engineer_approved' | 'final_approved' | 'rejected' | 'cancelled';
  supervisorId?: string;
  supervisorName?: string;
  notes?: string | null;
  workersCount?: number;
  finalApprovedAt?: string | null;
}

export interface ProductionListResponse {
  data: ProductionRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductionPayload {
  branchId: string;
  projectId: string;
  workItemId: string;
  workAreaId?: string;
  date: string;
  productionType: 'individual' | 'crew' | 'mixed';
  actualQuantity: number;
  targetQuantity: number;
  supervisorId: string;
  notes?: string;
  workers: ProductionWorkerItem[];
}

export const productionApi = {
  async getProductionRecords(query: {
    projectId?: string;
    branchId?: string;
    workItemId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  } = {}): Promise<ProductionListResponse> {
    const params = new URLSearchParams();
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.workItemId) params.append('workItemId', query.workItemId);
    if (query.status) params.append('status', query.status);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);

    const qs = params.toString();
    const res = await apiClient.get<any>(`/production${qs ? `?${qs}` : ''}`);

    if (Array.isArray(res)) {
      return {
        data: res,
        total: res.length,
        page: 1,
        limit: res.length || 15,
        totalPages: 1,
      };
    }

    return {
      data: res.data || [],
      total: res.total || (res.data ? res.data.length : 0),
      page: res.page || 1,
      limit: res.limit || 15,
      totalPages: res.totalPages || 1,
    };
  },

  async createProductionRecord(payload: CreateProductionPayload): Promise<{ id: string; status: string; actualQuantity: number }> {
    return apiClient.post<{ id: string; status: string; actualQuantity: number }>('/production', payload);
  },

  async approveStep(id: string, step: 'submit' | 'supervisor' | 'engineer' | 'final'): Promise<{ id: string; status: string }> {
    return apiClient.post<{ id: string; status: string }>(`/production/${id}/approve`, { step });
  },

  async createCorrection(id: string, payload: { type: string; delta: number; reason: string }): Promise<any> {
    return apiClient.post(`/production/${id}/correction`, payload);
  },
};
