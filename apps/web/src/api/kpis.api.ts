import { apiClient } from './client';

export interface EvaluatedWorkerKpi {
  id: string;
  employeeId: string;
  employeeName: string;
  profession: string;
  roleInCrew: string;
  roleLabel: string;
  actualQuantity: number | null;
  standardTarget: number;
  unit: string;
  efficiencyPct: number;
  status: 'excellent' | 'good' | 'poor';
  color: string;
  crewCode: string;
  crewType: string;
  foremanName: string;
  engineerName: string;
  projectName: string;
  productionDate: string;
  workItemName: string;
  stageName: string;
  roomName: string;
}

export interface CascadeNode {
  id: string;
  name: string;
  foremanName?: string;
  engineerName?: string;
  efficiencyPct: number;
  status: 'excellent' | 'good' | 'poor';
}

export interface CascadeKpiResponse {
  summary: {
    totalEvaluatedWorkers: number;
    avgKpi: number;
    greenCount: number;
    yellowCount: number;
    redCount: number;
    crewsCount: number;
    foremenCount: number;
    engineersCount: number;
  };
  engineers: CascadeNode[];
  foremen: CascadeNode[];
  crews: CascadeNode[];
  workers: EvaluatedWorkerKpi[];
}

export interface QueryCascadeKpiParams {
  projectId?: string;
  date?: string;
  foremanId?: string;
  crewId?: string;
}

export const kpisApi = {
  getCascadeKpis: async (params?: QueryCascadeKpiParams): Promise<CascadeKpiResponse> => {
    const q = new URLSearchParams();
    if (params?.projectId) q.append('projectId', params.projectId);
    if (params?.date) q.append('date', params.date);
    if (params?.foremanId) q.append('foremanId', params.foremanId);
    if (params?.crewId) q.append('crewId', params.crewId);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return apiClient.get<CascadeKpiResponse>(`/kpis/cascade${queryString}`);
  },
};
