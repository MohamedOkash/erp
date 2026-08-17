import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationsApi, type NotificationItem } from '../api/notifications.api';
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
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchLatestNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleItemClick = async (n: NotificationItem) => {
    // 1. Mark as read if not already read
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

    if (type === 'alert' || type === 'warning' || title.includes('تنبيه') || title.includes('alert') || msg.includes('تجاوز')) {
      navigate('/alerts');
    } else if (
      type === 'approval_request' ||
      type === 'production' ||
      type === 'correction' ||
      title.includes('اعتماد') ||
      title.includes('إنتاج') ||
      msg.includes('إنتاجية')
    ) {
      navigate('/production');
    } else if (type === 'transfer' || title.includes('نقل') || msg.includes('نقل')) {
      navigate('/transfers');
    } else if (type === 'attendance' || title.includes('حضور') || msg.includes('بصمة')) {
      navigate('/attendance');
    } else if (title.includes('مستند') || title.includes('وثيقة')) {
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
        title="التنبيهات والإشعارات"
      >
        <Bell size={18} color="#ffffff" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.15rem 0.4rem',
              borderRadius: '9999px',
              border: '2px solid #0f172a',
              minWidth: '18px',
              textAlign: 'center',
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
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
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
              background: 'rgba(30, 41, 59, 0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Bell size={16} color="#60a5fa" />
              <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>الإشعارات والتنبيهات</strong>
              {unreadCount > 0 && (
                <span className="badge badge-accent" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                  {unreadCount} جديد
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
                  color: '#60a5fa',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 600,
                }}
              >
                {isMarkingAll ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                <span>قراءة الكل</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }} className="sidebar-scroll">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>جاري التحميل...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Bell size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <p style={{ margin: 0 }}>لا توجد إشعارات جديدة حالياً</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
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
                  <div style={{ marginTop: '0.15rem', flexShrink: 0 }}>{getNotificationIcon(n.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: n.isRead ? 'rgba(255,255,255,0.85)' : '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </strong>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="تحديد كمقروء"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#34d399',
                            cursor: 'pointer',
                            padding: '0.1rem',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={11} color="#60a5fa" />
                      <span>
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'الآن'}
                      </span>
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
              background: 'rgba(30, 41, 59, 0.7)',
            }}
          >
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#34d399',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Check size={13} />
                <span>تحديد الكل كمقروء</span>
              </button>
            ) : (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>جميع الإشعارات مقروءة</span>
            )}

            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.78rem',
                color: '#60a5fa',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 700,
              }}
            >
              <span>مركز الإشعارات</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

