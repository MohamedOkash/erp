import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { AccountSettingsModal } from './AccountSettingsModal';
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
  HardHat,
  ChevronDown,
} from 'lucide-react';

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

interface SidebarGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  links: SidebarLink[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'overview',
    title: 'نظرة عامة',
    icon: <LayoutDashboard size={16} />,
    color: '#60a5fa',
    links: [
      { to: '/dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard size={16} /> },
      { to: '/control-cards', label: 'بطاقات التحكم', icon: <FileSpreadsheet size={16} /> },
      { to: '/daily-report', label: 'التقرير اليومي', icon: <BarChart3 size={16} /> },
    ],
  },
  {
    id: 'operations',
    title: 'عمليات الموقع',
    icon: <HardHat size={16} />,
    color: '#f59e0b',
    links: [
      { to: '/production', label: 'الإنتاجية اليومية', icon: <Layers size={16} /> },
      { to: '/boq', label: 'المقايسة وتقدم التنفيذ', icon: <FileSpreadsheet size={16} /> },
      { to: '/work-areas', label: 'مناطق العمل (الهيكل)', icon: <Network size={16} /> },
      { to: '/attendance', label: 'الحضور والانصراف', icon: <CalendarCheck size={16} /> },
      { to: '/transfers', label: 'نقل الكوادر والمشرفين', icon: <ArrowLeftRight size={16} /> },
    ],
  },
  {
    id: 'resources',
    title: 'الموارد والبيانات',
    icon: <Building size={16} />,
    color: '#34d399',
    links: [
      { to: '/employees', label: 'الموظفون والعمال', icon: <Users size={16} /> },
      { to: '/branches', label: 'الفروع', icon: <Building size={16} /> },
      { to: '/projects', label: 'المشاريع', icon: <FolderKanban size={16} /> },
      { to: '/work-items', label: 'بنود الأعمال (BOQ)', icon: <CheckSquare size={16} /> },
    ],
  },
  {
    id: 'finance',
    title: 'المالية',
    icon: <DollarSign size={16} />,
    color: '#a78bfa',
    links: [
      { to: '/costs', label: 'التكاليف والمصروفات', icon: <DollarSign size={16} /> },
      { to: '/incentives', label: 'الحوافز والمكافآت', icon: <Award size={16} /> },
    ],
  },
  {
    id: 'documents',
    title: 'المستندات والتقارير',
    icon: <FileText size={16} />,
    color: '#38bdf8',
    links: [
      { to: '/documents', label: 'المستندات والأرشيف', icon: <FileText size={16} /> },
      { to: '/reports', label: 'التقارير والمؤشرات', icon: <BarChart3 size={16} /> },
      { to: '/alerts', label: 'قواعد التنبيهات الميدانية', icon: <BellRing size={16} /> },
    ],
  },
  {
    id: 'system',
    title: 'النظام والأمان',
    icon: <Shield size={16} />,
    color: '#f87171',
    links: [
      { to: '/notifications', label: 'مركز الإشعارات والتنبيهات', icon: <Bell size={16} /> },
      { to: '/users', label: 'إدارة الحسابات والمستخدمين', icon: <Users size={16} /> },
      { to: '/rbac', label: 'الصلاحيات (RBAC)', icon: <Shield size={16} /> },
      { to: '/settings', label: 'الإعدادات', icon: <Settings size={16} /> },
    ],
  },
];

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Group accordion state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    operations: true,
    resources: false,
    finance: false,
    documents: false,
    system: false,
  });

  // Auto-expand group containing current active route
  useEffect(() => {
    const currentPath = location.pathname;
    const activeGroup = SIDEBAR_GROUPS.find((group) =>
      group.links.some((link) => link.to === currentPath || currentPath.startsWith(link.to + '/')),
    );
    if (activeGroup) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-main)' }}>
      <div className="app-bg-glow" />

      {/* Right Fixed Sidebar (RTL) */}
      <aside
        style={{
          width: sidebarOpen ? '270px' : '0px',
          minHeight: '100vh',
          background: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(20px)',
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
            flexShrink: 0,
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
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, whiteSpace: 'nowrap', margin: 0 }}>
                منظومة المقاولات
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                Saudi Edition 🇸🇦
              </span>
            </div>
          </div>
        </div>

        {/* Grouped Accordion Navigation */}
        <nav
          className="sidebar-scroll"
          style={{
            flex: 1,
            padding: '0.85rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {SIDEBAR_GROUPS.map((group) => {
            const isOpen = !!openGroups[group.id];
            const hasActiveChild = group.links.some(
              (l) => l.to === location.pathname || location.pathname.startsWith(l.to + '/'),
            );

            return (
              <div
                key={group.id}
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: hasActiveChild ? 'rgba(30, 41, 59, 0.5)' : 'transparent',
                  border: hasActiveChild ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: hasActiveChild ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    transition: 'all var(--transition-fast)',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ color: group.color, display: 'flex', alignItems: 'center' }}>
                      {group.icon}
                    </span>
                    <span>{group.title}</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: hasActiveChild ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        color: hasActiveChild ? '#93c5fd' : 'var(--text-dim)',
                        fontWeight: 600,
                      }}
                    >
                      {group.links.length}
                    </span>
                  </div>

                  <ChevronDown
                    size={14}
                    style={{
                      color: 'var(--text-dim)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>

                {/* Sub Links */}
                {isOpen && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      padding: '0.25rem 0.4rem 0.4rem 0.4rem',
                    }}
                  >
                    {group.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        style={({ isActive }) => ({
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.65rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          color: isActive ? '#ffffff' : 'rgba(203, 213, 225, 0.85)',
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.4) 0%, rgba(30, 64, 175, 0.2) 100%)'
                            : 'transparent',
                          border: isActive ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid transparent',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.82rem',
                          textDecoration: 'none',
                          transition: 'all var(--transition-fast)',
                          whiteSpace: 'nowrap',
                          boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                        })}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                          <span style={{ opacity: 0.9 }}>{link.icon}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</span>
                        </div>
                        {link.comingSoon && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-dim)',
                            }}
                          >
                            قريبًا
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
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
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setAccountSettingsOpen(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.65rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-main)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'right',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <User size={15} color="#60a5fa" />
                      <span>إعدادات الحساب والأمان</span>
                    </button>

                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.65rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-main)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <Settings size={15} color="#94a3b8" />
                      <span>إعدادات المنظومة</span>
                    </Link>

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0' }} />

                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.65rem',
                        fontSize: '0.82rem',
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

      {/* Account Settings & Password Modal */}
      <AccountSettingsModal
        isOpen={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />
    </div>
  );
};

