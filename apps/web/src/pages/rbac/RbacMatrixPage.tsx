import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  Save,
  RotateCcw,
  AlertTriangle,
  Lock,
  Layers,
  Users,
  Check,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { rolesApi, type Permission, type Role } from '../../api/roles.api';

// Module translations and icons
const MODULE_CONFIG: Record<string, { label: string; color: string }> = {
  production: { label: 'الإنتاجية اليومية', color: 'var(--accent-primary, #3b82f6)' },
  attendance: { label: 'الحضور والانصراف', color: '#10b981' },
  costs: { label: 'التكاليف والمصروفات', color: '#f59e0b' },
  boq: { label: 'المقايسة والبنود (BOQ)', color: '#8b5cf6' },
  employees: { label: 'الموظفون والعمال', color: '#ec4899' },
  transfers: { label: 'نقل الكوادر والمشرفين', color: '#06b6d4' },
  documents: { label: 'المستندات والأرشيف', color: '#14b8a6' },
  reports: { label: 'التقارير والمؤشرات', color: '#6366f1' },
  alerts: { label: 'التنبيهات الميدانية', color: '#f43f5e' },
  users: { label: 'إدارة الحسابات', color: '#eab308' },
  roles: { label: 'مصفوفة الصلاحيات', color: '#a855f7' },
  settings: { label: 'إعدادات النظام', color: '#64748b' },
};

const CRITICAL_PERMISSIONS = [
  'roles.manage_permissions',
  'roles.view',
  'users.create',
  'users.update',
  'users.delete',
  'users.view',
];

export const RbacMatrixPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  // roleId -> Set of permissionIds
  const [matrixState, setMatrixState] = useState<Record<string, Set<string>>>({});
  const [initialMatrixState, setInitialMatrixState] = useState<Record<string, Set<string>>>({});
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Critical warning modal state
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    roleId: string;
    roleName: string;
    permissionCode: string;
  } | null>(null);

  // Fetch initial data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [fetchedPermissions, fetchedRoles] = await Promise.all([
        rolesApi.listPermissions(),
        rolesApi.listRoles(),
      ]);

      setPermissions(fetchedPermissions);
      setRoles(fetchedRoles);

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
      setErrorMessage(err?.message || 'فشل تحميل بيانات مصفوفة الصلاحيات والأدوار');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Distinct modules
  const modulesList = useMemo(() => {
    const mods = new Set<string>();
    permissions.forEach((p) => {
      if (p.module) mods.add(p.module);
    });
    return Array.from(mods);
  }, [permissions]);

  // Filtered permissions grouped by module
  const groupedPermissions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = permissions.filter((p) => {
      const matchModule = selectedModule === 'all' || p.module === selectedModule;
      const matchSearch =
        !term ||
        p.code.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        p.module.toLowerCase().includes(term) ||
        p.action.toLowerCase().includes(term);
      return matchModule && matchSearch;
    });

    const groups: Record<string, Permission[]> = {};
    for (const p of filtered) {
      const m = p.module || 'other';
      if (!groups[m]) groups[m] = [];
      groups[m].push(p);
    }
    return groups;
  }, [permissions, searchTerm, selectedModule]);

  // Detect unsaved changes per role
  const modifiedRoleIds = useMemo(() => {
    const modified = new Set<string>();
    for (const role of roles) {
      const current = matrixState[role.id] || new Set();
      const initial = initialMatrixState[role.id] || new Set();
      if (current.size !== initial.size) {
        modified.add(role.id);
        continue;
      }
      for (const id of current) {
        if (!initial.has(id)) {
          modified.add(role.id);
          break;
        }
      }
    }
    return modified;
  }, [roles, matrixState, initialMatrixState]);

  // Toggle permission for a role
  const handleToggle = (role: Role, perm: Permission) => {
    const isCurrentlyChecked = !!matrixState[role.id]?.has(perm.id);

    // If attempting to revoke critical permission from admin/company_admin, prompt warning
    if (
      isCurrentlyChecked &&
      ['admin', 'company_admin', 'super_admin'].includes(role.code) &&
      CRITICAL_PERMISSIONS.includes(perm.code)
    ) {
      setWarningModal({
        isOpen: true,
        roleId: role.id,
        roleName: role.name,
        permissionCode: perm.code,
      });
      return;
    }

    setMatrixState((prev) => {
      const roleSet = new Set(prev[role.id] || []);
      if (isCurrentlyChecked) {
        roleSet.delete(perm.id);
      } else {
        roleSet.add(perm.id);
      }
      return { ...prev, [role.id]: roleSet };
    });
  };

  // Confirm critical revoke
  const confirmCriticalRevoke = () => {
    if (!warningModal) return;
    const { roleId, permissionCode } = warningModal;
    const perm = permissions.find((p) => p.code === permissionCode);
    if (perm) {
      setMatrixState((prev) => {
        const roleSet = new Set(prev[roleId] || []);
        roleSet.delete(perm.id);
        return { ...prev, [roleId]: roleSet };
      });
    }
    setWarningModal(null);
  };

  // Select all permissions for a role
  const handleSelectAllForRole = (roleId: string, select: boolean) => {
    setMatrixState((prev) => {
      const roleSet = new Set(prev[roleId] || []);
      if (select) {
        permissions.forEach((p) => roleSet.add(p.id));
      } else {
        // Keep critical if admin
        const role = roles.find((r) => r.id === roleId);
        if (role && ['admin', 'company_admin'].includes(role.code)) {
          const criticalIds = permissions
            .filter((p) => CRITICAL_PERMISSIONS.includes(p.code))
            .map((p) => p.id);
          roleSet.clear();
          criticalIds.forEach((id) => roleSet.add(id));
        } else {
          roleSet.clear();
        }
      }
      return { ...prev, [roleId]: roleSet };
    });
  };

  // Save single role changes
  const handleSaveRole = async (roleId: string) => {
    setSavingRoleId(roleId);
    setErrorMessage(null);
    setSaveSuccessMsg(null);
    try {
      const permIds = Array.from(matrixState[roleId] || []);
      await rolesApi.updateRolePermissions(roleId, permIds);

      setInitialMatrixState((prev) => ({
        ...prev,
        [roleId]: new Set(permIds),
      }));

      const roleObj = roles.find((r) => r.id === roleId);
      setSaveSuccessMsg(`تم حفظ وتحديث صلاحيات دور "${roleObj?.name || roleId}" بنجاح.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setSavingRoleId(null);
    }
  };

  // Save all modified roles
  const handleSaveAll = async () => {
    if (modifiedRoleIds.size === 0) return;
    setIsSavingAll(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);
    try {
      for (const roleId of Array.from(modifiedRoleIds)) {
        const permIds = Array.from(matrixState[roleId] || []);
        await rolesApi.updateRolePermissions(roleId, permIds);
      }

      const clonedInitial: Record<string, Set<string>> = {};
      for (const [k, v] of Object.entries(matrixState)) {
        clonedInitial[k] = new Set(v);
      }
      setInitialMatrixState(clonedInitial);

      setSaveSuccessMsg(`تم حفظ مصفوفة الصلاحيات لجميع الأدوار المعدلة (${modifiedRoleIds.size}) بنجاح.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ التغييرات لجميع الأدوار');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Reset to initial
  const handleReset = () => {
    const cloned: Record<string, Set<string>> = {};
    for (const [k, v] of Object.entries(initialMatrixState)) {
      cloned[k] = new Set(v);
    }
    setMatrixState(cloned);
    setSaveSuccessMsg('تم التراجع عن التعديلات غير المحفوظة بنجاح.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const toggleCollapseModule = (moduleName: string) => {
    setCollapsedModules((prev) => ({ ...prev, [moduleName]: !prev[moduleName] }));
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', color: 'var(--text-main)' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.2) 100%)',
                border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Shield size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                مصفوفة الصلاحيات والأدوار (RBAC Matrix)
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                التحكم المباشر في منح وحجب الصلاحيات لجميع أدوار النظام مع حفظ فوري وعزل محكم
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {modifiedRoleIds.size > 0 && (
            <button
              onClick={handleReset}
              disabled={isSavingAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              <RotateCcw size={16} />
              إلغاء التعديلات
            </button>
          )}

          <button
            onClick={handleSaveAll}
            disabled={modifiedRoleIds.size === 0 || isSavingAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '10px',
              background:
                modifiedRoleIds.size > 0
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
              border: modifiedRoleIds.size > 0 ? '1px solid #60a5fa' : '1px solid transparent',
              color: modifiedRoleIds.size > 0 ? '#ffffff' : 'var(--text-muted)',
              cursor: modifiedRoleIds.size > 0 && !isSavingAll ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow:
                modifiedRoleIds.size > 0
                  ? '0 4px 14px rgba(37, 99, 235, 0.35)'
                  : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Save size={16} />
            {isSavingAll
              ? 'جاري الحفظ...'
              : modifiedRoleIds.size > 0
              ? `حفظ التغييرات (${modifiedRoleIds.size} دور)`
              : 'لا توجد تعديلات معلقة'}
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {saveSuccessMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 600,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <Check size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>إجمالي الأدوار الوظيفية</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
              {roles.length}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>إجمالي صلاحيات النظام</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
              {permissions.length}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>الأقسام والموديولات</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
              {modulesList.length}
            </div>
          </div>
        </div>

        <div
          style={{
            background:
              modifiedRoleIds.size > 0
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(255, 255, 255, 0.03)',
            border:
              modifiedRoleIds.size > 0
                ? '1px solid rgba(245, 158, 11, 0.3)'
                : '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background:
                modifiedRoleIds.size > 0
                  ? 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: modifiedRoleIds.size > 0 ? '#fbbf24' : 'var(--text-muted)',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>أدوار بها تعديلات معلقة</div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: modifiedRoleIds.size > 0 ? '#fbbf24' : 'var(--text-main)',
              }}
            >
              {modifiedRoleIds.size}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بكود الصلاحية، الوصف، أو القسم..."
            style={{
              width: '100%',
              padding: '10px 42px 10px 14px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Module Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setSelectedModule('all')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: selectedModule === 'all' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: selectedModule === 'all' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
              color: selectedModule === 'all' ? '#60a5fa' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            كافة الأقسام ({permissions.length})
          </button>
          {modulesList.map((mod) => {
            const config = MODULE_CONFIG[mod] || { label: mod, color: '#94a3b8' };
            const count = permissions.filter((p) => p.module === mod).length;
            const isSelected = selectedModule === mod;
            return (
              <button
                key={mod}
                onClick={() => setSelectedModule(mod)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isSelected ? `${config.color}22` : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected ? `1px solid ${config.color}` : '1px solid var(--border-subtle)',
                  color: isSelected ? config.color : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Matrix Table */}
      {isLoading ? (
        <div
          style={{
            padding: '80px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '3px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px',
            }}
          />
          <div style={{ fontSize: '16px', fontWeight: 600 }}>جاري تحميل مصفوفة الصلاحيات والأدوار...</div>
        </div>
      ) : Object.keys(groupedPermissions).length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Info size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', margin: '0 0 6px' }}>لا توجد صلاحيات مطابقة لخيارات البحث</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            جرب تغيير معايير البحث أو اختيار قسم آخر.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ overflowX: 'auto', maxHeight: '75vh', position: 'relative' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '13px',
              }}
            >
              {/* Table Header: Roles */}
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  background: 'rgba(17, 29, 56, 0.98)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                }}
              >
                <tr>
                  {/* Sticky First Column */}
                  <th
                    style={{
                      position: 'sticky',
                      right: 0,
                      zIndex: 30,
                      background: 'rgba(17, 29, 56, 0.98)',
                      padding: '18px 20px',
                      textAlign: 'right',
                      minWidth: '320px',
                      borderBottom: '2px solid var(--border-subtle)',
                      borderLeft: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>
                      الصلاحية / الوصف الوظيفي
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      مجمعة حسب الأقسام التشغيلية
                    </div>
                  </th>

                  {/* Role Columns */}
                  {roles.map((role) => {
                    const assignedCount = matrixState[role.id]?.size || 0;
                    const isModified = modifiedRoleIds.has(role.id);
                    const isSavingThis = savingRoleId === role.id;

                    return (
                      <th
                        key={role.id}
                        style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                          minWidth: '150px',
                          borderBottom: '2px solid var(--border-subtle)',
                          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                          background: isModified
                            ? 'rgba(245, 158, 11, 0.06)'
                            : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                              {role.name}
                            </span>
                            {isModified && (
                              <span
                                title="تعديلات غير محفوظة"
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#f59e0b',
                                  boxShadow: '0 0 8px #f59e0b',
                                }}
                              />
                            )}
                          </div>

                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {role.code}
                          </span>

                          {/* Quick Stats & Controls */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              marginTop: '4px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background:
                                  assignedCount > 0
                                    ? 'rgba(59, 130, 246, 0.15)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                color: assignedCount > 0 ? '#60a5fa' : 'var(--text-muted)',
                              }}
                            >
                              {assignedCount} / {permissions.length}
                            </span>
                          </div>

                          {/* Quick Toggle Column Buttons */}
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleSelectAllForRole(role.id, true)}
                              title="تحديد الكل لهذا الدور"
                              style={{
                                padding: '3px 6px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#93c5fd',
                                cursor: 'pointer',
                              }}
                            >
                              الكل
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectAllForRole(role.id, false)}
                              title="إلغاء تحديد الكل لهذا الدور"
                              style={{
                                padding: '3px 6px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#fca5a5',
                                cursor: 'pointer',
                              }}
                            >
                              تفريغ
                            </button>
                            {isModified && (
                              <button
                                type="button"
                                onClick={() => handleSaveRole(role.id)}
                                disabled={isSavingThis}
                                title="حفظ تعديلات هذا الدور فقط"
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  background: '#2563eb',
                                  border: 'none',
                                  color: '#fff',
                                  cursor: isSavingThis ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isSavingThis ? '...' : 'حفظ'}
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body: Grouped Permissions */}
              <tbody>
                {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                  const config = MODULE_CONFIG[moduleName] || {
                    label: moduleName,
                    color: '#94a3b8',
                  };
                  const isCollapsed = !!collapsedModules[moduleName];

                  return (
                    <React.Fragment key={moduleName}>
                      {/* Module Header Bar */}
                      <tr
                        style={{
                          background: 'rgba(30, 41, 59, 0.85)',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <td
                          colSpan={roles.length + 1}
                          style={{
                            padding: '12px 20px',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleCollapseModule(moduleName)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: config.color,
                                  display: 'inline-block',
                                }}
                              />
                              <span style={{ fontWeight: 800, fontSize: '14px', color: config.color }}>
                                {config.label}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                }}
                              >
                                {perms.length} صلاحية
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {isCollapsed ? 'عرض التفاصيل' : 'طي القسم'}
                              </span>
                              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Module Permissions Rows */}
                      {!isCollapsed &&
                        perms.map((perm, idx) => {
                          const isCritical = CRITICAL_PERMISSIONS.includes(perm.code);

                          return (
                            <tr
                              key={perm.id}
                              style={{
                                background:
                                  idx % 2 === 0
                                    ? 'rgba(255, 255, 255, 0.01)'
                                    : 'rgba(255, 255, 255, 0.025)',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  idx % 2 === 0
                                    ? 'rgba(255, 255, 255, 0.01)'
                                    : 'rgba(255, 255, 255, 0.025)';
                              }}
                            >
                              {/* Sticky Permission Name & Code Column */}
                              <td
                                style={{
                                  position: 'sticky',
                                  right: 0,
                                  zIndex: 10,
                                  background: 'rgba(17, 24, 39, 0.96)',
                                  backdropFilter: 'blur(8px)',
                                  padding: '12px 20px',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                  borderLeft: '1px solid var(--border-subtle)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                  <div style={{ marginTop: '2px' }}>
                                    {isCritical ? (
                                      <span title="صلاحية أمنية حساسة">
                                        <Lock size={15} style={{ color: '#f59e0b' }} />
                                      </span>
                                    ) : (
                                      <Shield
                                        size={15}
                                        style={{ color: config.color, opacity: 0.7 }}
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                                      {perm.name || perm.description || perm.code}
                                    </div>
                                    <div
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                        color: isCritical ? '#fbbf24' : 'var(--text-muted)',
                                        marginTop: '2px',
                                      }}
                                    >
                                      {perm.code}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Matrix Checkbox Cells */}
                              {roles.map((role) => {
                                const isChecked = !!matrixState[role.id]?.has(perm.id);
                                const isModifiedRole = modifiedRoleIds.has(role.id);

                                return (
                                  <td
                                    key={`${role.id}-${perm.id}`}
                                    onClick={() => handleToggle(role, perm)}
                                    style={{
                                      padding: '10px',
                                      textAlign: 'center',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                      borderLeft: '1px solid rgba(255, 255, 255, 0.03)',
                                      background: isChecked
                                        ? isModifiedRole
                                          ? 'rgba(245, 158, 11, 0.05)'
                                          : 'rgba(59, 130, 246, 0.03)'
                                        : 'transparent',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '6px',
                                        background: isChecked
                                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                          : 'rgba(255, 255, 255, 0.05)',
                                        border: isChecked
                                          ? '1px solid #60a5fa'
                                          : '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#ffffff',
                                        boxShadow: isChecked
                                          ? '0 2px 8px rgba(37, 99, 235, 0.35)'
                                          : 'none',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                      }}
                                    >
                                      {isChecked ? (
                                        <Check size={14} strokeWidth={3} />
                                      ) : null}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Critical Permission Revoke Warning Modal */}
      {warningModal?.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              animation: 'modalSlideIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <AlertTriangle size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fbbf24' }}>
                  تحذير: صلاحية إدارية حرجة
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  أنت على وشك حجب صلاحية جوهرية من دور مدير
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '10px',
                padding: '14px 16px',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#fef3c7',
                marginBottom: '20px',
              }}
            >
              حجب الصلاحية <code style={{ color: '#60a5fa', fontWeight: 'bold' }}>{warningModal.permissionCode}</code> من دور{' '}
              <strong style={{ color: '#fff' }}>{warningModal.roleName}</strong> قد يؤدي إلى منع مديري النظام من إدارة الحسابات أو الوصول للإعدادات الحساسة. هل أنت متأكد من المتابعة؟
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setWarningModal(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmCriticalRevoke}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                نعم، احجب الصلاحية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RbacMatrixPage;
