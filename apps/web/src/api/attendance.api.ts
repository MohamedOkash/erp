import { apiClient } from './client';

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  nationalId?: string;
  projectId: string;
  projectName?: string;
  branchId: string;
  branchName?: string;
  date: string;
  statusId: string;
  statusName?: string;
  statusCode?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  overtimeHours?: number | null;
  notes?: string | null;
}

export interface AttendanceListResponse {
  data: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAttendancePayload {
  employeeId: string;
  projectId: string;
  branchId: string;
  date: string;
  statusId: string;
  checkInTime?: string;
  checkOutTime?: string;
  overtimeHours?: number;
  notes?: string;
}

export const attendanceApi = {
  async getAttendance(query: {
    projectId?: string;
    branchId?: string;
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<AttendanceListResponse> {
    const params = new URLSearchParams();
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiClient.get<AttendanceListResponse>(`/attendance${qs ? `?${qs}` : ''}`);
  },

  async createAttendance(payload: CreateAttendancePayload): Promise<AttendanceRecord> {
    return apiClient.post<AttendanceRecord>('/attendance', payload);
  },
};
