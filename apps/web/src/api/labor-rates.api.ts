import { apiClient } from './client';

export interface LaborRateItem {
  id: string;
  company_id?: string;
  rate_type: string;
  hourly_rate: number | string;
  daily_rate: number | string;
  effective_from: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLaborRatePayload {
  rateType: string;
  hourlyRate: number;
  dailyRate: number;
  effectiveFrom?: string;
}

export interface UpdateLaborRatePayload {
  rateType?: string;
  hourlyRate?: number;
  dailyRate?: number;
  effectiveFrom?: string;
}

export const laborRatesApi = {
  async list(): Promise<LaborRateItem[]> {
    return apiClient.get('/labor-rates');
  },

  async getById(id: string): Promise<LaborRateItem> {
    return apiClient.get(`/labor-rates/${id}`);
  },

  async create(payload: CreateLaborRatePayload): Promise<LaborRateItem> {
    return apiClient.post('/labor-rates', payload);
  },

  async update(id: string, payload: UpdateLaborRatePayload): Promise<LaborRateItem> {
    return apiClient.patch(`/labor-rates/${id}`, payload);
  },
};
