import { apiClient } from './client';

export interface AlertRule {
  id: string;
  companyId: string;
  name: string;
  ruleType: 'low_productivity' | 'attendance_irregularity' | 'iqama_expiry' | 'cost_overrun';
  thresholdValue: number;
  thresholdUnit?: string | null;
  isActive: boolean;
  notifyRoles?: string[];
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'warning' | 'approval_request';
  isRead: boolean;
  createdAt: string;
}

export const alertsApi = {
  async getAlertRules(): Promise<{ data: AlertRule[] }> {
    const res = await apiClient.get<any>('/alert-rules');
    return { data: Array.isArray(res) ? res : (res.data || []) };
  },

  async createAlertRule(payload: {
    name: string;
    ruleType: string;
    thresholdValue: number;
    thresholdUnit?: string;
    isActive?: boolean;
    notifyRoles?: string[];
  }): Promise<AlertRule> {
    return apiClient.post<AlertRule>('/alert-rules', payload);
  },

  async evaluateRules(): Promise<{ rulesEvaluated?: number; alertsTriggered?: number; evaluatedRulesCount?: number; triggeredAlertsCount?: number }> {
    return apiClient.post('/alerts/evaluate');
  },

  async getNotifications(query: { isRead?: boolean; page?: number; limit?: number } = {}): Promise<{
    data: NotificationItem[];
    total: number;
    unreadCount: number;
  }> {
    const params = new URLSearchParams();
    if (query.isRead !== undefined) params.append('isRead', String(query.isRead));
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    const qs = params.toString();
    const res = await apiClient.get<any>(`/notifications${qs ? `?${qs}` : ''}`);
    const data = Array.isArray(res) ? res : (res.data || []);
    const unread = data.filter((n: NotificationItem) => !n.isRead).length;
    return {
      data,
      total: res.total || data.length,
      unreadCount: res.unreadCount !== undefined ? res.unreadCount : unread,
    };
  },

  async markAllRead(): Promise<{ message: string; updatedCount?: number }> {
    return apiClient.post<{ message: string; updatedCount?: number }>('/notifications/mark-all-read');
  },

  async markRead(id: string): Promise<{ id: string; isRead: boolean }> {
    return apiClient.patch<{ id: string; isRead: boolean }>(`/notifications/${id}/read`);
  },
};
