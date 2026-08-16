import { apiClient } from './client';

export interface StaffTransfer {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  employee_role: string;
  from_project_id?: string | null;
  from_project_name?: string | null;
  to_project_id: string;
  to_project_name: string;
  requested_by: string;
  requester_name?: string;
  requested_role: string;
  reason?: string;
  urgency: 'normal' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  approved_by?: string | null;
  approver_name?: string | null;
  approved_at?: string | null;
  executed_at?: string | null;
  transfer_date: string;
  created_at: string;
  updated_at: string;
}

export interface QueryTransfersParams {
  status?: string;
  employeeId?: string;
  projectId?: string;
  urgency?: string;
  page?: number;
  limit?: number;
}

export interface RequestTransferPayload {
  employeeId: string;
  fromProjectId?: string;
  toProjectId: string;
  reason?: string;
  urgency?: 'normal' | 'urgent';
  transferDate?: string;
}

export const transfersApi = {
  list: async (params?: QueryTransfersParams): Promise<{ data: StaffTransfer[]; total: number }> => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.employeeId) sp.append('employeeId', params.employeeId);
    if (params?.projectId) sp.append('projectId', params.projectId);
    if (params?.urgency) sp.append('urgency', params.urgency);
    if (params?.page) sp.append('page', params.page.toString());
    if (params?.limit) sp.append('limit', params.limit.toString());

    const qs = sp.toString();
    const res = await apiClient.get<any>(`/transfers${qs ? `?${qs}` : ''}`);
    if (Array.isArray(res)) {
      return { data: res, total: res.length };
    }
    return {
      data: res.data || [],
      total: res.total || (res.data ? res.data.length : 0),
    };
  },
  getById: async (id: string): Promise<StaffTransfer> => {
    return apiClient.get<StaffTransfer>(`/transfers/${id}`);
  },
  request: async (payload: RequestTransferPayload): Promise<StaffTransfer> => {
    return apiClient.post<StaffTransfer>('/transfers/request', payload);
  },
  approve: async (id: string): Promise<StaffTransfer> => {
    return apiClient.post<StaffTransfer>(`/transfers/${id}/approve`);
  },
  reject: async (id: string, rejectionReason?: string): Promise<StaffTransfer> => {
    return apiClient.post<StaffTransfer>(`/transfers/${id}/reject`, { rejectionReason });
  },
  execute: async (id: string): Promise<StaffTransfer> => {
    return apiClient.post<StaffTransfer>(`/transfers/${id}/execute`);
  },
};
