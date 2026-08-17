import { apiClient } from './client';

export interface CompanySettingItem {
  id: string;
  company_id: string;
  key: string;
  value: string;
  data_type: 'number' | 'string' | 'boolean' | 'json';
  category: string;
  display_name_ar: string;
  description_ar: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettingsResponse {
  list: CompanySettingItem[];
  settings: Record<string, any>;
}

export const companySettingsApi = {
  async getSettings(): Promise<CompanySettingsResponse> {
    return apiClient.get('/company-settings');
  },

  async updateSettings(settings: Record<string, string | number>): Promise<CompanySettingsResponse> {
    return apiClient.put('/company-settings', { settings });
  },
};
