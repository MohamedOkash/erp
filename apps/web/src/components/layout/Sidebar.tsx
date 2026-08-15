import React from 'react';
import { NavLink } from 'react-router-dom';
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
  const navItems = [
    {
      to: '/dashboard',
      label: 'الرئيسية',
      icon: <LayoutDashboard size={20} />,
    },
    {
      to: '/employees',
      label: 'العمال والموظفون',
      icon: <Users size={20} />,
    },
    {
      to: '/projects',
      label: 'المشاريع والفروع',
      icon: <FolderKanban size={20} />,
    },
    {
      to: '/boq',
      label: 'المقايسة وتقدم التنفيذ',
      icon: <FileSpreadsheet size={20} />,
    },
    {
      to: '/production',
      label: 'الإنتاجية اليومية',
      icon: <Layers size={20} />,
    },
    {
      to: '/attendance',
      label: 'الحضور والانصراف',
      icon: <CalendarCheck size={20} />,
    },
    {
      to: '/costs',
      label: 'التكاليف وسجل المصروفات',
      icon: <DollarSign size={20} />,
    },
    {
      to: '/incentives',
      label: 'الحوافز والمكافآت',
      icon: <Award size={20} />,
    },
    {
      to: '/documents',
      label: 'المستندات والأرشيف',
      icon: <FileText size={20} />,
    },
    {
      to: '/alerts',
      label: 'التنبيهات والإشعارات',
      icon: <BellRing size={20} />,
    },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '80px' : '260px',
        minHeight: '100vh',
        background: 'rgba(17, 29, 56, 0.95)',
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
              نظام التشطيبات
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              Construction ERP
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
          <span>الإصدار 1.0.0 (Saudi Localization)</span>
        </div>
      )}
    </aside>
  );
};
