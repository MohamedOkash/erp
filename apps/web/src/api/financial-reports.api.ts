import { apiClient } from './client';

export interface WorkItemBreakEvenAnalysis {
  workItemId: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  boqQuantity: number;
  executedQuantity: number;
  contractUnitPrice: number;
  unitMaterialCost: number;
  unitLaborCost: number;
  variableUnitCost: number;
  unitContributionMargin: number;
  marginPct: number;
  itemContractValue: number;
  allocatedOverhead: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  breakEvenProgressPct: number;
  remainingToBreakEven: number;
  isBreakEvenReached: boolean;
}

export interface ProjectFinancialReport {
  project: {
    id: string;
    name: string;
    code: string;
    branchName?: string;
    status: string;
    contractValue: number;
    budget: number;
    startDate?: string;
    endDate?: string;
  };
  financialSummary: {
    revenue: number;
    totalExecutedRevenue: number;
    directCosts: {
      material: number;
      labor: number;
      equipment: number;
      other: number;
      totalDirect: number;
    };
    overheadExpenses: number;
    totalCost: number;
    grossProfit: number;
    grossMarginPct: number;
    netProfit: number;
    netProfitMarginPct: number;
  };
  costStructurePercentages: {
    materialPct: number;
    laborPct: number;
    equipmentPct: number;
    overheadPct: number;
    otherPct: number;
  };
  workItems: WorkItemBreakEvenAnalysis[];
}

export const financialReportsApi = {
  getProjectReport: async (projectId: string): Promise<ProjectFinancialReport> => {
    return apiClient.get<ProjectFinancialReport>(`/financial-reports/project/${projectId}`);
  },
};

