import { apiClient } from './client';

export interface CrewMember {
  employeeId: string;
  role: 'skilled_1' | 'skilled_2' | 'helper';
  joinedAt?: string;
  employeeName?: string;
  companyEmployeeId?: string;
  projectEmployeeId?: string;
  identityNumber?: string;
  roleTitle?: string;
  dailyWage?: number;
}

export interface Crew {
  id: string;
  company_id: string;
  project_id: string;
  project_name?: string;
  code: string;
  crew_type: 'A' | 'B';
  work_area_id?: string | null;
  work_area_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members: CrewMember[];
}

export interface QueryCrewParams {
  projectId?: string;
  crewType?: 'A' | 'B';
  isActive?: boolean;
  workAreaId?: string;
}

export interface CreateCrewPayload {
  projectId: string;
  code: string;
  crewType: 'A' | 'B';
  workAreaId?: string;
  isActive?: boolean;
  members?: Array<{
    employeeId: string;
    role: 'skilled_1' | 'skilled_2' | 'helper';
  }>;
}

export const crewsApi = {
  getCrews: async (params?: QueryCrewParams): Promise<{ data: Crew[] }> => {
    const q = new URLSearchParams();
    if (params?.projectId) q.append('projectId', params.projectId);
    if (params?.crewType) q.append('crewType', params.crewType);
    if (params?.isActive !== undefined) q.append('isActive', String(params.isActive));
    if (params?.workAreaId) q.append('workAreaId', params.workAreaId);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return apiClient.get<{ data: Crew[] }>(`/crews${queryString}`);
  },

  getCrewById: async (id: string): Promise<Crew> => {
    return apiClient.get<Crew>(`/crews/${id}`);
  },

  createCrew: async (payload: CreateCrewPayload): Promise<Crew> => {
    return apiClient.post<Crew>('/crews', payload);
  },

  deleteCrew: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/crews/${id}`);
  },
};
