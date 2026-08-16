import { apiClient } from './client';

export interface NotificationItem {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'warning' | 'approval_request' | string;
  isRead: boolean;
  createdAt: string;
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
      return {
        data: res,
        total: res.length,
        unreadCount: res.filter((n: NotificationItem) => !n.isRead).length,
      };
    }
    return res;
  },

  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get('/notifications/unread-count');
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    return apiClient.patch(`/notifications/${id}/read`, {});
  },

  async markAllAsRead(): Promise<{ message: string; count: number }> {
    return apiClient.patch('/notifications/mark-all-read', {});
  },
};
