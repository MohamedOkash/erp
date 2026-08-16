import { apiClient } from './client';

export interface ControlCardSummary {
  workItemId: string;
  name: string;
  code?: string;
  category?: string;
  unit: string;
  totalPerDay: number;
  crewDailyCost: number;
  laborCostPerUnit: number;
  contractPrice: number;
  materialPrice: number;
  marginPerUnit: number;
  progressPct: number;
}

export interface ControlCardStage {
  id: string;
  name: string;
  code?: string;
  percentage: number;
  standardProductivity: number;
  actualTotalProductivity: number;
  crew: {
    skilled: number;
    unskilled: number;
  };
}

export interface ControlCardDetail {
  item: {
    id: string;
    name: string;
    code?: string;
    unit: string;
  };
  stages: ControlCardStage[];
  totals: {
    perDay: number;
    perHour: number;
  };
  labor: {
    skilledDaily: number;
    unskilledDaily: number;
    crewDailyCost: number;
    laborCostPerUnit: number;
  };
  contract: {
    price: number;
    materialPrice: number;
    marginPerUnit: number;
  };
  live: {
    boqQuantity: number;
    weightedDone: number;
    progressPct: number;
    actualDailyAvg: number;
    variancePct: number;
    remainingDays: number;
  };
}

export interface DailyReportRow {
  recordId: string;
  date: string;
  workItemId: string;
  workItemName: string;
  workItemCode?: string;
  stageId?: string;
  stageName: string;
  unit: string;
  actualQuantity: number;
  stagePercentage: number;
  weightedDone: number;
  workersCount: number;
  dailyLaborCost: number;
  standardTarget: number;
  productivityPct: number;
  status: string;
  supervisorName: string;
}

export const controlCardsApi = {
  list: async (params?: { projectId?: string; categoryId?: string; search?: string }): Promise<ControlCardSummary[]> => {
    const sp = new URLSearchParams();
    if (params?.projectId) sp.append('projectId', params.projectId);
    if (params?.categoryId) sp.append('categoryId', params.categoryId);
    if (params?.search) sp.append('search', params.search);

    const qs = sp.toString();
    return apiClient.get<ControlCardSummary[]>(`/control-cards${qs ? `?${qs}` : ''}`);
  },

  getDetail: async (workItemId: string, projectId?: string): Promise<ControlCardDetail> => {
    const qs = projectId ? `?projectId=${projectId}` : '';
    return apiClient.get<ControlCardDetail>(`/control-cards/${workItemId}${qs}`);
  },

  getDailyReport: async (projectId: string, date: string): Promise<DailyReportRow[]> => {
    const sp = new URLSearchParams();
    if (projectId) sp.append('projectId', projectId);
    if (date) sp.append('date', date);

    return apiClient.get<DailyReportRow[]>(`/control-reports/daily?${sp.toString()}`);
  },
};
