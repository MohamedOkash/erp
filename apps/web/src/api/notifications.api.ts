import { apiClient } from './client';

export interface NotificationItem {
  id: string;
  companyId?: string;
  company_id?: string;
  userId?: string;
  user_id?: string;
  title: string;
  message: string;
  body?: string;
  type: 'alert' | 'info' | 'warning' | 'approval_request' | string;
  isRead: boolean;
  is_read?: boolean;
  readAt?: string | null;
  read_at?: string | null;
  createdAt: string;
  created_at?: string;
  data?: any;
  metadata?: any;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  unreadCount?: number;
}

export interface QueryNotificationDto {
  isRead?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

const normalizeNotification = (n: any): NotificationItem => {
  const isRead = n.isRead !== undefined ? n.isRead : !!n.is_read;
  const createdAt = n.createdAt || n.created_at || new Date().toISOString();
  return {
    id: n.id,
    companyId: n.companyId || n.company_id,
    userId: n.userId || n.user_id,
    title: n.title,
    message: n.message || n.body || '',
    body: n.body || n.message || '',
    type: n.type || 'info',
    isRead,
    is_read: isRead,
    readAt: n.readAt || n.read_at,
    createdAt,
    created_at: createdAt,
    data: n.data || n.metadata,
    metadata: n.metadata || n.data,
  };
};

export const notificationsApi = {
  async list(query: QueryNotificationDto = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    if (query.isRead !== undefined) params.append('isRead', String(query.isRead));
    if (query.type) params.append('type', query.type);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/notifications${qs}`);
    if (Array.isArray(res)) {
      const normalized = res.map(normalizeNotification);
      return {
        data: normalized,
        total: normalized.length,
        unreadCount: normalized.filter((n) => !n.isRead).length,
      };
    }
    const rawData = res.data || [];
    const normalizedData = rawData.map(normalizeNotification);
    return {
      data: normalizedData,
      total: res.total ?? normalizedData.length,
      page: res.page,
      limit: res.limit,
      totalPages: res.totalPages,
      unreadCount: res.unreadCount ?? normalizedData.filter((n: NotificationItem) => !n.isRead).length,
    };
  },

  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get('/notifications/unread-count');
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await apiClient.patch<any>(`/notifications/${id}/read`, {});
    return normalizeNotification(res);
  },

  async markAllAsRead(): Promise<{ message: string; count: number }> {
    return apiClient.patch('/notifications/mark-all-read', {});
  },
};

