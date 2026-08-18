import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  notificationsApi,
  type NotificationItem,
} from '../../api/notifications.api';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/I18nContext';
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
  ExternalLink,
  ArrowLeftRight,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { t, language } = useI18n();
  const navigate = useNavigate();
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

  // Detail Modal for system/general notifications
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

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
      setError(err.message || t('auto.فشل_تحميل_الإشعارات_2effeb'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRowClick = async (n: NotificationItem) => {
    // 1. Mark as read
    if (!n.isRead) {
      try {
        await notificationsApi.markAsRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    }

    // 2. Smart Routing based on type & content
    const type = (n.type || '').toLowerCase();
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();

    if (type === 'alert' || type === 'warning' || title.includes(t('auto.تنبيه_59ced2')) || title.includes('alert') || msg.includes(t('auto.تجاوز_59c2fc'))) {
      navigate('/alerts');
    } else if (
      type === 'approval_request' ||
      type === 'production' ||
      type === 'correction' ||
      title.includes(t('auto.اعتماد_25c964')) ||
      title.includes(t('auto.إنتاج_598860')) ||
      msg.includes(t('auto.إنتاجية_18f1d5'))
    ) {
      navigate('/production');
    } else if (type === 'transfer' || title.includes(t('auto.نقل_185508')) || msg.includes(t('auto.نقل_185508'))) {
      navigate('/transfers');
    } else if (type === 'attendance' || title.includes(t('auto.حضور_2e6c85')) || msg.includes(t('auto.بصمة_2e47e5'))) {
      navigate('/attendance');
    } else if (title.includes(t('auto.مستند_5b42b1')) || title.includes(t('auto.وثيقة_5b69cc'))) {
      navigate('/documents');
    } else {
      // General / System -> Open Modal
      setSelectedNotification(n);
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setSuccessMsg(t('auto.تم_تحديث_حالة_الإشعار_إلى_مقرو_4e790c'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحديث_الإشعار_5135b4'));
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    setError(null);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setSuccessMsg(t('auto.تم_تعليم_كافة_الإشعارات_كمقروء_578c4b'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تعليم_الإشعارات_كمقروءة_19064e'));
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
      case 'transfer':
        return <ArrowLeftRight size={18} color="#06b6d4" />;
      default:
        return <Info size={18} color="#34d399" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'alert':
        return <span className="badge badge-accent">{t('auto.تنبيه_عاجل_20e4b3')}</span>;
      case 'warning':
        return <span className="badge badge-secondary" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>{t('auto.تحذير_59c393')}</span>;
      case 'approval_request':
        return <span className="badge badge-primary">{t('auto.طلب_اعتماد_2a6fca')}</span>;
      case 'transfer':
        return <span className="badge badge-secondary" style={{ color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.3)' }}>{t('auto.طلب_نقل_3520e7')}</span>;
      default:
        return <span className="badge badge-success">{t('auto.إشعار_نظام_31d1b3')}</span>;
    }
  };

  const formatNotificationDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const localeCode = language === 'en' ? 'en-US' : language === 'ur' ? 'ur-PK' : 'ar-SA';
      return d.toLocaleDateString(localeCode, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  // Summary counts
  const alertTypesCount = notifications.filter((n) => n.type === 'alert' || n.type === 'warning').length;

  const statsItems = [
    {
      label: t('auto.إجمالي_الإشعارات_المسجلة_24d7f1'),
      value: total,
      helper: `${notifications.length} معروضة بالصفحة`,
      icon: <Bell size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.إشعارات_جديدة_غير_مقروءة_7aee26'),
      value: unreadCount,
      helper: unreadCount > 0 ? t('auto.تتطلب_اهتمام_المستخدم_1b1603') : t('auto.تمت_قراءة_جميع_الإشعارات_6ef61e'),
      icon: <Clock size={22} />,
      color: unreadCount > 0 ? '#f87171' : '#34d399',
    },
    {
      label: t('auto.تنبيهات_ومخاطر_ميدانية_1ba579'),
      value: alertTypesCount,
      helper: t('auto.تحذيرات_تجاوز_التكاليف_والإنتا_1f0c58'),
      icon: <AlertTriangle size={22} />,
      color: '#f59e0b',
    },
    {
      label: t('auto.أمان_وتتبع_العمليات_4296dc'),
      value: t('auto.نشط_185349'),
      helper: t('auto.تنبيهات_فورية_على_مدار_الساعة_e8ad3a'),
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
            <span>{t('system.notifications_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.notifications')}
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={isMarkingAll || unreadCount === 0}
          className="btn btn-primary"
          style={{
            gap: '0.4rem',
            background: unreadCount > 0 ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'rgba(255, 255, 255, 0.08)',
            border: unreadCount > 0 ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
            color: unreadCount > 0 ? '#fff' : 'var(--text-dim)',
            cursor: unreadCount > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          {isMarkingAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          <span>{t('system.mark_all_read')} {unreadCount > 0 ? `(${unreadCount})` : ''}</span>
        </button>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && notifications.length === 0} />

      {/* Alerts */}
      {successMsg && (
        <div
          className="animate-fade-in"
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
          className="animate-fade-in"
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
          <label className="form-label">{t('auto.حالة_القراءة_1ab7f8')}</label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
          >
            <option value="all">{t('auto.كافة_الإشعارات_المقروءة_والجدي_7ef724')}</option>
            <option value="unread">{t('auto.غير_المقروءة_فقط_الجديدة_70cb21')}</option>
            <option value="read">{t('auto.المقروءة_سابقا_304c80')}</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('auto.نوع_الإشعار_66e77a')}</label>
          <select
            className="input-field"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الأنواع_33976d')}</option>
            <option value="alert">{t('auto.تنبيهات_عاجلة_Alerts_659d81')}</option>
            <option value="warning">{t('auto.تحذيرات_الموقع_Warnings_658f94')}</option>
            <option value="approval_request">{t('auto.طلبات_اعتماد_Approvals_56aa71')}</option>
            <option value="transfer">{t('auto.طلبات_نقل_Transfers_5f850d')}</option>
            <option value="info">{t('auto.إشعارات_عامة_Info_457aff')}</option>
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
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem', width: '50px' }}>{t('auto.النوع_59a413')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.عنوان_الإشعار_3eaae3')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.التفاصيل_والمحتوى_42752b')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.التاريخ_والتوقيت_5e3aa0')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_إشعارات_مطابقة_للمرشحا_5e72cb')}</td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr
                      key={n.id}
                      onClick={() => handleRowClick(n)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                        transition: 'background var(--transition-fast)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.08)';
                      }}
                    >
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {getNotificationIcon(n.type)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: n.isRead ? 'rgba(255,255,255,0.85)' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{n.title}</span>
                          {!n.isRead && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa' }} />
                          )}
                        </div>
                        <div style={{ marginTop: '0.25rem' }}>{getTypeBadge(n.type)}</div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {n.message}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} color="#60a5fa" />
                          <span style={{ fontFamily: 'monospace' }}>
                            {formatNotificationDate(n.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                gap: '0.3rem',
                                color: '#34d399',
                                borderColor: 'rgba(52, 211, 153, 0.3)',
                              }}
                              title={t('auto.تعليم_كمقروء_f1bac0')}
                            >
                              <Check size={13} />
                              <span>{t('auto.تحديد_كمقروء_1342fc')}</span>
                            </button>
                          )}
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                            <ExternalLink size={13} />
                          </span>
                        </div>
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.إشعار_598069')}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('auto.السابق_252abb')}</button>
              <span style={{ padding: '0.35rem 0.5rem' }}>{t('auto.صفحة_2ea914')}{page}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                {t('auto.التالي_252ecf')}</button>
            </div>
          </div>
        </div>
      )}

      {/* System Notification Detail Modal */}
      <Modal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title || t('auto.تفاصيل_الإشعار_35e534')}
      >
        {selectedNotification && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {getNotificationIcon(selectedNotification.type)}
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-heading)' }}>
                {selectedNotification.title}
              </span>
            </div>

            <div
              style={{
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.6,
                fontSize: '0.9rem',
              }}
            >
              {selectedNotification.message}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              <span>{t('auto.النوع_2521a0')}{getTypeBadge(selectedNotification.type)}</span>
              <span>{t('auto.التوقيت_6d19cf')}{formatNotificationDate(selectedNotification.createdAt)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedNotification(null)}
                style={{ padding: '0.5rem 1.25rem' }}
              >
                {t('auto.إغلاق_59834d')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

