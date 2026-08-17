import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import {
  LayoutDashboard,
  Building,
  FolderKanban,
  CheckSquare,
  Network,
  Users,
  ArrowLeftRight,
  Layers,
  FileSpreadsheet,
  CalendarCheck,
  DollarSign,
  Award,
  FileText,
  BarChart3,
  BellRing,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  User,
  Shield,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard size={19} /> },
    { to: '/control-cards', label: 'بطاقات التحكم', icon: <FileSpreadsheet size={19} /> },
    { to: '/daily-report', label: 'التقرير اليومي', icon: <BarChart3 size={19} /> },
    { to: '/branches', label: 'الفروع', icon: <Building size={19} /> },
    { to: '/projects', label: 'المشاريع', icon: <FolderKanban size={19} /> },
    { to: '/work-items', label: 'بنود الأعمال (BOQ)', icon: <CheckSquare size={19} /> },
    { to: '/work-areas', label: 'مناطق العمل (الهيكل)', icon: <Network size={19} /> },
    { to: '/employees', label: 'الموظفون والعمال', icon: <Users size={19} /> },
    { to: '/transfers', label: 'نقل الكوادر والمشرفين', icon: <ArrowLeftRight size={19} /> },
    { to: '/production', label: 'الإنتاجية اليومية', icon: <Layers size={19} /> },
    { to: '/boq', label: 'المقايسة وتقدم التنفيذ', icon: <FileSpreadsheet size={19} /> },
    { to: '/attendance', label: 'الحضور والانصراف', icon: <CalendarCheck size={19} /> },
    { to: '/costs', label: 'التكاليف والمصروفات', icon: <DollarSign size={19} /> },
    { to: '/incentives', label: 'الحوافز والمكافآت', icon: <Award size={19} /> },
    { to: '/documents', label: 'المستندات والأرشيف', icon: <FileText size={19} /> },
    { to: '/reports', label: 'التقارير والمؤشرات', icon: <BarChart3 size={19} /> },
    { to: '/alerts', label: 'قواعد التنبيهات الميدانية', icon: <BellRing size={19} /> },
    { to: '/notifications', label: 'مركز الإشعارات والتنبيهات', icon: <Bell size={19} /> },
    { to: '/users', label: 'إدارة الحسابات والمستخدمين', icon: <Users size={19} /> },
    { to: '/rbac', label: 'مصفوفة الصلاحيات والأدوار', icon: <Shield size={19} /> },
    { to: '/settings', label: 'الإعدادات', icon: <Settings size={19} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-main)' }}>
      <div className="app-bg-glow" />

      {/* Right Fixed Sidebar (RTL) */}
      <aside
        style={{
          width: sidebarOpen ? '260px' : '0px',
          minHeight: '100vh',
          background: 'rgba(17, 29, 56, 0.96)',
          backdropFilter: 'blur(16px)',
          borderLeft: sidebarOpen ? '1px solid var(--border-subtle)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all var(--transition-normal)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Brand Section */}
        <div
          style={{
            height: '64px',
            padding: '0 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.1rem',
              }}
            >
              ERP
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                منظومة المقاولات
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                Saudi Edition 🇸🇦
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          style={{
            flex: 1,
            padding: '1rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            overflowY: 'auto',
          }}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(30, 64, 175, 0.15) 100%)'
                  : 'transparent',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              })}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>العملة: SAR</span>
          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>متصل</span>
        </div>
      </aside>

      {/* Main View Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Top Header (64px) */}
        <header
          style={{
            height: '64px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(11, 19, 41, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            zIndex: 45,
            flexShrink: 0,
          }}
        >
          {/* Left Controls & Company Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)' }}
              title="تبديل القائمة الجانبية"
            >
              {sidebarOpen ? <Menu size={18} /> : <X size={18} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>الشركة:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                شركة البناء المتقدمة للتطوير والمقاولات
              </span>
            </div>

            {/* Project Scope Badge if scoped user */}
            {user?.scopes && user.scopes.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  color: '#c084fc',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                <FolderKanban size={13} />
                <span>
                  نطاق العمل الميداني:{' '}
                  {user.scopes.length === 1
                    ? user.scopes[0].projectName || user.scopes[0].projectCode || 'مشروع محدد'
                    : `${user.scopes.length} مشاريع مخصصة`}
                </span>
              </div>
            )}
          </div>

          {/* Right User Area & Notifications */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {/* Live Notification Bell with Dropdown */}
            <NotificationBell />

            {/* User Avatar & Dropdown Trigger */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                    {user?.fullName || user?.username}
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.1rem' }}>
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
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(30, 64, 175, 0.4) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60a5fa',
                  }}
                >
                  <User size={18} />
                </div>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div
                  className="glass-card animate-fade-in"
                  style={{
                    position: 'absolute',
                    top: '120%',
                    left: 0,
                    width: '200px',
                    padding: '0.5rem',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 60,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.fullName || user?.username || 'مستخدم النظام'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      معرف: {user?.id ? `${user.id.substring(0, 8)}...` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '0.25rem 0' }}>
                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-main)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <Shield size={15} color="#60a5fa" />
                      <span>الملف التعريفي</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#f87171',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'right',
                      }}
                    >
                      <LogOut size={15} />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main
          onClick={() => userMenuOpen && setUserMenuOpen(false)}
          style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
