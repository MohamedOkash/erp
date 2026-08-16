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
  source?: 'device' | 'manual' | 'xlsx' | string;
  notes?: string | null;
}

export function normalizeAttendanceRecord(raw: any): AttendanceRecord {
  if (!raw) return raw;
  return {
    id: raw.id,
    companyId: raw.companyId || raw.company_id,
    employeeId: raw.employeeId || raw.employee_id,
    employeeName: raw.employeeName || raw.employee_name,
    nationalId: raw.nationalId || raw.national_id,
    projectId: raw.projectId || raw.project_id,
    projectName: raw.projectName || raw.project_name,
    branchId: raw.branchId || raw.branch_id,
    branchName: raw.branchName || raw.branch_name,
    date: raw.date,
    statusId: raw.statusId || raw.status_id,
    statusName: raw.statusName || raw.status_name,
    statusCode: raw.statusCode || raw.status_code,
    checkInTime: raw.checkInTime || raw.check_in_time || null,
    checkOutTime: raw.checkOutTime || raw.check_out_time || null,
    overtimeHours: Number(raw.overtimeHours ?? raw.overtime_hours ?? 0),
    source: raw.source || 'manual',
    notes: raw.notes || null,
  };
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
    const res = await apiClient.get<AttendanceListResponse>(`/attendance${qs ? `?${qs}` : ''}`);
    return {
      ...res,
      data: (res.data || []).map(normalizeAttendanceRecord),
    };
  },

  async createAttendance(payload: CreateAttendancePayload): Promise<AttendanceRecord> {
    const res = await apiClient.post<any>('/attendance', payload);
    return normalizeAttendanceRecord(res);
  },
};
