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
  stageCode?: string | null;
  stagePercentage?: number | null;
  workAreaId?: string | null;
  workAreaName?: string | null;
  date: string;
  productionType: 'individual' | 'team' | 'mixed';
  actualQuantity: number;
  targetQuantity: number;
  teamCode?: string | null;
  crewId?: string | null;
  crewCode?: string | null;
  crewType?: string | null;
  foremanId?: string | null;
  engineerNotes?: string | null;
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
  crewId?: string;
  workAreaId?: string;
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

export function normalizeProductionRecord(r: any): ProductionRecord {
  if (!r) return r;
  const workers: ProductionWorkerItem[] = (r.workers || []).map((w: any) => ({
    id: w.id,
    employeeId: w.employee_id || w.employeeId || '',
    employeeName: w.employee_name || w.employeeName || 'عامل',
    employeeCode: w.employee_code || w.employeeCode || '',
    workerType: w.worker_type || w.workerType || 'individual',
    individualQuantity: Number(w.individual_quantity ?? w.individualQuantity ?? 0),
    hoursWorked: Number(w.hours_worked ?? w.hoursWorked ?? 8),
    overtimeHours: Number(w.overtime_hours ?? w.overtimeHours ?? 0),
    bonusPercentage: Number(w.bonus_percentage ?? w.bonusPercentage ?? 0),
    skillLevel: w.skill_level || w.skillLevel || null,
    isEstimated: w.is_estimated ?? w.isEstimated ?? false,
    ...w,
  }));

  return {
    ...r,
    id: r.id,
    companyId: r.company_id || r.companyId || '',
    branchId: r.branch_id || r.branchId || '',
    branchName: r.branch_name || r.branchName || 'فرع',
    projectId: r.project_id || r.projectId || '',
    projectName: r.project_name || r.projectName || 'مشروع',
    workItemId: r.work_item_id || r.workItemId || '',
    workItemName: r.work_item_name || r.workItemName || 'بند',
    workItemCode: r.work_item_code || r.workItemCode || '',
    workItemStageId: r.work_item_stage_id || r.workItemStageId || null,
    stageName: r.stage_name || r.stageName || null,
    stageCode: r.stage_code || r.stageCode || null,
    stagePercentage: r.stage_percentage !== undefined ? Number(r.stage_percentage) : r.stagePercentage,
    workAreaId: r.work_area_id || r.workAreaId || null,
    workAreaName: r.work_area_name || r.workAreaName || null,
    date: r.date,
    productionType: r.production_type || r.productionType || 'individual',
    actualQuantity: Number(r.actual_quantity ?? r.actualQuantity ?? 0),
    targetQuantity: Number(r.target_quantity ?? r.targetQuantity ?? 0),
    teamCode: r.team_code || r.teamCode || null,
    crewId: r.crew_id || r.crewId || null,
    crewCode: r.crew_code || r.crewCode || null,
    crewType: r.crew_type || r.crewType || null,
    foremanId: r.foreman_id || r.foremanId || null,
    engineerNotes: r.engineer_notes || r.engineerNotes || null,
    supervisorId: r.supervisor_id || r.supervisorId || '',
    supervisorName: r.supervisor_name || r.supervisorName || '—',
    engineerId: r.engineer_id || r.engineerId || null,
    engineerName: r.engineer_name || r.engineerName || null,
    status: r.status || 'draft',
    rejectionReason: r.rejection_reason || r.rejectionReason || null,
    submittedAt: r.submitted_at || r.submittedAt || null,
    supervisorApprovedAt: r.supervisor_approved_at || r.supervisorApprovedAt || null,
    engineerApprovedAt: r.engineer_approved_at || r.engineerApprovedAt || null,
    finalApprovedAt: r.final_approved_at || r.finalApprovedAt || null,
    createdAt: r.created_at || r.createdAt,
    updatedAt: r.updated_at || r.updatedAt,
    workers,
  };
}

export const productionApi = {
  async list(query: ProductionQuery = {}): Promise<ProductionListResponse> {
    const params = new URLSearchParams();
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.crewId) params.append('crewId', query.crewId);
    if (query.workAreaId) params.append('workAreaId', query.workAreaId);
    if (query.status && query.status !== 'all') params.append('status', query.status);

    const qs = params.toString();
    const res = await apiClient.get<any>(`/production${qs ? `?${qs}` : ''}`);

    let rawList: any[] = [];
    if (Array.isArray(res)) {
      rawList = res;
    } else if (res && Array.isArray(res.data)) {
      rawList = res.data;
    }

    let normalizedList = rawList.map(normalizeProductionRecord);

    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      normalizedList = normalizedList.filter(
        (r) =>
          r.projectName?.toLowerCase().includes(s) ||
          r.workItemName?.toLowerCase().includes(s) ||
          r.supervisorName?.toLowerCase().includes(s) ||
          r.teamCode?.toLowerCase().includes(s) ||
          r.crewCode?.toLowerCase().includes(s),
      );
    }

    return {
      data: normalizedList,
      total: normalizedList.length,
    };
  },

  async getById(id: string): Promise<ProductionRecord> {
    const listRes = await this.list();
    const item = listRes.data.find((r) => r.id === id);
    if (!item) {
      const raw = await apiClient.get<any>(`/production/${id}`);
      return normalizeProductionRecord(raw);
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
