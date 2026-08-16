import { apiClient } from './client';

export interface SavedReportItem {
  id: string;
  company_id: string;
  name: string;
  report_type: 'production' | 'attendance' | 'costs' | 'control_cards' | 'boq' | string;
  query_config: {
    filters?: Record<string, any>;
    columns?: string[];
    isShared?: boolean;
    isPublic?: boolean;
    sharedUserIds?: string[];
    [key: string]: any;
  } | string;
  created_by: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedReportListResponse {
  data: SavedReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSavedReportPayload {
  name: string;
  reportType: string;
  filters?: Record<string, any>;
  columns?: string[];
  isShared?: boolean;
  isPublic?: boolean;
  sharedUserIds?: string[];
}

export interface UpdateSavedReportPayload {
  name?: string;
  reportType?: string;
  filters?: Record<string, any>;
  columns?: string[];
  isShared?: boolean;
  isPublic?: boolean;
  sharedUserIds?: string[];
}

export interface RunReportResult {
  reportId: string;
  reportName: string;
  reportType: string;
  executedAt: string;
  rowCount: number;
  data: any[];
  summary?: Record<string, any>;
}

export interface QuerySavedReportDto {
  page?: number;
  limit?: number;
  reportType?: string;
}

export const reportsApi = {
  async list(query: QuerySavedReportDto = {}): Promise<SavedReportListResponse> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.reportType) params.append('reportType', query.reportType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/saved-reports${qs}`);
  },

  async create(payload: CreateSavedReportPayload): Promise<SavedReportItem> {
    return apiClient.post('/saved-reports', payload);
  },

  async run(id: string): Promise<RunReportResult> {
    return apiClient.post(`/saved-reports/${id}/run`, {});
  },

  async share(id: string, userIds: string[]): Promise<any> {
    return apiClient.post(`/saved-reports/${id}/share`, { userIds });
  },

  async update(id: string, payload: UpdateSavedReportPayload): Promise<SavedReportItem> {
    return apiClient.patch(`/saved-reports/${id}`, payload);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/saved-reports/${id}`);
  },
};
