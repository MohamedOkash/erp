import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Shield,
  FolderKanban,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  UserCheck,
  X,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { usersApi, type UserAccount, type CreateUserDto, type UpdateUserDto, type UserOverridesResponse } from '../../api/users.api';
import { rolesApi, type Role, type Permission } from '../../api/roles.api';
import { employeesApi, type Employee } from '../../api/employees.api';
import { projectsApi, type Project } from '../../api/projects.api';
import { branchesApi, type Branch } from '../../api/branches.api';
import { useI18n } from '../../i18n/I18nContext';

export const UsersPage: React.FC = () => {
  const { t } = useI18n();
  // Data states
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  // UI / Filter states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Toast / Messages
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalUser, setEditModalUser] = useState<UserAccount | null>(null);
  const [overridesModalUser, setOverridesModalUser] = useState<UserAccount | null>(null);
  const [resetPassModalUser, setResetPassModalUser] = useState<UserAccount | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserAccount | null>(null);

  // Form states for Create/Edit
  const [formEmployeeId, setFormEmployeeId] = useState<string>('');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formFullName, setFormFullName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formRoleCodes, setFormRoleCodes] = useState<string[]>(['engineer']);
  const [formSelectedProjectIds, setFormSelectedProjectIds] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Overrides form state
  const [overridesData, setOverridesData] = useState<UserOverridesResponse | null>(null);
  const [currentOverridesMap, setCurrentOverridesMap] = useState<Record<string, 'grant' | 'deny' | 'none'>>({});
  const [loadingOverrides, setLoadingOverrides] = useState<boolean>(false);
  const [savingOverrides, setSavingOverrides] = useState<boolean>(false);

  // Reset Password form state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [resettingPassword, setResettingPassword] = useState<boolean>(false);

  // Show Toast helper
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Load reference data on mount
  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [rolesRes, empRes, projRes, branchRes, permRes] = await Promise.all([
          rolesApi.listRoles(),
          employeesApi.getEmployees({ limit: 500 }),
          projectsApi.getProjects({ limit: 200 }),
          branchesApi.getBranches({ limit: 100 }),
          rolesApi.listPermissions(),
        ]);
        setRoles(rolesRes);
        setEmployees(empRes.data || (Array.isArray(empRes) ? empRes : []));
        setProjects(projRes.data || (Array.isArray(projRes) ? projRes : []));
        setBranches(branchRes.data || (Array.isArray(branchRes) ? branchRes : []));
        setAllPermissions(permRes);
      } catch (err: any) {
        console.error('Failed to load references', err);
      }
    };
    loadReferences();
  }, []);

  // Fetch Users
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await usersApi.listUsers({
        page,
        limit,
        search: search.trim() || undefined,
        roleCode: filterRole !== 'all' ? filterRole : undefined,
        branchId: filterBranch !== 'all' ? filterBranch : undefined,
        projectId: filterProject !== 'all' ? filterProject : undefined,
        isActive: filterStatus === 'all' ? undefined : filterStatus === 'active',
      });
      setUsersList(res.data);
      setTotalCount(res.total);
    } catch (err: any) {
      setErrorMsg(err?.message || t('auto.فشل_تحميل_بيانات_المستخدمين_278cf6'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, filterRole, filterBranch, filterProject, filterStatus]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormEmployeeId('');
    setFormUsername('');
    setFormPassword('');
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormRoleCodes(['engineer']);
    setFormSelectedProjectIds([]);
    setFormIsActive(true);
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (userItem: UserAccount) => {
    setEditModalUser(userItem);
    setFormEmployeeId(userItem.employeeId || '');
    setFormUsername(userItem.username);
    setFormPassword('');
    setFormFullName(userItem.fullName);
    setFormEmail(userItem.email || '');
    setFormPhone(userItem.phone || '');
    setFormRoleCodes(userItem.roles.map((r) => r.roleCode));
    setFormSelectedProjectIds(userItem.scopes.map((s) => s.projectId));
    setFormIsActive(userItem.isActive);
  };

  // When Employee is selected in Form -> auto fill name, email, phone
  const handleEmployeeChange = (empId: string) => {
    setFormEmployeeId(empId);
    if (!empId) return;
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      if (!formFullName || formFullName === '') setFormFullName(emp.name);
      if (!formPhone || formPhone === '') setFormPhone(emp.phone || '');
      if (emp.roleType && roles.some((r) => r.code === emp.roleType)) {
        setFormRoleCodes([emp.roleType]);
      }
    }
  };

  // Check if chosen roles contain unrestricted company-wide role
  const isUnrestrictedFormRole = useMemo(() => {
    return formRoleCodes.some((code) =>
      ['company_admin', 'super_admin', 'program_manager', 'admin'].includes(code),
    );
  }, [formRoleCodes]);

  // Submit Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      setErrorMsg(t('auto.اسم_المستخدم_مطلوب_3933f4'));
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      setErrorMsg(t('auto.كلمة_المرور_يجب_أن_لا_تقل_عن_6_cfc7c4'));
      return;
    }
    if (!formFullName.trim()) {
      setErrorMsg(t('auto.الاسم_الكامل_مطلوب_1fb4fc'));
      return;
    }
    if (formRoleCodes.length === 0) {
      setErrorMsg(t('auto.يرجى_اختيار_دور_وظيفي_واحد_على_2e5061'));
      return;
    }
    if (!isUnrestrictedFormRole && formSelectedProjectIds.length === 0) {
      setErrorMsg(t('auto.يجب_تحديد_نطاق_مشروع_واحد_على__40ba53'));
      return;
    }

    setFormSubmitting(true);
    setErrorMsg(null);
    try {
      const scopes = isUnrestrictedFormRole
        ? []
        : formSelectedProjectIds.map((pId) => {
            const p = projects.find((proj) => proj.id === pId);
            return { projectId: pId, branchId: p?.branchId || undefined };
          });

      const payload: CreateUserDto = {
        employeeId: formEmployeeId || undefined,
        username: formUsername.trim(),
        password: formPassword,
        fullName: formFullName.trim(),
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        roleCodes: formRoleCodes,
        scopes,
        isActive: formIsActive,
      };

      await usersApi.createUser(payload);
      showToast(`تم إنشاء حساب المستخدم "${formUsername}" بنجاح.`);
      setCreateModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || t('auto.فشل_إنشاء_حساب_المستخدم_1a34ae'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Update User
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    if (!formFullName.trim()) {
      setErrorMsg(t('auto.الاسم_الكامل_مطلوب_1fb4fc'));
      return;
    }
    if (formRoleCodes.length === 0) {
      setErrorMsg(t('auto.يرجى_اختيار_دور_وظيفي_واحد_على_2e5061'));
      return;
    }
    if (!isUnrestrictedFormRole && formSelectedProjectIds.length === 0) {
      setErrorMsg(t('auto.يجب_تحديد_نطاق_مشروع_واحد_على__40ba53'));
      return;
    }

    setFormSubmitting(true);
    setErrorMsg(null);
    try {
      const scopes = isUnrestrictedFormRole
        ? []
        : formSelectedProjectIds.map((pId) => {
            const p = projects.find((proj) => proj.id === pId);
            return { projectId: pId, branchId: p?.branchId || undefined };
          });

      const payload: UpdateUserDto = {
        employeeId: formEmployeeId || undefined,
        fullName: formFullName.trim(),
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        roleCodes: formRoleCodes,
        scopes,
        isActive: formIsActive,
      };

      await usersApi.updateUser(editModalUser.id, payload);
      showToast(`تم تحديث بيانات المستخدم "${editModalUser.username}" بنجاح.`);
      setEditModalUser(null);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || t('auto.فشل_تحديث_بيانات_المستخدم_3104db'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (userItem: UserAccount) => {
    try {
      await usersApi.updateUser(userItem.id, { isActive: !userItem.isActive });
      showToast(
        userItem.isActive
          ? `تم تعطيل حساب "${userItem.username}" بنجاح.`
          : `تم تنشيط حساب "${userItem.username}" بنجاح.`,
      );
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || t('auto.فشل_تعديل_حالة_الحساب_8855e5'));
    }
  };

  // Delete / Deactivate User
  const handleDeleteSubmit = async () => {
    if (!deleteConfirmUser) return;
    try {
      await usersApi.deleteUser(deleteConfirmUser.id);
      showToast(`تم تعطيل وإلغاء جلسات المستخدم "${deleteConfirmUser.username}" بنجاح.`);
      setDeleteConfirmUser(null);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || t('auto.فشل_تعطيل_حساب_المستخدم_350e92'));
    }
  };

  // Open Overrides Modal
  const openOverridesModal = async (userItem: UserAccount) => {
    setOverridesModalUser(userItem);
    setLoadingOverrides(true);
    setErrorMsg(null);
    try {
      const res = await usersApi.getUserOverrides(userItem.id);
      setOverridesData(res);

      const map: Record<string, 'grant' | 'deny' | 'none'> = {};
      for (const ov of res.overrides) {
        map[ov.permissionCode] = ov.grantType;
      }
      setCurrentOverridesMap(map);
    } catch (err: any) {
      setErrorMsg(err?.message || t('auto.فشل_جلب_استثناءات_الصلاحيات_5e4ab6'));
    } finally {
      setLoadingOverrides(false);
    }
  };

  // Toggle override state for a permission
  const handleOverrideToggle = (permCode: string, grantType: 'grant' | 'deny') => {
    setCurrentOverridesMap((prev) => {
      const current = prev[permCode] || 'none';
      if (current === grantType) {
        // Toggle off back to none
        const next = { ...prev };
        delete next[permCode];
        return next;
      } else {
        return { ...prev, [permCode]: grantType };
      }
    });
  };

  // Save Overrides
  const handleSaveOverrides = async () => {
    if (!overridesModalUser) return;
    setSavingOverrides(true);
    setErrorMsg(null);
    try {
      const overridesArray: Array<{ permissionCode: string; grantType: 'grant' | 'deny' }> = [];
      for (const [code, type] of Object.entries(currentOverridesMap)) {
        if (type === 'grant' || type === 'deny') {
          overridesArray.push({ permissionCode: code, grantType: type });
        }
      }

      await usersApi.updateUserOverrides(overridesModalUser.id, { overrides: overridesArray });
      showToast(`تم تحديث استثناءات الصلاحيات للمستخدم "${overridesModalUser.username}" بنجاح.`);
      setOverridesModalUser(null);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || t('auto.فشل_حفظ_استثناءات_الصلاحيات_21e50b'));
    } finally {
      setSavingOverrides(false);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModalUser) return;
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg(t('auto.كلمة_المرور_الجديدة_يجب_أن_لا__37afaf'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t('auto.كلمتا_المرور_غير_متطابقتين_54c0c6'));
      return;
    }

    setResettingPassword(true);
    setErrorMsg(null);
    try {
      await usersApi.resetPassword(resetPassModalUser.id, newPassword);
      showToast(`تمت إعادة تعيين كلمة المرور للمستخدم "${resetPassModalUser.username}" بنجاح.`);
      setResetPassModalUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err?.message || t('auto.فشل_إعادة_تعيين_كلمة_المرور_6ee39f'));
    } finally {
      setResettingPassword(false);
    }
  };

  // Computed KPIs
  const kpis = useMemo(() => {
    const total = totalCount;
    const active = usersList.filter((u) => u.isActive).length;
    const scoped = usersList.filter((u) => u.scopes && u.scopes.length > 0).length;
    const admins = usersList.filter((u) =>
      u.roles.some((r) => ['company_admin', 'super_admin', 'admin'].includes(r.roleCode)),
    ).length;
    return { total, active, scoped, admins };
  }, [totalCount, usersList]);

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
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#facc15',
              }}
            >
              <Users size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                {t('system.users_title')}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('nav.links.users')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: '1px solid #60a5fa',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <UserPlus size={18} />
            {t('system.add_user')}
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {successToast && (
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
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {errorMsg && (
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
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ marginRight: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
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
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('auto.إجمالي_حسابات_المستخدمين_1b59eb')}</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{kpis.total}</div>
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
            <UserCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('auto.الحسابات_النشطة_5e2b7a')}</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{kpis.active}</div>
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
            <FolderKanban size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('auto.حسابات_بنطاق_مشاريع_محدد_61aa54')}</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{kpis.scoped}</div>
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
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('auto.مديرو_النظام_الشامل_41a60d')}</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{kpis.admins}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('auto.بحث_بالاسم_اسم_المستخدم_البريد_710b1a')}
            style={{
              width: '100%',
              padding: '9px 38px 9px 12px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{
            padding: '9px 14px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-main)',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">{t('auto.كافة_الأدوار_الوظيفية_1a1381')}</option>
          {roles.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>

        {/* Branch Filter */}
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          style={{
            padding: '9px 14px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-main)',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">{t('auto.كافة_الفروع_1a62e9')}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Project Filter */}
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          style={{
            padding: '9px 14px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-main)',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">{t('auto.كافة_المشاريع_65e01c')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '9px 14px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-main)',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">{t('auto.كافة_الحالات_3318a9')}</option>
          <option value="active">{t('auto.نشط_فقط_361dab')}</option>
          <option value="inactive">{t('auto.معطل_فقط_66c560')}</option>
        </select>

        <button
          type="button"
          onClick={loadUsers}
          style={{
            padding: '9px 14px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
          }}
          title={t('auto.تحديث_القائمة_414bd9')}
        >
          <RefreshCw size={15} />
          {t('auto.تحديث_59c38f')}</button>
      </div>

      {/* Users Table */}
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
              width: '36px',
              height: '36px',
              border: '3px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px',
            }}
          />
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{t('auto.جاري_تحميل_حسابات_المستخدمين_493734')}</div>
        </div>
      ) : usersList.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', margin: '0 0 6px' }}>{t('auto.لا_يوجد_مستخدمون_مطابقون_للبحث_227da1')}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px' }}>
            {t('auto.يمكنك_إنشاء_حساب_مستخدم_جديد_أ_1f257f')}</p>
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            {t('auto.إنشاء_حساب_جديد_64e538')}</button>
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
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'right',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'rgba(17, 29, 56, 0.98)',
                    borderBottom: '2px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '16px 20px' }}>{t('auto.المستخدم_660690')}</th>
                  <th style={{ padding: '16px 14px' }}>{t('auto.الموظف_المرتبط_6769aa')}</th>
                  <th style={{ padding: '16px 14px' }}>{t('auto.الأدوار_الوظيفية_42fdb3')}</th>
                  <th style={{ padding: '16px 14px' }}>{t('auto.نطاق_المشاريع_المعزول_1dd919')}</th>
                  <th style={{ padding: '16px 14px' }}>{t('auto.الحالة_252d72')}</th>
                  <th style={{ padding: '16px 14px' }}>{t('auto.تاريخ_الإنشاء_759697')}</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u, idx) => {
                  const isCompanyAdmin = u.roles.some((r) =>
                    ['company_admin', 'super_admin', 'admin'].includes(r.roleCode),
                  );
                  const isProgramManager = u.roles.some((r) => r.roleCode === 'program_manager');

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background:
                          idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.025)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.025)';
                      }}
                    >
                      {/* User details */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: isCompanyAdmin
                                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              color: '#fff',
                              fontSize: '14px',
                            }}
                          >
                            {u.fullName ? u.fullName.charAt(0) : u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{u.fullName}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                              @{u.username}
                            </div>
                            {u.email && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {u.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Linked Employee */}
                      <td style={{ padding: '14px' }}>
                        {u.employee ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.employee.name}</div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                color: '#60a5fa',
                                background: 'rgba(59, 130, 246, 0.1)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {u.employee.code}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t('auto.غير_مرتبط_686eeb')}</span>
                        )}
                      </td>

                      {/* Roles Badges */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {u.roles.map((r) => {
                            const isAdminRole = ['company_admin', 'super_admin', 'admin'].includes(r.roleCode);
                            return (
                              <span
                                key={r.roleId || r.roleCode}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: isAdminRole
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(59, 130, 246, 0.15)',
                                  color: isAdminRole ? '#fbbf24' : '#93c5fd',
                                  border: isAdminRole
                                    ? '1px solid rgba(245, 158, 11, 0.3)'
                                    : '1px solid rgba(59, 130, 246, 0.3)',
                                }}
                              >
                                {r.roleName}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Scopes */}
                      <td style={{ padding: '14px' }}>
                        {isCompanyAdmin || isProgramManager ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            <Building size={13} />
                            {t('auto.صلاحية_شاملة_كافة_المشاريع_415bbc')}</span>
                        ) : u.scopes && u.scopes.length > 0 ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {u.scopes.map((sc) => (
                              <span
                                key={sc.id || sc.projectId}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: 'rgba(139, 92, 246, 0.15)',
                                  color: '#c084fc',
                                  border: '1px solid rgba(139, 92, 246, 0.3)',
                                }}
                              >
                                {sc.projectName || sc.projectCode || t('auto.مشروع_محدد_5b4a3c')}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {t('auto.عام_كافة_مشاريع_الشركة_6c568c')}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          title={t('auto.انقر_لتغيير_حالة_الحساب_7223b6')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: u.isActive
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: u.isActive ? '#34d399' : '#f87171',
                            border: u.isActive
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 size={12} />
                              {t('auto.نشط_185349')}</>
                          ) : (
                            <>
                              <XCircle size={12} />
                              {t('auto.معطل_2f1ba8')}</>
                          )}
                        </button>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            title={t('auto.تعديل_الأدوار_والنطاقات_3de73e')}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              color: '#60a5fa',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openOverridesModal(u)}
                            title={t('auto.استثناءات_الصلاحيات_المباشرة_66234c')}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'rgba(139, 92, 246, 0.1)',
                              border: '1px solid rgba(139, 92, 246, 0.25)',
                              color: '#c084fc',
                              cursor: 'pointer',
                            }}
                          >
                            <Shield size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResetPassModalUser(u);
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            title={t('auto.إعادة_تعيين_كلمة_المرور_19c958')}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'rgba(234, 179, 8, 0.1)',
                              border: '1px solid rgba(234, 179, 8, 0.25)',
                              color: '#facc15',
                              cursor: 'pointer',
                            }}
                          >
                            <KeyRound size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUser(u)}
                            title={t('auto.تعطيل_وحذف_الجلسات_440100')}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#f87171',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {totalCount > limit && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <div>
                {t('auto.عرض_18221e')}{(page - 1) * limit + 1} {t('auto.إلى_17d96a')}{Math.min(page * limit, totalCount)} {t('auto.من_إجمالي_4d6b95')}{totalCount} {t('auto.مستخدم_d131bc')}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: page <= 1 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-subtle)',
                    color: page <= 1 ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ChevronRight size={14} />
                  {t('auto.السابق_252abb')}</button>
                <button
                  type="button"
                  disabled={page * limit >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: page * limit >= totalCount ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-subtle)',
                    color: page * limit >= totalCount ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: page * limit >= totalCount ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {t('auto.التالي_252ecf')}<ChevronLeft size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create / Edit User Account */}
      {(createModalOpen || !!editModalUser) && (
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
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              animation: 'modalSlideIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60a5fa',
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                  {createModalOpen ? t('auto.إنشاء_حساب_مستخدم_جديد_36bee7') : `تعديل حساب "${editModalUser?.username}"`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateModalOpen(false);
                  setEditModalUser(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createModalOpen ? handleCreateSubmit : handleUpdateSubmit}>
              {/* Linked Employee */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('auto.ربط_بموظف_من_السجل_اختياري_48fe0c')}</label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="">{t('auto.بدون_ربط_بموظف_4730ee')}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code || e.identityNumber}) - {e.roleType || t('auto.موظف_2f1f2e')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Username and Full Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('auto.اسم_المستخدم_Username_7420d8')}</label>
                  <input
                    type="text"
                    disabled={!createModalOpen}
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder={t('auto.مثال_eng_ahmed_73ceb1')}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: createModalOpen ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('auto.الاسم_الكامل_131b51')}</label>
                  <input
                    type="text"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder={t('auto.مثال_م_أحمد_خالد_1fd06d')}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Password (Only in create mode) */}
              {createModalOpen && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('auto.كلمة_المرور_6_أحرف_على_الأقل_3959bd')}</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Email and Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('auto.البريد_الإلكتروني_1f05e4')}</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="eng@company.com"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    {t('auto.رقم_الهاتف_d581c0')}</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0501234567"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Role Selection (Visible Checkbox Chips) */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, margin: 0 }}>
                    <Shield size={16} color="#60a5fa" />
                    <span>{t('auto.الأدوار_الوظيفية_المعتمدة_Role_18852e')}</span>
                  </label>
                  <span style={{ fontSize: '11px', color: formRoleCodes.length > 0 ? '#93c5fd' : '#f87171', fontWeight: 600 }}>
                    {formRoleCodes.length > 0 ? `تم اختيار ${formRoleCodes.length} أدوار` : t('auto.مطلوب_دور_واحد_على_الأقل_299157')}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {roles.map((r) => {
                    const isSelected = formRoleCodes.includes(r.code);
                    const isAdmin = ['company_admin', 'super_admin', 'admin'].includes(r.code);
                    return (
                      <label
                        key={r.code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          cursor: 'pointer',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: isSelected
                            ? isAdmin
                              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)'
                              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.22) 0%, rgba(37, 99, 235, 0.1) 100%)'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected
                            ? isAdmin
                              ? '1px solid rgba(245, 158, 11, 0.6)'
                              : '1px solid rgba(59, 130, 246, 0.6)'
                            : '1px solid var(--border-subtle)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setFormRoleCodes(formRoleCodes.filter((c) => c !== r.code));
                              } else {
                                setFormRoleCodes([...formRoleCodes, r.code]);
                              }
                            }}
                            style={{ accentColor: isAdmin ? '#f59e0b' : '#3b82f6' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#fff' : 'var(--text-muted)' }}>
                            {r.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: isSelected ? (isAdmin ? '#fbbf24' : '#93c5fd') : 'var(--text-dim)',
                          }}
                        >
                          {r.code}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Project Scope Selection (Visible Checklist & Global Toggle) */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, margin: 0 }}>
                    <FolderKanban size={16} color="#c084fc" />
                    <span>{t('auto.نطاق_المشاريع_المعزول_Project__2f7a5d')}</span>
                  </label>

                  {!isUnrestrictedFormRole && projects.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setFormSelectedProjectIds(projects.map((p) => p.id))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#60a5fa',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: 0,
                        }}
                      >
                        {t('auto.تحديد_كافة_المشاريع_7ed983')}</button>
                      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>|</span>
                      <button
                        type="button"
                        onClick={() => setFormSelectedProjectIds([])}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: 0,
                        }}
                      >
                        {t('auto.إلغاء_التحديد_517951')}</button>
                    </div>
                  )}
                </div>

                {isUnrestrictedFormRole ? (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      color: '#34d399',
                      fontSize: '12.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Building size={18} />
                    <span>
                      {t('auto.الأدوار_الإدارية_العليا_المحدد_7c6e07')}</span>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        maxHeight: '180px',
                        overflowY: 'auto',
                      }}
                      className="sidebar-scroll"
                    >
                      {projects.map((p) => {
                        const isProjSelected = formSelectedProjectIds.includes(p.id);
                        const branch = branches.find((b) => b.id === p.branchId);
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              cursor: 'pointer',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: isProjSelected ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                              border: isProjSelected ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid var(--border-subtle)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <input
                                type="checkbox"
                                checked={isProjSelected}
                                onChange={() => {
                                  if (isProjSelected) {
                                    setFormSelectedProjectIds(formSelectedProjectIds.filter((id) => id !== p.id));
                                  } else {
                                    setFormSelectedProjectIds([...formSelectedProjectIds, p.id]);
                                  }
                                }}
                                style={{ accentColor: '#8b5cf6' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '12px', fontWeight: isProjSelected ? 700 : 500, color: isProjSelected ? '#fff' : 'var(--text-muted)' }}>
                                  {p.name}
                                </span>
                                {branch && (
                                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                    {t('auto.فرع_2efc53')}{branch.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#c084fc' }}>
                              {p.code}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                      {t('auto.المشاريع_المحددة_441121')}{formSelectedProjectIds.length} {t('auto.من_c8a1')}{projects.length}
                    </div>
                  </div>
                )}
              </div>

              {/* Status checkbox */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('auto.الحساب_نشط_ويمكنه_تسجيل_الدخول_f73e77')}</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setEditModalUser(null);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {t('auto.إلغاء_5987b3')}</button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {formSubmitting ? t('auto.جاري_الحفظ_6d43e6') : createModalOpen ? t('auto.إنشاء_الحساب_48d4d5') : t('auto.حفظ_التعديلات_4ff313')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Permission Overrides Modal */}
      {overridesModalUser && (
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
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              animation: 'modalSlideIn 0.2s ease',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                    {t('auto.استثناءات_الصلاحيات_المباشرة_ل_604831')}</h3>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {t('auto.المستخدم_5acb8e')}<strong style={{ color: '#fff' }}>{overridesModalUser.fullName}</strong> (@{overridesModalUser.username})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOverridesModalUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formula Explanation Banner */}
            <div
              style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#e9d5ff',
                marginBottom: '16px',
                lineHeight: '1.5',
              }}
            >
              {t('auto.الصلاحيات_الفعلية_3f6c6c')}<strong>{t('auto.صلاحيات_الأدوار_استثناءات_المن_d5dc0c')}</strong>
            </div>

            {/* Permissions Overrides List */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
              {loadingOverrides ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>{t('auto.جاري_التحميل_16785e')}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allPermissions.map((perm) => {
                    const hasFromRole = overridesData?.rolePermissions.includes(perm.code);
                    const currentOverride = currentOverridesMap[perm.code] || 'none';

                    return (
                      <div
                        key={perm.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          background:
                            currentOverride === 'grant'
                              ? 'rgba(16, 185, 129, 0.08)'
                              : currentOverride === 'deny'
                              ? 'rgba(239, 68, 68, 0.08)'
                              : 'rgba(255, 255, 255, 0.02)',
                          border:
                            currentOverride === 'grant'
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : currentOverride === 'deny'
                              ? '1px solid rgba(239, 68, 68, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                            {perm.name || perm.description || perm.code}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                              {perm.code}
                            </span>
                            {hasFromRole && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(59, 130, 246, 0.15)',
                                  color: '#60a5fa',
                                }}
                              >
                                {t('auto.ممنوحة_من_الدور_555bb3')}</span>
                            )}
                          </div>
                        </div>

                        {/* Toggle Controls: None / Grant / Deny */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOverrideToggle(perm.code, 'grant')}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background:
                                currentOverride === 'grant'
                                  ? '#10b981'
                                  : 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              color: currentOverride === 'grant' ? '#fff' : '#34d399',
                            }}
                          >
                            {t('auto.منح_Grant_7323d5')}</button>

                          <button
                            type="button"
                            onClick={() => handleOverrideToggle(perm.code, 'deny')}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background:
                                currentOverride === 'deny'
                                  ? '#ef4444'
                                  : 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: currentOverride === 'deny' ? '#fff' : '#f87171',
                            }}
                          >
                            {t('auto.حجب_Deny_1df071')}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setOverridesModalUser(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {t('auto.إلغاء_5987b3')}</button>
              <button
                type="button"
                onClick={handleSaveOverrides}
                disabled={savingOverrides}
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  background: '#8b5cf6',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: savingOverrides ? 'not-allowed' : 'pointer',
                }}
              >
                {savingOverrides ? t('auto.جاري_الحفظ_6d43e6') : t('auto.حفظ_استثناءات_الصلاحيات_76ff51')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password Modal */}
      {resetPassModalUser && (
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
              border: '1px solid rgba(234, 179, 8, 0.4)',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              animation: 'modalSlideIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(234, 179, 8, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#facc15',
                  }}
                >
                  <KeyRound size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{t('auto.إعادة_تعيين_كلمة_المرور_19c958')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetPassModalUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('auto.كلمة_المرور_الجديدة_637a91')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {t('auto.تأكيد_كلمة_المرور_الجديدة_3f7d9f')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setResetPassModalUser(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {t('auto.إلغاء_5987b3')}</button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    background: '#eab308',
                    border: 'none',
                    color: '#000',
                    fontWeight: 700,
                    cursor: resettingPassword ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resettingPassword ? t('auto.جاري_الحفظ_6d43e6') : t('auto.تحديث_كلمة_المرور_64e5f4')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete / Deactivate Confirm */}
      {deleteConfirmUser && (
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
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              animation: 'modalSlideIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f87171' }}>
                  {t('auto.تأكيد_تعطيل_حساب_المستخدم_6051ea')}</h3>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t('auto.سيتم_إلغاء_كافة_الجلسات_النشطة_75ba00')}</p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.6', marginBottom: '22px' }}>
              {t('auto.هل_أنت_متأكد_من_رغبتك_في_تعطيل_b8d5c7')}<strong style={{ color: '#fff' }}>"{deleteConfirmUser.fullName}"</strong> (@{deleteConfirmUser.username}{t('auto.لن_يتمكن_المستخدم_من_تسجيل_الد_a0837c')}</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {t('auto.إلغاء_5987b3')}</button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('auto.تأكيد_التعطيل_63699e')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
