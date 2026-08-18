import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
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
  Sun,
  Moon,
} from 'lucide-react';

interface SidebarLink {
  to: string;
  key: string;
  defaultLabel: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

interface SidebarGroup {
  id: string;
  defaultTitle: string;
  icon: React.ReactNode;
  color: string;
  links: SidebarLink[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'overview',
    defaultTitle: 'نظرة عامة',
    icon: <LayoutDashboard size={16} />,
    color: '#60a5fa',
    links: [
      { to: '/dashboard', key: 'dashboard', defaultLabel: 'لوحة التحكم', icon: <LayoutDashboard size={16} /> },
      { to: '/control-cards', key: 'control_cards', defaultLabel: 'بطاقات التحكم', icon: <FileSpreadsheet size={16} /> },
      { to: '/daily-report', key: 'daily_report', defaultLabel: 'التقرير اليومي', icon: <BarChart3 size={16} /> },
    ],
  },
  {
    id: 'operations',
    defaultTitle: 'عمليات الموقع',
    icon: <HardHat size={16} />,
    color: '#f59e0b',
    links: [
      { to: '/production', key: 'production', defaultLabel: 'الإنتاجية اليومية', icon: <Layers size={16} /> },
      { to: '/boq', key: 'boq', defaultLabel: 'المقايسة وتقدم التنفيذ', icon: <FileSpreadsheet size={16} /> },
      { to: '/work-areas', key: 'work_areas', defaultLabel: 'مناطق العمل (الهيكل)', icon: <Network size={16} /> },
      { to: '/attendance', key: 'attendance', defaultLabel: 'الحضور والانصراف', icon: <CalendarCheck size={16} /> },
      { to: '/transfers', key: 'transfers', defaultLabel: 'نقل الكوادر والمشرفين', icon: <ArrowLeftRight size={16} /> },
    ],
  },
  {
    id: 'resources',
    defaultTitle: 'الموارد والبيانات',
    icon: <Building size={16} />,
    color: '#34d399',
    links: [
      { to: '/employees', key: 'employees', defaultLabel: 'الموظفون والعمال', icon: <Users size={16} /> },
      { to: '/branches', key: 'branches', defaultLabel: 'الفروع', icon: <Building size={16} /> },
      { to: '/projects', key: 'projects', defaultLabel: 'المشاريع', icon: <FolderKanban size={16} /> },
      { to: '/work-items', key: 'work_items', defaultLabel: 'بنود الأعمال (BOQ)', icon: <CheckSquare size={16} /> },
    ],
  },
  {
    id: 'finance',
    defaultTitle: 'المالية',
    icon: <DollarSign size={16} />,
    color: '#a78bfa',
    links: [
      { to: '/costs', key: 'costs', defaultLabel: 'التكاليف والمصروفات', icon: <DollarSign size={16} /> },
      { to: '/incentives', key: 'incentives', defaultLabel: 'الحوافز والمكافآت', icon: <Award size={16} /> },
    ],
  },
  {
    id: 'documents',
    defaultTitle: 'المستندات والتقارير',
    icon: <FileText size={16} />,
    color: '#38bdf8',
    links: [
      { to: '/documents', key: 'documents', defaultLabel: 'المستندات والأرشيف', icon: <FileText size={16} /> },
      { to: '/reports', key: 'reports', defaultLabel: 'التقارير والمؤشرات', icon: <BarChart3 size={16} /> },
      { to: '/alerts', key: 'alerts', defaultLabel: 'قواعد التنبيهات الميدانية', icon: <BellRing size={16} /> },
    ],
  },
  {
    id: 'system',
    defaultTitle: 'النظام والأمان',
    icon: <Shield size={16} />,
    color: '#f87171',
    links: [
      { to: '/notifications', key: 'notifications', defaultLabel: 'مركز الإشعارات والتنبيهات', icon: <Bell size={16} /> },
      { to: '/users', key: 'users', defaultLabel: 'إدارة الحسابات والمستخدمين', icon: <Users size={16} /> },
      { to: '/rbac', key: 'rbac', defaultLabel: 'الصلاحيات (RBAC)', icon: <Shield size={16} /> },
      { to: '/settings', key: 'settings', defaultLabel: 'الإعدادات', icon: <Settings size={16} /> },
    ],
  },
];

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, direction } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false,
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth > 1024 : true,
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Responsive window resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

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

  // Close user dropdown or drawer when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        if (isMobile && sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen, isMobile, sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-main)', position: 'relative' }}>
      <div className="app-bg-glow" />

      {/* Backdrop for Mobile Off-Canvas Drawer */}
      {isMobile && sidebarOpen && (
        <div
          className="sidebar-drawer-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop Sticky / Mobile Off-canvas Drawer) */}
      <aside
        className={isMobile ? 'sidebar-offcanvas' : ''}
        style={{
          width: isMobile ? '275px' : (sidebarOpen ? '270px' : '0px'),
          minHeight: '100vh',
          background: 'var(--bg-sidebar, #0f172a)',
          backdropFilter: 'blur(20px)',
          borderLeft: !isMobile && sidebarOpen ? '1px solid var(--border-subtle)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s ease',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          bottom: isMobile ? 0 : undefined,
          [direction === 'rtl' ? 'right' : 'left']: isMobile ? (sidebarOpen ? 0 : '-290px') : undefined,
          zIndex: isMobile ? 95 : 40,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: isMobile && sidebarOpen ? '0 0 35px rgba(0,0,0,0.6)' : 'var(--shadow-md)',
        }}
      >
        {/* Top Contracting Brand Hazard Accent Strip */}
        <div className="hazard-stripe" style={{ height: '3px', flexShrink: 0 }} />

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
            background: 'var(--bg-surface-elevated, rgba(30, 41, 59, 0.3))',
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
                border: '1px solid rgba(245, 163, 0, 0.4)',
              }}
            >
              ERP
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, whiteSpace: 'nowrap', margin: 0, color: 'var(--text-heading, #ffffff)' }}>
                {t('header.system_edition') || t('auto.منظومة_المقاولات_69af60')}
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--brand-accent, #f59e0b)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {t('header.saudi_edition') || 'Saudi Edition 🇸🇦'}
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
                  background: hasActiveChild ? 'var(--bg-surface-elevated, rgba(37, 99, 235, 0.08))' : 'transparent',
                  border: hasActiveChild ? '1px solid var(--border-glow, rgba(59, 130, 246, 0.25))' : '1px solid transparent',
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
                    padding: '0.6rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: hasActiveChild ? 'var(--brand-primary, #2563eb)' : 'var(--text-main, #0e2a47)',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    transition: 'all var(--transition-fast)',
                    textAlign: direction === 'rtl' ? 'right' : 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ color: group.color, display: 'flex', alignItems: 'center' }}>
                      {group.icon}
                    </span>
                    <span>{t('nav.groups.' + group.id) || group.defaultTitle}</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        background: hasActiveChild ? 'rgba(37, 99, 235, 0.2)' : 'var(--bg-input, rgba(0, 0, 0, 0.05))',
                        color: hasActiveChild ? 'var(--brand-primary, #2563eb)' : 'var(--text-dim)',
                        fontWeight: 700,
                        border: '1px solid var(--border-subtle)',
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
                      gap: '0.25rem',
                      padding: '0.25rem 0.4rem 0.45rem 0.4rem',
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
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          color: isActive ? '#ffffff' : 'var(--text-main, #0e2a47)',
                          background: isActive
                            ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                            : 'transparent',
                          border: isActive ? '1px solid rgba(245, 163, 0, 0.4)' : '1px solid transparent',
                          fontWeight: isActive ? 700 : 600,
                          fontSize: '0.82rem',
                          textDecoration: 'none',
                          transition: 'all var(--transition-fast)',
                          whiteSpace: 'nowrap',
                          boxShadow: isActive ? '0 3px 10px rgba(37, 99, 235, 0.35)' : 'none',
                        })}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                          <span style={{ opacity: 0.9 }}>{link.icon}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t('nav.links.' + link.key) || link.defaultLabel}
                          </span>
                        </div>
                        {link.comingSoon && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(245, 163, 0, 0.2)',
                              color: 'var(--brand-accent, #f59e0b)',
                              fontWeight: 700,
                            }}
                          >
                            {t('auto.قريب_ا_7e6db8')}</span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Bottom Footer: Live Online & Currency Bar */}
        <div
          style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated, rgba(30, 41, 59, 0.4))',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>{t('header.currency_label') || t('auto.العملة_25278c')}:</span>
            <span style={{ fontWeight: 800, color: 'var(--brand-accent, #f59e0b)', fontFamily: 'monospace' }}>
              {t('header.currency_value') || 'SAR 🇸🇦'}
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              background: 'var(--status-success-bg, rgba(16, 185, 129, 0.15))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--status-success, #10b981)',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            <span
              className="animate-pulse-soft"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
            <span>{t('header.online_status') || t('auto.متصل_2f181f')}</span>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Top Header (64px) */}
        <header
          className="header-compact"
          style={{
            height: '64px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-header, rgba(11, 19, 41, 0.88))',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.25rem',
            zIndex: 45,
            flexShrink: 0,
          }}
        >
          {/* Left Controls & Company Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)' }}
              title={t('header.toggle_sidebar') || t('auto.تبديل_القائمة_الجانبية_797d27')}
              aria-label={t('header.toggle_sidebar')}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{t('header.company_label') || t('auto.الشركة_252a1e')}:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading, #ffffff)' }}>
                {t('header.company_name') || t('auto.شركة_البناء_المتقدمة_للتطوير_و_27a090')}
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
                  {t('header.field_scope')}:{' '}
                  {user.scopes.length === 1
                    ? user.scopes[0].projectName || user.scopes[0].projectCode || t('auto.مشروع_محدد_5b4a3c')
                    : `${user.scopes.length} مشاريع`}
                </span>
              </div>
            )}
          </div>

          {/* Right User Area & Notifications & Theme & Language */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
            {/* 3-Languages Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{
                padding: '0.45rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
              }}
              title={theme === 'dark' ? t('header.light_mode') : t('header.dark_mode')}
              aria-label={t('header.toggle_theme')}
            >
              {theme === 'dark' ? (
                <Sun size={18} color="#fbbf24" />
              ) : (
                <Moon size={18} color="#3b82f6" />
              )}
            </button>

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
                <div style={{ textAlign: direction === 'rtl' ? 'left' : 'right', display: 'flex', flexDirection: 'column', alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {user?.fullName || user?.username || t('header.user_default')}
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
                    [direction === 'rtl' ? 'left' : 'right']: 0,
                    width: '210px',
                    padding: '0.5rem',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 60,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.fullName || user?.username || t('header.user_default')}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {user?.id ? `${user.id.substring(0, 8)}...` : '—'}
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
                        textAlign: direction === 'rtl' ? 'right' : 'left',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <User size={15} color="#60a5fa" />
                      <span>{t('header.account_settings')}</span>
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
                      <span>{t('header.system_settings')}</span>
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
                        textAlign: direction === 'rtl' ? 'right' : 'left',
                      }}
                    >
                      <LogOut size={15} />
                      <span>{t('header.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Construction Hazard Accent Stripe */}
        <div className="hazard-stripe-subtle" style={{ flexShrink: 0 }} />

        {/* Scrollable Main Content */}
        <main
          onClick={() => userMenuOpen && setUserMenuOpen(false)}
          style={{
            flex: 1,
            padding: 'clamp(0.85rem, 2.5vw, 1.75rem)',
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

