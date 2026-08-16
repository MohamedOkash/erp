import React, { useEffect, useState, useCallback } from 'react';
import {
  notificationsApi,
  type NotificationItem,
} from '../../api/notifications.api';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  AlertCircle,
  Clock,
  Shield,
  Loader2,
  Calendar,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isReadParam =
        statusFilter === 'unread' ? false : statusFilter === 'read' ? true : undefined;

      const res = await notificationsApi.list({
        page,
        limit,
        isRead: isReadParam,
        type: typeFilter || undefined,
      });

      setNotifications(res.data || []);
      setTotal(res.total || 0);
      if (res.unreadCount !== undefined) {
        setUnreadCount(res.unreadCount);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الإشعارات');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setSuccessMsg('تم تحديث حالة الإشعار إلى مقروء.');
    } catch (err: any) {
      setError(err.message || 'فشل تحديث الإشعار');
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    setError(null);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setSuccessMsg('تم تعليم كافة الإشعارات كمقروءة بنجاح.');
    } catch (err: any) {
      setError(err.message || 'فشل تعليم الإشعارات كمقروءة');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle size={18} color="#f87171" />;
      case 'warning':
        return <AlertTriangle size={18} color="#f59e0b" />;
      case 'approval_request':
        return <CheckCircle2 size={18} color="#60a5fa" />;
      default:
        return <Info size={18} color="#34d399" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'alert':
        return <span className="badge badge-accent">تنبيه عاجل</span>;
      case 'warning':
        return <span className="badge badge-secondary" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>تحذير</span>;
      case 'approval_request':
        return <span className="badge badge-primary">طلب اعتماد</span>;
      default:
        return <span className="badge badge-success">إشعار نظام</span>;
    }
  };

  // Summary counts
  const alertTypesCount = notifications.filter((n) => n.type === 'alert' || n.type === 'warning').length;

  const statsItems = [
    {
      label: 'إجمالي الإشعارات المسجلة',
      value: total,
      helper: `${notifications.length} معروضة بالصفحة`,
      icon: <Bell size={22} />,
      color: '#60a5fa',
    },
    {
      label: 'إشعارات جديدة غير مقروءة',
      value: unreadCount,
      helper: unreadCount > 0 ? 'تتطلب اهتمام المستخدم' : 'تمت قراءة جميع الإشعارات',
      icon: <Clock size={22} />,
      color: unreadCount > 0 ? '#f87171' : '#34d399',
    },
    {
      label: 'تنبيهات ومخاطر ميدانية',
      value: alertTypesCount,
      helper: 'تحذيرات تجاوز التكاليف والإنتاجية',
      icon: <AlertTriangle size={22} />,
      color: '#f59e0b',
    },
    {
      label: 'أمان وتتبع العمليات',
      value: 'نشط',
      helper: 'تنبيهات فورية على مدار الساعة',
      icon: <Shield size={22} />,
      color: '#a78bfa',
    },
  ];

  const startRecord = notifications.length === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Top Header & Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={26} color="#60a5fa" />
            <span>مركز الإشعارات والتنبيهات الميدانية</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            سجل كامل لكافة التنبيهات، طلبات الاعتماد، والرسائل النظامية الخاصة بالمستخدم
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="btn btn-primary"
            style={{ gap: '0.4rem', background: '#3b82f6' }}
          >
            {isMarkingAll ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>تعليم الكل كمقروء ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && notifications.length === 0} />

      {/* Alerts */}
      {successMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--status-success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--status-danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">حالة القراءة</label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
          >
            <option value="all">كافة الإشعارات (المقروءة والجديدة)</option>
            <option value="unread">غير المقروءة فقط (الجديدة)</option>
            <option value="read">المقروءة سابقاً</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">نوع الإشعار</label>
          <select
            className="input-field"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الأنواع</option>
            <option value="alert">تنبيهات عاجلة (Alerts)</option>
            <option value="warning">تحذيرات الموقع (Warnings)</option>
            <option value="approval_request">طلبات اعتماد (Approvals)</option>
            <option value="info">إشعارات عامة (Info)</option>
          </select>
        </div>
      </div>

      {/* Notifications Table */}
      {isLoading && notifications.length === 0 ? (
        <TableSkeleton rows={6} columns={5} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem', width: '50px' }}>النوع</th>
                  <th style={{ padding: '1rem' }}>عنوان الإشعار</th>
                  <th style={{ padding: '1rem' }}>التفاصيل والمحتوى</th>
                  <th style={{ padding: '1rem' }}>التاريخ والتوقيت</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      لا توجد إشعارات مطابقة للمرشحات
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr
                      key={n.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {getNotificationIcon(n.type)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{n.title}</span>
                          {!n.isRead && (
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#60a5fa' }} />
                          )}
                        </div>
                        <div style={{ marginTop: '0.2rem' }}>{getTypeBadge(n.type)}</div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {n.message}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} color="#60a5fa" />
                          <span>
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleDateString('ar-SA', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {!n.isRead ? (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(n.id)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              gap: '0.3rem',
                              color: '#34d399',
                              borderColor: 'rgba(52, 211, 153, 0.3)',
                            }}
                            title="تعليم كمقروء"
                          >
                            <Check size={13} />
                            <span>تحديد كمقروء</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>مقروء ✓</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              padding: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              عرض {startRecord}–{endRecord} من إجمالي {total} إشعار
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                السابق
              </button>
              <span style={{ padding: '0.35rem 0.5rem' }}>صفحة {page}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
