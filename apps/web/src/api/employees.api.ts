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
  identityType?: 'national_id' | 'iqama' | 'passport';
  identityExpiryDate?: string | null;
  nationality?: string | null;
  name: string;
  code?: string | null;
  phone?: string | null;
  roleType: string;
  role?: string;
  primaryBranchId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  dailyWage: number;
  hireDate?: string | null;
  isActive: boolean;
  assignments?: EmployeeAssignment[];
}

export interface EmployeeQuery {
  branchId?: string;
  role?: string;
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
  identityType?: 'national_id' | 'iqama' | 'passport';
  identityExpiryDate?: string;
  nationality?: string;
  roleType: string;
  dailyWage?: number;
  primaryBranchId?: string;
  code?: string;
  phone?: string;
}

export interface UpdateEmployeePayload {
  name?: string;
  identityNumber?: string;
  identityType?: 'national_id' | 'iqama' | 'passport';
  identityExpiryDate?: string;
  nationality?: string;
  roleType?: string;
  dailyWage?: number;
  primaryBranchId?: string;
  code?: string;
  phone?: string;
  isActive?: boolean;
}

export const employeesApi = {
  async getEmployees(query: EmployeeQuery = {}): Promise<EmployeeListResponse> {
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
    return apiClient.get<EmployeeListResponse>(`/employees${qs ? `?${qs}` : ''}`);
  },

  async getEmployeeById(id: string): Promise<Employee> {
    return apiClient.get<Employee>(`/employees/${id}`);
  },

  async getEmployeeByIdentity(identityNumber: string): Promise<Employee> {
    return apiClient.get<Employee>(`/employees/by-identity/${encodeURIComponent(identityNumber)}`);
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    return apiClient.post<Employee>('/employees', payload);
  },

  async updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    return apiClient.patch<Employee>(`/employees/${id}`, payload);
  },

  async deleteEmployee(id: string): Promise<{ id: string; isActive: boolean; message: string }> {
    return apiClient.delete<{ id: string; isActive: boolean; message: string }>(`/employees/${id}`);
  },
};
