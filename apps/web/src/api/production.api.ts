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
    page?: number;
    limit?: number;
  } = {}): Promise<ProductionListResponse> {
    const params = new URLSearchParams();
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.workItemId) params.append('workItemId', query.workItemId);
    if (query.status) params.append('status', query.status);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiClient.get<ProductionListResponse>(`/production${qs ? `?${qs}` : ''}`);
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
