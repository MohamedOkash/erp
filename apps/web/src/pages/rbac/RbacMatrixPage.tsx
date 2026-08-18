import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Search,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Lock,
  Layers,
  CalendarCheck,
  DollarSign,
  Users,
  ArrowLeftRight,
  FileSpreadsheet,
  FileText,
  BarChart3,
  BellRing,
  Settings,
  ShieldCheck,
  Sliders,
  Award,
} from 'lucide-react';
import { rolesApi, type Permission, type Role } from '../../api/roles.api';
import { useI18n } from '../../i18n/I18nContext';

// Module metadata & icons configuration


const CRITICAL_PERMISSIONS = [
  'roles.manage_permissions',
  'roles.view',
  'users.create',
  'users.update',
  'users.delete',
  'users.view',
];

export const RbacMatrixPage: React.FC = () => {
  const { t } = useI18n();

  const MODULE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  production: { label: t('auto.الإنتاجية_اليومية_5b6d3f'), icon: <Layers size={18} />, color: '#3b82f6' },
  attendance: { label: t('auto.الحضور_والانصراف_7d9ff8'), icon: <CalendarCheck size={18} />, color: '#10b981' },
  costs: { label: t('auto.التكاليف_والمصروفات_7c40d0'), icon: <DollarSign size={18} />, color: '#f59e0b' },
  boq: { label: t('auto.المقايسة_وتقدم_التنفيذ_BOQ_3c43b8'), icon: <FileSpreadsheet size={18} />, color: '#8b5cf6' },
  employees: { label: t('auto.الموظفون_والعمال_478cd7'), icon: <Users size={18} />, color: '#ec4899' },
  transfers: { label: t('auto.نقل_الكوادر_والمشرفين_1cbe4e'), icon: <ArrowLeftRight size={18} />, color: '#06b6d4' },
  documents: { label: t('auto.المستندات_والأرشيف_7b3887'), icon: <FileText size={18} />, color: '#14b8a6' },
  reports: { label: t('auto.التقارير_والمؤشرات_79d4c8'), icon: <BarChart3 size={18} />, color: '#6366f1' },
  alerts: { label: t('auto.التنبيهات_الميدانية_60e589'), icon: <BellRing size={18} />, color: '#f43f5e' },
  incentives: { label: t('auto.الحوافز_والمكافآت_52fa80'), icon: <Award size={18} />, color: '#d946ef' },
  users: { label: t('auto.إدارة_المستخدمين_والحسابات_717598'), icon: <Users size={18} />, color: '#eab308' },
  roles: { label: t('auto.مصفوفة_الصلاحيات_RBAC_24b3d1'), icon: <Shield size={18} />, color: '#a855f7' },
  settings: { label: t('auto.إعدادات_النظام_والمنشأة_389e13'), icon: <Settings size={18} />, color: '#64748b' },
};

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // roleId -> Set of permissionIds
  const [matrixState, setMatrixState] = useState<Record<string, Set<string>>>({});
  const [initialMatrixState, setInitialMatrixState] = useState<Record<string, Set<string>>>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Accordion State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Fetch initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [fetchedPermissions, fetchedRoles] = await Promise.all([
        rolesApi.listPermissions(),
        rolesApi.listRoles(),
      ]);

      setPermissions(fetchedPermissions);
      setRoles(fetchedRoles);

      if (fetchedRoles.length > 0) {
        setSelectedRoleId(fetchedRoles[0].id);
      }

      // Fetch permissions for all roles
      const rolePermsEntries = await Promise.all(
        fetchedRoles.map(async (role) => {
          try {
            const res = await rolesApi.getRolePermissions(role.id);
            return [role.id, new Set(res.permissionIds)] as const;
          } catch {
            return [role.id, new Set<string>()] as const;
          }
        }),
      );

      const stateMap: Record<string, Set<string>> = {};
      const initialMap: Record<string, Set<string>> = {};
      for (const [rId, pSet] of rolePermsEntries) {
        stateMap[rId] = new Set(pSet);
        initialMap[rId] = new Set(pSet);
      }

      setMatrixState(stateMap);
      setInitialMatrixState(initialMap);
    } catch (err: any) {
      setErrorMessage(err?.message || t('auto.فشل_تحميل_بيانات_مصفوفة_الصلاح_17e340'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  const currentRolePerms = useMemo(() => {
    if (!selectedRole) return new Set<string>();
    return matrixState[selectedRole.id] || new Set<string>();
  }, [matrixState, selectedRole]);

  const initialRolePerms = useMemo(() => {
    if (!selectedRole) return new Set<string>();
    return initialMatrixState[selectedRole.id] || new Set<string>();
  }, [initialMatrixState, selectedRole]);

  // Check if current role has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRole) return false;
    if (currentRolePerms.size !== initialRolePerms.size) return true;
    for (const pId of currentRolePerms) {
      if (!initialRolePerms.has(pId)) return true;
    }
    return false;
  }, [selectedRole, currentRolePerms, initialRolePerms]);

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = permissions.filter((p) => {
      if (!term) return true;
      return (
        p.code.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        p.module.toLowerCase().includes(term) ||
        p.action.toLowerCase().includes(term)
      );
    });

    const groups: Record<string, Permission[]> = {};
    for (const p of filtered) {
      const m = p.module || 'other';
      if (!groups[m]) groups[m] = [];
      groups[m].push(p);
    }
    return groups;
  }, [permissions, searchTerm]);

  // Toggle single permission for current role
  const handleTogglePermission = (permissionId: string) => {
    if (!selectedRole) return;
    setMatrixState((prev) => {
      const currentSet = new Set(prev[selectedRole.id] || []);
      if (currentSet.has(permissionId)) {
        currentSet.delete(permissionId);
      } else {
        currentSet.add(permissionId);
      }
      return {
        ...prev,
        [selectedRole.id]: currentSet,
      };
    });
  };

  // Toggle all permissions within a module
  const handleToggleModule = (moduleName: string) => {
    if (!selectedRole) return;
    const modulePerms = permissions.filter((p) => (p.module || 'other') === moduleName);
    const allModuleIds = modulePerms.map((p) => p.id);
    const currentSet = new Set(currentRolePerms);

    const isAllGranted = allModuleIds.every((id) => currentSet.has(id));

    if (isAllGranted) {
      // Uncheck all in module
      allModuleIds.forEach((id) => currentSet.delete(id));
    } else {
      // Check all in module
      allModuleIds.forEach((id) => currentSet.add(id));
    }

    setMatrixState((prev) => ({
      ...prev,
      [selectedRole.id]: currentSet,
    }));
  };

  // Toggle all permissions for selected role
  const handleGrantAll = () => {
    if (!selectedRole) return;
    const allIds = new Set(permissions.map((p) => p.id));
    setMatrixState((prev) => ({
      ...prev,
      [selectedRole.id]: allIds,
    }));
  };

  const handleRevokeAll = () => {
    if (!selectedRole) return;
    setMatrixState((prev) => ({
      ...prev,
      [selectedRole.id]: new Set<string>(),
    }));
  };

  const handleResetRole = () => {
    if (!selectedRole) return;
    setMatrixState((prev) => ({
      ...prev,
      [selectedRole.id]: new Set(initialRolePerms),
    }));
  };

  // Save changes for selected role
  const handleSave = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);
    try {
      const permissionIds = Array.from(currentRolePerms);
      await rolesApi.updateRolePermissions(selectedRole.id, permissionIds);

      // Update initial state
      setInitialMatrixState((prev) => ({
        ...prev,
        [selectedRole.id]: new Set(permissionIds),
      }));

      setSaveSuccessMsg(`تم حفظ وتحديث صلاحيات دور "${selectedRole.name}" بنجاح.`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || t('auto.فشل_حفظ_الصلاحيات_61e6a5'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModuleCollapse = (moduleName: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin" color="#3b82f6" />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t('auto.جاري_تحميل_مصفوفة_الصلاحيات_وا_ca70ff')}</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2.5rem' }}>
      {/* Top Page Header */}
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={26} color="#a855f7" />
            <span>{t('system.rbac_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            {t('nav.links.rbac')}
          </p>
        </div>

        {/* Global Summary Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(15, 23, 42, 0.7)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Users size={16} color="#60a5fa" />
            <span style={{ color: 'var(--text-muted)' }}>{t('auto.إجمالي_الأدوار_1626db')}</span>
            <strong style={{ color: '#fff' }}>{roles.length}</strong>
          </div>
          <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Sliders size={16} color="#34d399" />
            <span style={{ color: 'var(--text-muted)' }}>{t('auto.إجمالي_الصلاحيات_3a6109')}</span>
            <strong style={{ color: '#fff' }}>{permissions.length}</strong>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {saveSuccessMsg && (
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
            gap: '0.6rem',
            marginBottom: '1.25rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
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
            gap: '0.6rem',
            marginBottom: '1.25rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main 2-Column Vertical Layout (Zero Horizontal Scroll) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) minmax(0, 1fr)',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* RIGHT COLUMN: Roles Sidebar Cards List */}
        <div
          className="glass-card"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            position: 'sticky',
            top: '80px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={16} color="#60a5fa" />
              <span>{t('auto.الأدوار_الوظيفية_Roles_1083da')}</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{roles.length} {t('auto.أدوار_59622d')}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }} className="sidebar-scroll">
            {roles.map((role) => {
              const isSelected = selectedRole?.id === role.id;
              const rolePermCount = (matrixState[role.id] || new Set()).size;
              const pct = permissions.length > 0 ? Math.round((rolePermCount / permissions.length) * 100) : 0;
              const roleHasModifications = (() => {
                const cur = matrixState[role.id] || new Set();
                const init = initialMatrixState[role.id] || new Set();
                if (cur.size !== init.size) return true;
                for (const x of cur) if (!init.has(x)) return true;
                return false;
              })();

              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.22) 0%, rgba(37, 99, 235, 0.1) 100%)'
                      : 'rgba(15, 23, 42, 0.5)',
                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid var(--border-subtle)',
                    boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: isSelected ? 800 : 700, fontSize: '0.9rem', color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.85)' }}>
                      {role.name}
                    </span>
                    {roleHasModifications && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          fontWeight: 700,
                        }}
                      >
                        {t('auto.غير_محفوظ_687062')}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontFamily: 'monospace', color: '#93c5fd', fontSize: '0.7rem' }}>
                      {role.code}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {rolePermCount} / {permissions.length} ({pct}%)
                    </span>
                  </div>

                  {/* Mini Progress Bar */}
                  <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: isSelected ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : '#64748b',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LEFT / CENTER MAIN PANEL: Role Permissions Editor */}
        {selectedRole ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Active Role Control Header Bar */}
            <div
              className="glass-card"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60a5fa',
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                      {selectedRole.name}
                    </h2>
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', fontFamily: 'monospace' }}>
                      {selectedRole.code}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedRole.description || t('auto.تحديد_الصلاحيات_الممنوحة_لهذا__202e8d')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleGrantAll}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                >
                  {t('auto.تفعيل_الكل_256d2c')}</button>
                <button
                  type="button"
                  onClick={handleRevokeAll}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                >
                  {t('auto.إلغاء_الكل_3d61a0')}</button>
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={handleResetRole}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', color: '#fbbf24' }}
                    title={t('auto.إلغاء_التغييرات_واستعادة_الوضع_1d78df')}
                  >
                    <RotateCcw size={14} />
                    <span>{t('auto.تراجع_59c53f')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.55rem 1.4rem',
                    fontWeight: 700,
                    boxShadow: hasUnsavedChanges ? '0 0 16px rgba(59, 130, 246, 0.4)' : 'none',
                  }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{hasUnsavedChanges ? t('auto.حفظ_التعديلات_4ff313') : t('auto.تم_الحفظ_765122')}</span>
                </button>
              </div>
            </div>

            {/* Permissions Search Bar */}
            <div className="search-input-wrapper">
              <input
                type="text"
                className="input-field"
                placeholder={t('auto.ابحث_في_أسماء_الصلاحيات_أو_الر_606a9a')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
              />
              <Search className="search-icon" size={18} />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', left: '0.85rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {t('auto.مسح_184f5f')}</button>
              )}
            </div>

            {/* Modules Accordion Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.keys(groupedPermissions).length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Search size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>{t('auto.لا_توجد_صلاحيات_مطابقة_لكلمة_ا_6065cd')}{searchTerm}".</p>
                </div>
              ) : (
                Object.entries(groupedPermissions).map(([moduleKey, modulePerms]) => {
                  const conf = MODULE_CONFIG[moduleKey] || {
                    label: moduleKey,
                    icon: <Layers size={18} />,
                    color: '#94a3b8',
                  };
                  const isCollapsed = !!collapsedModules[moduleKey];

                  const grantedCount = modulePerms.filter((p) => currentRolePerms.has(p.id)).length;
                  const isAllGranted = grantedCount === modulePerms.length && modulePerms.length > 0;
                  const isPartiallyGranted = grantedCount > 0 && !isAllGranted;

                  return (
                    <div
                      key={moduleKey}
                      className="glass-card"
                      style={{
                        overflow: 'hidden',
                        border: isAllGranted ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Module Header */}
                      <div
                        style={{
                          padding: '1rem 1.25rem',
                          background: 'rgba(15, 23, 42, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleModuleCollapse(moduleKey)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ color: conf.color, display: 'flex', alignItems: 'center' }}>
                            {conf.icon}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                            {conf.label}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: isAllGranted
                                ? 'rgba(16, 185, 129, 0.2)'
                                : isPartiallyGranted
                                ? 'rgba(59, 130, 246, 0.2)'
                                : 'rgba(255, 255, 255, 0.05)',
                              color: isAllGranted ? '#34d399' : isPartiallyGranted ? '#60a5fa' : 'var(--text-muted)',
                              fontWeight: 700,
                            }}
                          >
                            {grantedCount} / {modulePerms.length}
                          </span>
                        </div>

                        {/* Right Toggle Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleModule(moduleKey)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: 'var(--radius-sm)',
                              background: isAllGranted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              border: isAllGranted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                              color: isAllGranted ? '#f87171' : '#93c5fd',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isAllGranted ? t('auto.إلغاء_الكل_3d61a0') : t('auto.تفعيل_الكل_256d2c')}
                          </button>

                          <div
                            onClick={() => toggleModuleCollapse(moduleKey)}
                            style={{
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                            }}
                          >
                            <ChevronDown
                              size={18}
                              style={{
                                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Module Permissions List */}
                      {!isCollapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {modulePerms.map((perm, idx) => {
                            const isGranted = currentRolePerms.has(perm.id);
                            const isCritical = CRITICAL_PERMISSIONS.includes(perm.code);

                            return (
                              <div
                                key={perm.id}
                                onClick={() => handleTogglePermission(perm.id)}
                                style={{
                                  padding: '0.85rem 1.25rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderBottom: idx === modulePerms.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                                  background: isGranted ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, paddingLeft: '1rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: isGranted ? 700 : 500, fontSize: '0.88rem', color: isGranted ? '#fff' : 'rgba(255, 255, 255, 0.75)' }}>
                                      {perm.description || perm.name || perm.code}
                                    </span>
                                    {isCritical && (
                                      <span
                                        style={{
                                          fontSize: '0.65rem',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          background: 'rgba(239, 68, 68, 0.15)',
                                          border: '1px solid rgba(239, 68, 68, 0.3)',
                                          color: '#fca5a5',
                                          fontWeight: 700,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                        }}
                                      >
                                        <Lock size={10} />
                                        <span>{t('auto.حساس_2e6b91')}</span>
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                    {perm.code}
                                  </span>
                                </div>

                                {/* Toggle Switch */}
                                <div style={{ flexShrink: 0 }}>
                                  <div
                                    style={{
                                      width: '42px',
                                      height: '24px',
                                      borderRadius: '12px',
                                      background: isGranted ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'rgba(255, 255, 255, 0.12)',
                                      position: 'relative',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      boxShadow: isGranted ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: '#ffffff',
                                        position: 'absolute',
                                        top: '3px',
                                        left: isGranted ? '21px' : '3px',
                                        transition: 'left 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
