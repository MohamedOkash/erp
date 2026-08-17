import { apiClient } from './client';

export interface WorkCategory {
  id: string;
  company_id: string;
  parent_id?: string | null;
  level: number;
  name: string;
  code: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  items_count?: number;
}

export interface WorkItemStage {
  id: string;
  company_id: string;
  work_item_id: string;
  name: string;
  code?: string;
  percentage: number;
  standard_productivity: number;
  unit_id?: string;
  unit_name?: string;
  unit_symbol?: string;
  sort_order: number;
  is_active: boolean;
}

export interface CreateStagePayload {
  name: string;
  code?: string;
  percentage: number;
  standard_productivity?: number;
  standardProductivity?: number;
  unitId?: string;
  sortOrder?: number;
}

export interface WorkItemPrice {
  id: string;
  company_id: string;
  work_item_id: string;
  branch_id?: string | null;
  branch_name?: string;
  contract_price: number;
  material_price: number;
  labor_rate_skilled: number;
  labor_rate_unskilled: number;
  effective_from: string;
}

export interface CreatePricePayload {
  branchId?: string | null;
  contractPrice: number;
  materialPrice?: number;
  laborRateSkilled?: number;
  laborRateUnskilled?: number;
  effectiveFrom?: string;
}

export interface LaborRate {
  id: string;
  company_id: string;
  rate_type: string;
  hourly_rate: number;
  daily_rate: number;
  effective_from: string;
}

export const workCategoriesApi = {
  list: async (): Promise<WorkCategory[]> => {
    return apiClient.get<WorkCategory[]>('/work-categories');
  },
  create: async (data: Partial<WorkCategory>): Promise<WorkCategory> => {
    return apiClient.post<WorkCategory>('/work-categories', data);
  },
  update: async (id: string, data: Partial<WorkCategory>): Promise<WorkCategory> => {
    return apiClient.patch<WorkCategory>(`/work-categories/${id}`, data);
  },
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/work-categories/${id}`);
  },
};

export const workItemStagesApi = {
  listByItem: async (itemId: string): Promise<WorkItemStage[]> => {
    return apiClient.get<WorkItemStage[]>(`/work-items/${itemId}/stages`);
  },
  create: async (itemId: string, data: CreateStagePayload): Promise<WorkItemStage> => {
    return apiClient.post<WorkItemStage>(`/work-items/${itemId}/stages`, data);
  },
  update: async (stageId: string, data: Partial<CreateStagePayload>): Promise<WorkItemStage> => {
    return apiClient.patch<WorkItemStage>(`/work-item-stages/${stageId}`, data);
  },
  delete: async (stageId: string): Promise<void> => {
    return apiClient.delete(`/work-item-stages/${stageId}`);
  },
};

export const workItemPricesApi = {
  listByItem: async (itemId: string): Promise<WorkItemPrice[]> => {
    return apiClient.get<WorkItemPrice[]>(`/work-items/${itemId}/prices`);
  },
  create: async (itemId: string, data: CreatePricePayload): Promise<WorkItemPrice> => {
    return apiClient.post<WorkItemPrice>(`/work-items/${itemId}/prices`, data);
  },
  update: async (priceId: string, data: Partial<CreatePricePayload>): Promise<WorkItemPrice> => {
    return apiClient.patch<WorkItemPrice>(`/work-item-prices/${priceId}`, data);
  },
};

export const laborRatesApi = {
  list: async (): Promise<LaborRate[]> => {
    return apiClient.get<LaborRate[]>('/labor-rates');
  },
  create: async (data: Partial<LaborRate>): Promise<LaborRate> => {
    return apiClient.post<LaborRate>('/labor-rates', data);
  },
  update: async (id: string, data: Partial<LaborRate>): Promise<LaborRate> => {
    return apiClient.patch<LaborRate>(`/labor-rates/${id}`, data);
  },
};
