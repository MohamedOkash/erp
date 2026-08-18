import { useI18n } from '../../i18n/I18nContext';
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Bell, Menu, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { t } = useI18n();
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        height: '64px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(11, 19, 41, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="btn btn-secondary"
          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
          title={t('auto.تبديل_القائمة_12eac2')}
        >
          <Menu size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-accent" style={{ fontSize: '0.75rem' }}>
            {t('auto.المملكة_العربية_السعودية_4bd0f2')}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>|</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('auto.العملة_SAR_7b639b')}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Notifications Icon Link */}
        <Link
          to="/alerts"
          className="btn btn-secondary"
          style={{
            padding: '0.45rem',
            position: 'relative',
            borderRadius: 'var(--radius-md)',
          }}
          title={t('auto.الإشعارات_والتنبيهات_219801')}
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 8px #ef4444',
            }}
          />
        </Link>

        {/* User Info & Role Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
              {user?.fullName || user?.username}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {user?.roles?.map((r) => (
                <span key={r.roleCode} className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                  {r.roleName}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(37, 99, 235, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
            }}
          >
            <Shield size={18} />
          </div>

          <button
            onClick={() => logout()}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.8rem',
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              gap: '0.35rem',
            }}
            title={t('auto.تسجيل_الخروج_b1a849')}
          >
            <LogOut size={14} />
            <span>{t('auto.خروج_2e729e')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
