import React from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileSpreadsheet,
  Layers,
  CalendarCheck,
  DollarSign,
  Award,
  FileText,
  BellRing,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const { t } = useI18n();
  const navItems = [
    {
      to: '/dashboard',
      label: t('auto.الرئيسية_772ff2'),
      icon: <LayoutDashboard size={20} />,
    },
    {
      to: '/employees',
      label: t('auto.العمال_والموظفون_54d4fe'),
      icon: <Users size={20} />,
    },
    {
      to: '/projects',
      label: t('auto.المشاريع_والفروع_59c3e5'),
      icon: <FolderKanban size={20} />,
    },
    {
      to: '/boq',
      label: t('auto.المقايسة_وتقدم_التنفيذ_77ac76'),
      icon: <FileSpreadsheet size={20} />,
    },
    {
      to: '/production',
      label: t('auto.الإنتاجية_اليومية_5b6d3f'),
      icon: <Layers size={20} />,
    },
    {
      to: '/attendance',
      label: t('auto.الحضور_والانصراف_7d9ff8'),
      icon: <CalendarCheck size={20} />,
    },
    {
      to: '/costs',
      label: t('auto.التكاليف_وسجل_المصروفات_7b7976'),
      icon: <DollarSign size={20} />,
    },
    {
      to: '/incentives',
      label: t('auto.الحوافز_والمكافآت_52fa80'),
      icon: <Award size={20} />,
    },
    {
      to: '/documents',
      label: t('auto.المستندات_والأرشيف_7b3887'),
      icon: <FileText size={20} />,
    },
    {
      to: '/alerts',
      label: t('auto.التنبيهات_والإشعارات_dc4ebf'),
      icon: <BellRing size={20} />,
    },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '80px' : '260px',
        minHeight: '100vh',
        background: 'var(--bg-surface-elevated)',
        backdropFilter: 'blur(16px)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-normal)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            flexShrink: 0,
          }}
        >
          <Building2 size={22} color="#ffffff" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {t('auto.نظام_التشطيبات_5b7890')}
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              {t('app.subtitle')}
            </span>
          </div>
        )}
      </div>

      {/* Nav List */}
      <nav
        style={{
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(30, 64, 175, 0.15) 100%)'
                : 'transparent',
              border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
            })}
          >
            {item.icon}
            {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer / App Version */}
      {!collapsed && (
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            textAlign: 'center',
          }}
        >
          <span>{t('auto.الإصدار_1_0_0_Saudi_Localizati_21e06b')}</span>
        </div>
      )}
    </aside>
  );
};
