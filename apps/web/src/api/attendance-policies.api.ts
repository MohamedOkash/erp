import { apiClient } from './client';

export interface AttendancePolicy {
  id: string;
  companyId: string;
  projectId?: string | null;
  projectName?: string | null;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: number;
  breakMinutes: number;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
  effectiveFrom: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeAttendancePolicy(raw: any): AttendancePolicy {
  if (!raw) return raw;
  return {
    id: raw.id,
    companyId: raw.companyId || raw.company_id,
    projectId: raw.projectId || raw.project_id || null,
    projectName: raw.projectName || raw.project_name || null,
    shiftStartTime: raw.shiftStartTime || raw.shift_start_time || '08:00',
    shiftEndTime: raw.shiftEndTime || raw.shift_end_time || '17:00',
    graceMinutes: Number(raw.graceMinutes ?? raw.grace_minutes ?? 15),
    breakMinutes: Number(raw.breakMinutes ?? raw.break_minutes ?? 60),
    overtimeThresholdHours: Number(raw.overtimeThresholdHours ?? raw.overtime_threshold_hours ?? 8),
    overtimeMultiplier: Number(raw.overtimeMultiplier ?? raw.overtime_multiplier ?? 1.5),
    effectiveFrom: raw.effectiveFrom || raw.effective_from || '2026-01-01',
    isActive: raw.isActive ?? raw.is_active ?? true,
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
  };
}

export interface CreateAttendancePolicyPayload {
  projectId?: string | null;
  shiftStartTime?: string;
  shiftEndTime?: string;
  graceMinutes?: number;
  breakMinutes?: number;
  overtimeThresholdHours?: number;
  overtimeMultiplier?: number;
  effectiveFrom?: string;
  isActive?: boolean;
}

export interface UpdateAttendancePolicyPayload {
  projectId?: string | null;
  shiftStartTime?: string;
  shiftEndTime?: string;
  graceMinutes?: number;
  breakMinutes?: number;
  overtimeThresholdHours?: number;
  overtimeMultiplier?: number;
  effectiveFrom?: string;
  isActive?: boolean;
}

export const attendancePoliciesApi = {
  getPolicies: async (params?: { projectId?: string; isActive?: boolean }): Promise<AttendancePolicy[]> => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.append('projectId', params.projectId);
    if (params?.isActive !== undefined) qs.append('isActive', String(params.isActive));
    const res = await apiClient.get<any[]>(`/attendance-policies${qs.toString() ? `?${qs.toString()}` : ''}`);
    const list = Array.isArray(res) ? res : (res as any)?.data || [];
    return list.map(normalizeAttendancePolicy);
  },

  getEffectivePolicy: async (params?: { projectId?: string; date?: string }): Promise<AttendancePolicy> => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.append('projectId', params.projectId);
    if (params?.date) qs.append('date', params.date);
    const res = await apiClient.get<any>(`/attendance-policies/effective${qs.toString() ? `?${qs.toString()}` : ''}`);
    return normalizeAttendancePolicy(res);
  },

  createPolicy: async (payload: CreateAttendancePolicyPayload): Promise<AttendancePolicy> => {
    const res = await apiClient.post<any>('/attendance-policies', payload);
    return normalizeAttendancePolicy(res);
  },

  updatePolicy: async (id: string, payload: UpdateAttendancePolicyPayload): Promise<AttendancePolicy> => {
    const res = await apiClient.put<any>(`/attendance-policies/${id}`, payload);
    return normalizeAttendancePolicy(res);
  },

  deletePolicy: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/attendance-policies/${id}`);
    return res;
  },
};
