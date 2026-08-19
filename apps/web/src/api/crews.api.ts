import { apiClient } from './client';

export interface CrewMember {
  employeeId: string;
  role: 'skilled_1' | 'skilled_2' | 'helper' | 'maallem' | 'labor';
  joinedAt?: string;
  employeeName?: string;
  profession?: string;
  hourlyRate?: number;
  companyEmployeeId?: string;
  projectEmployeeId?: string;
  identityNumber?: string;
  roleTitle?: string;
  dailyWage?: number;
}

export interface CrewTemplate {
  id: string;
  company_id: string;
  name: string;
  name_en?: string;
  name_ur?: string;
  code: string;
  skilled_count: number;
  unskilled_count: number;
  description?: string | null;
  description_en?: string | null;
  description_ur?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Crew {
  id: string;
  company_id: string;
  project_id: string;
  project_name?: string;
  code: string;
  crew_type?: string;
  crew_number?: string;
  template_id?: string | null;
  template_name?: string | null;
  skilled_count?: number;
  unskilled_count?: number;
  foreman_id?: string | null;
  foreman_name?: string | null;
  work_area_id?: string | null;
  work_area_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members: CrewMember[];
}

export interface QueryCrewParams {
  projectId?: string;
  crewType?: string;
  isActive?: boolean;
  workAreaId?: string;
}

export interface CreateCrewPayload {
  projectId: string;
  code: string;
  crewType?: string;
  templateId?: string;
  foremanId?: string;
  crewNumber?: string;
  workAreaId?: string;
  isActive?: boolean;
  members?: Array<{
    employeeId: string;
    role: 'skilled_1' | 'skilled_2' | 'helper' | 'maallem' | 'labor';
  }>;
}

export interface CreateCrewTemplatePayload {
  name: string;
  code: string;
  skilledCount: number;
  unskilledCount: number;
  description?: string;
}

export const crewsApi = {
  getTemplates: async (): Promise<{ data: CrewTemplate[] }> => {
    return apiClient.get<{ data: CrewTemplate[] }>('/crews/templates');
  },

  createTemplate: async (payload: CreateCrewTemplatePayload): Promise<CrewTemplate> => {
    return apiClient.post<CrewTemplate>('/crews/templates', payload);
  },

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
