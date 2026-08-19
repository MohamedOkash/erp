import { apiClient } from './client';

export interface EmployeeAssignment {
  projectId: string;
  projectName: string;
  projectCode: string;
  assignedRole: string;
  startDate: string;
}

export interface Employee {
  id: string;
  companyId: string;
  identityNumber: string;
  nationalId?: string;
  companyEmployeeId?: string | null;
  projectEmployeeId?: string | null;
  deviceCode?: string | null;
  identityType?: 'national_id' | 'iqama' | 'passport';
  identityExpiryDate?: string | null;
  nationality?: string | null;
  name: string;
  code?: string | null;
  phone?: string | null;
  roleType: string;
  role?: string;
  profession?: string | null;
  hourlyRate?: number | null;
  hourly_rate?: number | null;
  primaryBranchId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  dailyWage: number;
  hireDate?: string | null;
  isActive: boolean;
  assignments?: EmployeeAssignment[];
  projectCodes?: Array<{
    id: string;
    project_id: string;
    project_name: string;
    project_employee_code: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeQuery {
  branchId?: string;
  role?: string;
  profession?: string;
  projectId?: string;
  search?: string;
  identityNumber?: string;
  code?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface EmployeeListResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateEmployeePayload {
  name: string;
  identityNumber: string;
  deviceCode?: string;
  identityType?: 'national_id' | 'iqama' | 'passport';
  identityExpiryDate?: string;
  nationality?: string;
  roleType: string;
  profession?: string;
  hourlyRate?: number;
  dailyWage?: number;
  primaryBranchId?: string;
  code?: string;
  companyEmployeeId?: string;
  projectEmployeeId?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateEmployeePayload {
  name?: string;
  identityNumber?: string;
  deviceCode?: string;
  identityType?: 'national_id' | 'iqama' | 'passport';
  identityExpiryDate?: string;
  nationality?: string;
  roleType?: string;
  profession?: string;
  hourlyRate?: number;
  dailyWage?: number;
  primaryBranchId?: string;
  code?: string;
  companyEmployeeId?: string;
  projectEmployeeId?: string;
  phone?: string;
  isActive?: boolean;
}

export interface StagingRowResponse {
  rowIndex: number;
  name: string | null;
  nationalId: string | null;
  phone: string | null;
  branch: string | null;
  wage: number;
  status: 'valid' | 'duplicate' | 'invalid';
  errors: string[];
}

export interface ImportSummary {
  total: number;
  valid: number;
  duplicate: number;
  invalid: number;
}

export interface ImportUploadResponse {
  jobId: string;
  summary: ImportSummary;
  rows: StagingRowResponse[];
}

export const employeesApi = {
  async list(query: EmployeeQuery = {}): Promise<EmployeeListResponse> {
    const params = new URLSearchParams();
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.role) params.append('role', query.role);
    if (query.search) params.append('search', query.search);
    if (query.identityNumber) params.append('identityNumber', query.identityNumber);
    if (query.code) params.append('code', query.code);
    if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    const res = await apiClient.get<any>(`/employees${qs ? `?${qs}` : ''}`);
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

  async getById(id: string): Promise<Employee> {
    return apiClient.get<Employee>(`/employees/${id}`);
  },

  async getByIdentity(identityNumber: string): Promise<Employee> {
    return apiClient.get<Employee>(`/employees/by-identity/${encodeURIComponent(identityNumber)}`);
  },

  async create(payload: CreateEmployeePayload): Promise<Employee> {
    return apiClient.post<Employee>('/employees', payload);
  },

  async update(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    return apiClient.patch<Employee>(`/employees/${id}`, payload);
  },

  async deactivate(id: string): Promise<{ id: string; isActive: boolean; message: string }> {
    return apiClient.delete<{ id: string; isActive: boolean; message: string }>(`/employees/${id}`);
  },

  async uploadXlsx(file: File): Promise<ImportUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<ImportUploadResponse>('/imports/employees/upload', formData);
  },

  async commitImport(jobId: string): Promise<{ success: boolean; insertedCount?: number; message?: string }> {
    return apiClient.post<{ success: boolean; insertedCount?: number; message?: string }>(`/imports/${jobId}/commit`, {});
  },

  async exportXlsx(): Promise<void> {
    const token = localStorage.getItem('erp_auth_token');
    const response = await fetch('http://localhost:3000/api/v1/exports/employees.xlsx', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('فشل تحميل ملف الإكسيل');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async assignProjectCode(id: string, projectId: string, projectEmployeeCode: string): Promise<any> {
    return apiClient.post(`/employees/${id}/project-code`, { projectId, projectEmployeeCode });
  },

  async getProjectCodes(id: string): Promise<{ data: any[] }> {
    return apiClient.get<{ data: any[] }>(`/employees/${id}/project-codes`);
  },

  // Aliases for compatibility
  async getEmployees(query: EmployeeQuery = {}): Promise<EmployeeListResponse> {
    return this.list(query);
  },
  async getEmployeeById(id: string): Promise<Employee> {
    return this.getById(id);
  },
  async getEmployeeByIdentity(identityNumber: string): Promise<Employee> {
    return this.getByIdentity(identityNumber);
  },
  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    return this.create(payload);
  },
  async updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    return this.update(id, payload);
  },
  async deleteEmployee(id: string): Promise<{ id: string; isActive: boolean; message: string }> {
    return this.deactivate(id);
  },
};

