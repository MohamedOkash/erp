import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationsApi, type NotificationItem } from '../api/notifications.api';
import { useI18n } from '../i18n/I18nContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  ExternalLink,
  Loader2,
  Calendar,
  ArrowLeftRight,
} from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatDateLocale = (dateStr?: string) => {
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

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res?.count ?? 0);
    } catch {
      // ignore
    }
  }, []);

  const fetchLatestNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await notificationsApi.list({ limit: 8 });
      setNotifications(res.data || []);
      if (res.unreadCount !== undefined) {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load + 60s background interval
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch list on open
  useEffect(() => {
    if (isOpen) {
      fetchLatestNotifications();
    }
  }, [isOpen, fetchLatestNotifications]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    // 1. Mark as read immediately if not yet read
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

    setIsOpen(false);

    // 2. Smart Navigation based on Type & Title
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
      navigate('/notifications');
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle size={16} color="#f87171" />;
      case 'warning':
        return <AlertTriangle size={16} color="#f59e0b" />;
      case 'approval_request':
        return <CheckCircle2 size={16} color="#60a5fa" />;
      case 'transfer':
        return <ArrowLeftRight size={16} color="#06b6d4" />;
      default:
        return <Info size={16} color="#34d399" />;
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="btn btn-secondary"
        style={{
          position: 'relative',
          padding: '0.5rem',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={t('system.notifications_title')}
      >
        <Bell size={18} color="var(--text-main, #ffffff)" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'var(--text-heading)',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid var(--bg-surface, #0f172a)',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="glass-card animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: 'min(380px, calc(100vw - 2rem))',
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 60,
            background: 'var(--bg-surface, #111d38)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-glow, rgba(59, 130, 246, 0.3))',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.5))',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface-elevated, rgba(30, 41, 59, 0.7))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Bell size={16} color="#60a5fa" />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-heading, #ffffff)' }}>{t('system.notifications_title')}</strong>
              {unreadCount > 0 && (
                <span className="badge badge-accent" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                  {unreadCount} {t('system.unread_badge')}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--brand-primary, #60a5fa)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {t('system.mark_all_read')}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }} className="sidebar-scroll">
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Loader2 size={18} className="animate-spin" color="#60a5fa" />
                <span style={{ fontSize: '0.85rem' }}>{t('common.loading')}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} color="#34d399" style={{ margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>{t('system.notifications_empty')}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.08)';
                  }}
                >
                  <div style={{ marginTop: '0.15rem', flexShrink: 0 }}>{getNotificationIcon(n.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: n.isRead ? 'var(--text-muted)' : 'var(--text-heading, #ffffff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </strong>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title={t('system.mark_read')}
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#10b981',
                            cursor: 'pointer',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          <Check size={12} />
                          <span>{t('system.mark_read')}</span>
                        </button>
                      )}
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={11} color="#60a5fa" />
                      <span>{formatDateLocale(n.createdAt || n.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions: Mark all as read + View All */}
          <div
            style={{
              padding: '0.65rem 1rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface-elevated, rgba(30, 41, 59, 0.7))',
            }}
          >
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm, 6px)',
                }}
              >
                <Check size={13} />
                <span>{t('system.mark_all_read')}</span>
              </button>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('system.notifications_all_read')}</span>
            )}

            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.78rem',
                color: 'var(--brand-primary, #60a5fa)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700,
              }}
            >
              <span>{t('system.notifications_title')}</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

