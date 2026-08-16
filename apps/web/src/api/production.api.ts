import { apiClient } from './client';

export interface ProductionWorkerItem {
  id?: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  workerType: 'individual' | 'team';
  individualQuantity?: number;
  hoursWorked?: number;
  overtimeHours?: number;
  bonusPercentage?: number;
  skillLevel?: 'skilled' | 'unskilled' | string;
  isEstimated?: boolean;
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
  workItemCode?: string;
  workItemStageId?: string | null;
  stageName?: string | null;
  workAreaId?: string | null;
  workAreaName?: string | null;
  date: string;
  productionType: 'individual' | 'team' | 'mixed';
  actualQuantity: number;
  targetQuantity: number;
  teamCode?: string | null;
  supervisorId: string;
  supervisorName?: string;
  engineerId?: string | null;
  engineerName?: string | null;
  status: 'draft' | 'submitted' | 'supervisor_approved' | 'engineer_approved' | 'final_approved';
  rejectionReason?: string | null;
  submittedAt?: string | null;
  supervisorApprovedAt?: string | null;
  engineerApprovedAt?: string | null;
  finalApprovedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  workers?: ProductionWorkerItem[];
}

export interface ProductionQuery {
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  projectId?: string;
  status?: string;
  search?: string;
}

export interface ProductionListResponse {
  data: ProductionRecord[];
  total: number;
}

export interface CreateProductionPayload {
  date: string;
  branchId: string;
  projectId: string;
  workItemId: string;
  workItemStageId?: string;
  workAreaId?: string | null;
  supervisorId: string;
  targetQuantity?: number;
  actualQuantity: number;
  productionType: 'individual' | 'team' | 'mixed';
  teamCode?: string;
  workers: ProductionWorkerItem[];
}

export interface UpdateProductionPayload {
  date?: string;
  branchId?: string;
  projectId?: string;
  workItemId?: string;
  workAreaId?: string | null;
  supervisorId?: string;
  targetQuantity?: number;
  actualQuantity?: number;
  productionType?: 'individual' | 'team' | 'mixed';
  teamCode?: string;
  workers?: ProductionWorkerItem[];
}

export interface ApprovePayload {
  step: 'submit' | 'supervisor' | 'engineer' | 'final';
}

export interface CorrectionPayload {
  type: 'quantity_adjust' | 'annul' | 'note';
  delta?: number;
  reason: string;
}

export interface ProductionImportSummary {
  total: number;
  valid: number;
  duplicate: number;
  invalid: number;
}

export interface ProductionImportRow {
  rowIndex: number;
  date: string | null;
  project: string | null;
  workItem: string | null;
  quantity: number;
  status: 'valid' | 'duplicate' | 'invalid';
  errors: string[];
}

export interface ProductionImportUploadResponse {
  jobId: string;
  summary: ProductionImportSummary;
  rows: ProductionImportRow[];
}

export const productionApi = {
  async list(query: ProductionQuery = {}): Promise<ProductionListResponse> {
    const params = new URLSearchParams();
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.status && query.status !== 'all') params.append('status', query.status);

    const qs = params.toString();
    const res = await apiClient.get<any>(`/production${qs ? `?${qs}` : ''}`);

    let rawList: ProductionRecord[] = [];
    if (Array.isArray(res)) {
      rawList = res;
    } else if (res && Array.isArray(res.data)) {
      rawList = res.data;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      rawList = rawList.filter(
        (r) =>
          r.projectName?.toLowerCase().includes(s) ||
          r.workItemName?.toLowerCase().includes(s) ||
          r.supervisorName?.toLowerCase().includes(s) ||
          r.teamCode?.toLowerCase().includes(s),
      );
    }

    return {
      data: rawList,
      total: rawList.length,
    };
  },

  async getById(id: string): Promise<ProductionRecord> {
    const listRes = await this.list();
    const item = listRes.data.find((r) => r.id === id);
    if (!item) {
      return apiClient.get<ProductionRecord>(`/production/${id}`);
    }
    return item;
  },

  async create(payload: CreateProductionPayload): Promise<ProductionRecord> {
    return apiClient.post<ProductionRecord>('/production', payload);
  },

  async update(id: string, payload: UpdateProductionPayload): Promise<ProductionRecord> {
    return apiClient.patch<ProductionRecord>(`/production/${id}`, payload);
  },

  async getEmployees(branchId?: string, roleType?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (roleType) params.append('role', roleType);
    params.append('limit', '100');
    params.append('isActive', 'true');

    const res = await apiClient.get<any>(`/employees?${params.toString()}`);
    return Array.isArray(res) ? res : res.data || [];
  },

  async approveStep(id: string, step: 'submit' | 'supervisor' | 'engineer' | 'final'): Promise<ProductionRecord> {
    return apiClient.post<ProductionRecord>(`/production/${id}/approve`, { step });
  },

  async createCorrection(id: string, payload: CorrectionPayload): Promise<any> {
    return apiClient.post<any>(`/production/${id}/correct`, payload);
  },

  async uploadXlsx(file: File): Promise<ProductionImportUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<ProductionImportUploadResponse>('/imports/production/upload', formData);
  },

  async commitImport(jobId: string): Promise<{ success: boolean; insertedCount?: number; message?: string }> {
    return apiClient.post<{ success: boolean; insertedCount?: number; message?: string }>(`/imports/${jobId}/commit`, {});
  },

  async exportXlsx(): Promise<void> {
    const token = localStorage.getItem('erp_auth_token');
    const response = await fetch('http://localhost:3000/api/v1/exports/production.xlsx', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('فشل تحميل ملف إنتاجية الإكسيل');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'production.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Aliases for compatibility
  async getProductionRecords(query: ProductionQuery = {}): Promise<ProductionListResponse> {
    return this.list(query);
  },
  async createProductionRecord(payload: CreateProductionPayload): Promise<ProductionRecord> {
    return this.create(payload);
  },
  async createCorrectionRequest(id: string, payload: CorrectionPayload): Promise<any> {
    return this.createCorrection(id, payload);
  },
};
