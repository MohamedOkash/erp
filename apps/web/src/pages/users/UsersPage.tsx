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
      setErrorMsg(err?.message || 'فشل تحميل بيانات المستخدمين');
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
      setErrorMsg('اسم المستخدم مطلوب');
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      setErrorMsg('كلمة المرور يجب أن لا تقل عن 6 أحرف');
      return;
    }
    if (!formFullName.trim()) {
      setErrorMsg('الاسم الكامل مطلوب');
      return;
    }
    if (formRoleCodes.length === 0) {
      setErrorMsg('يرجى اختيار دور وظيفي واحد على الأقل للمستخدم');
      return;
    }
    if (!isUnrestrictedFormRole && formSelectedProjectIds.length === 0) {
      setErrorMsg('يجب تحديد نطاق مشروع واحد على الأقل للمستخدم الميداني / غير الشامل');
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
      setErrorMsg(err?.message || 'فشل إنشاء حساب المستخدم');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Update User
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    if (!formFullName.trim()) {
      setErrorMsg('الاسم الكامل مطلوب');
      return;
    }
    if (formRoleCodes.length === 0) {
      setErrorMsg('يرجى اختيار دور وظيفي واحد على الأقل للمستخدم');
      return;
    }
    if (!isUnrestrictedFormRole && formSelectedProjectIds.length === 0) {
      setErrorMsg('يجب تحديد نطاق مشروع واحد على الأقل للمستخدم الميداني / غير الشامل');
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
      setErrorMsg(err?.message || 'فشل تحديث بيانات المستخدم');
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
      setErrorMsg(err?.message || 'فشل تعديل حالة الحساب');
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
      setErrorMsg(err?.message || 'فشل تعطيل حساب المستخدم');
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
      setErrorMsg(err?.message || 'فشل جلب استثناءات الصلاحيات');
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
      setErrorMsg(err?.message || 'فشل حفظ استثناءات الصلاحيات');
    } finally {
      setSavingOverrides(false);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModalUser) return;
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين');
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
      setErrorMsg(err?.message || 'فشل إعادة تعيين كلمة المرور');
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
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>إجمالي حسابات المستخدمين</div>
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
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>الحسابات النشطة</div>
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
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>حسابات بنطاق مشاريع محدد</div>
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
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>مديرو النظام الشامل</div>
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
            placeholder="بحث بالاسم، اسم المستخدم، البريد..."
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
          <option value="all">كافة الأدوار الوظيفية</option>
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
          <option value="all">كافة الفروع</option>
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
          <option value="all">كافة المشاريع</option>
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
          <option value="all">كافة الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="inactive">معطل فقط</option>
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
          title="تحديث القائمة"
        >
          <RefreshCw size={15} />
          تحديث
        </button>
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
          <div style={{ fontSize: '15px', fontWeight: 600 }}>جاري تحميل حسابات المستخدمين...</div>
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
          <h3 style={{ fontSize: '18px', margin: '0 0 6px' }}>لا يوجد مستخدمون مطابقون للبحث</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px' }}>
            يمكنك إنشاء حساب مستخدم جديد أو تعديل خيارات الفلترة.
          </p>
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
            + إنشاء حساب جديد
          </button>
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
                  <th style={{ padding: '16px 20px' }}>المستخدم</th>
                  <th style={{ padding: '16px 14px' }}>الموظف المرتبط</th>
                  <th style={{ padding: '16px 14px' }}>الأدوار الوظيفية</th>
                  <th style={{ padding: '16px 14px' }}>نطاق المشاريع المعزول</th>
                  <th style={{ padding: '16px 14px' }}>الحالة</th>
                  <th style={{ padding: '16px 14px' }}>تاريخ الإنشاء</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center' }}>الإجراءات</th>
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
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>غير مرتبط</span>
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
                            صلاحية شاملة (كافة المشاريع)
                          </span>
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
                                {sc.projectName || sc.projectCode || 'مشروع محدد'}
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
                            عام (كافة مشاريع الشركة)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          title="انقر لتغيير حالة الحساب"
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
                              نشط
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              معطل
                            </>
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
                            title="تعديل الأدوار والنطاقات"
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
                            title="استثناءات الصلاحيات المباشرة"
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
                            title="إعادة تعيين كلمة المرور"
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
                            title="تعطيل وحذف الجلسات"
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
                عرض {(page - 1) * limit + 1} إلى {Math.min(page * limit, totalCount)} من إجمالي {totalCount} مستخدم
              </div>
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
                  السابق
                </button>
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
                  التالي
                  <ChevronLeft size={14} />
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
                  {createModalOpen ? 'إنشاء حساب مستخدم جديد' : `تعديل حساب "${editModalUser?.username}"`}
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
                  ربط بموظف من السجل (اختياري)
                </label>
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
                  <option value="">-- بدون ربط بموظف --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code || e.identityNumber}) - {e.roleType || 'موظف'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Username and Full Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    اسم المستخدم (Username) *
                  </label>
                  <input
                    type="text"
                    disabled={!createModalOpen}
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="مثال: eng_ahmed"
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
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="مثال: م. أحمد خالد"
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
                    كلمة المرور * (6 أحرف على الأقل)
                  </label>
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
                    البريد الإلكتروني
                  </label>
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
                    رقم الهاتف
                  </label>
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
                    <span>الأدوار الوظيفية المعتمدة (Roles) *</span>
                  </label>
                  <span style={{ fontSize: '11px', color: formRoleCodes.length > 0 ? '#93c5fd' : '#f87171', fontWeight: 600 }}>
                    {formRoleCodes.length > 0 ? `تم اختيار ${formRoleCodes.length} أدوار` : 'مطلوب دور واحد على الأقل'}
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
                    <span>نطاق المشاريع المعزول (Project Scope Checklist)</span>
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
                        تحديد كافة المشاريع
                      </button>
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
                        إلغاء التحديد
                      </button>
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
                      الأدوار الإدارية العليا المحددة (Admin / Program Manager) تمنح وصولاً شاملاً لكافة مشاريع وفروع المنشأة تلقائياً.
                    </span>
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
                                    فرع: {branch.name}
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
                      المشاريع المحددة: {formSelectedProjectIds.length} من {projects.length}
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
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>الحساب نشط ويمكنه تسجيل الدخول</span>
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
                  إلغاء
                </button>
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
                  {formSubmitting ? 'جاري الحفظ...' : createModalOpen ? 'إنشاء الحساب' : 'حفظ التعديلات'}
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
                    استثناءات الصلاحيات المباشرة للمستخدم (Permission Overrides)
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                    المستخدم: <strong style={{ color: '#fff' }}>{overridesModalUser.fullName}</strong> (@{overridesModalUser.username})
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
              الصلاحيات الفعلية = <strong>(صلاحيات الأدوار ∪ استثناءات المنح Grant) ∖ استثناءات الحجب Deny</strong>
            </div>

            {/* Permissions Overrides List */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
              {loadingOverrides ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>جاري التحميل...</div>
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
                                ممنوحة من الدور
                              </span>
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
                            + منح (Grant)
                          </button>

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
                            - حجب (Deny)
                          </button>
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
                إلغاء
              </button>
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
                {savingOverrides ? 'جاري الحفظ...' : 'حفظ استثناءات الصلاحيات'}
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
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>إعادة تعيين كلمة المرور</h3>
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
                  كلمة المرور الجديدة *
                </label>
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
                  تأكيد كلمة المرور الجديدة *
                </label>
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
                  إلغاء
                </button>
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
                  {resettingPassword ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
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
                  تأكيد تعطيل حساب المستخدم
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  سيتم إلغاء كافة الجلسات النشطة للمستخدم فوراً
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.6', marginBottom: '22px' }}>
              هل أنت متأكد من رغبتك في تعطيل حساب <strong style={{ color: '#fff' }}>"{deleteConfirmUser.fullName}"</strong> (@{deleteConfirmUser.username})؟ لن يتمكن المستخدم من تسجيل الدخول حتى تتم إعادة تنشيطه.
            </p>

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
                إلغاء
              </button>
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
                تأكيد التعطيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
