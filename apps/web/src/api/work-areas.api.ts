import { apiClient } from './client';

export interface WorkArea {
  id: string;
  companyId: string;
  projectId: string;
  projectName?: string;
  parentId?: string | null;
  parentName?: string | null;
  name: string;
  code?: string | null;
  level: number;
  path?: string;
  sortOrder: number;
  area_m2?: number | null;
  areaM2?: number | null;
  isActive: boolean;
  children?: WorkArea[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomBoqItem {
  id: string;
  company_id: string;
  project_id: string;
  work_area_id: string;
  work_item_id: string;
  work_item_name?: string;
  work_item_code?: string;
  work_item_stage_id?: string | null;
  stage_name?: string | null;
  total_quantity: number;
  unit_rate: number;
  unit_id?: string | null;
  unit_symbol?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkAreaQuery {
  projectId?: string;
  parentId?: string;
  level?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkAreaListResponse {
  data: WorkArea[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateWorkAreaPayload {
  projectId: string;
  parentId?: string | null;
  name: string;
  code?: string;
  sortOrder?: number;
  areaM2?: number;
  isActive?: boolean;
}

export interface UpdateWorkAreaPayload {
  name?: string;
  code?: string;
  parentId?: string | null;
  sortOrder?: number;
  areaM2?: number;
  isActive?: boolean;
}

export interface SaveRoomBoqPayload {
  projectId: string;
  workItemId: string;
  workItemStageId?: string;
  totalQuantity: number;
  unitRate?: number;
  unitId?: string;
  notes?: string;
}

export const workAreasApi = {
  async list(query: WorkAreaQuery = {}): Promise<WorkAreaListResponse> {
    const params = new URLSearchParams();
    if (query.projectId) params.append('projectId', query.projectId);
    if (query.parentId) params.append('parentId', query.parentId);
    if (query.level !== undefined) params.append('level', String(query.level));
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiClient.get<WorkAreaListResponse>(`/work-areas${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string): Promise<WorkArea> {
    return apiClient.get<WorkArea>(`/work-areas/${id}`);
  },

  async create(payload: CreateWorkAreaPayload): Promise<WorkArea> {
    return apiClient.post<WorkArea>('/work-areas', payload);
  },

  async update(id: string, payload: UpdateWorkAreaPayload): Promise<WorkArea> {
    return apiClient.patch<WorkArea>(`/work-areas/${id}`, payload);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/work-areas/${id}`);
  },

  async getRoomBoq(id: string): Promise<{ data: RoomBoqItem[] }> {
    return apiClient.get<{ data: RoomBoqItem[] }>(`/work-areas/${id}/room-boq`);
  },

  async saveRoomBoq(id: string, payload: SaveRoomBoqPayload): Promise<RoomBoqItem> {
    return apiClient.post<RoomBoqItem>(`/work-areas/${id}/room-boq`, payload);
  },

  async deleteRoomBoq(id: string, itemId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/work-areas/${id}/room-boq/${itemId}`);
  },
};
