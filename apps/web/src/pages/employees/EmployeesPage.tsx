import React, { useEffect, useState, useCallback } from 'react';
import { employeesApi } from '../../api/employees.api';
import type { Employee, CreateEmployeePayload, UpdateEmployeePayload } from '../../api/employees.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { EmployeeFormModal } from './EmployeeFormModal';
import { XlsxImportModal } from './XlsxImportModal';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { useI18n } from '../../i18n/I18nContext';
import {
  Users,
  Plus,
  Search,
  Download,
  UploadCloud,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  Building,
  Briefcase,
  Layers,
  X,
  DollarSign,
  ShieldCheck,
  HardHat,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Quick Identity Lookup
  const [identityLookupQuery, setIdentityLookupQuery] = useState('');
  const [isSearchingIdentity, setIsSearchingIdentity] = useState(false);
  const [lookupResult, setLookupResult] = useState<Employee | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Deactivate State
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<Employee | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // View Assignments State
  const [viewingAssignmentsEmp, setViewingAssignmentsEmp] = useState<Employee | null>(null);

  const loadBranches = async () => {
    try {
      const res = await branchesApi.list({ isActive: true });
      setBranches(res.data);
    } catch {
      // ignore
    }
  };

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await employeesApi.list({
        page,
        limit,
        search: search.trim() || undefined,
        branchId: selectedBranch || undefined,
        role: selectedRole || undefined,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
      });
      setEmployees(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_بيانات_الموظفين_5d64ce'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedBranch, selectedRole, statusFilter]);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleIdentityLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityLookupQuery.trim()) return;

    setIsSearchingIdentity(true);
    setLookupResult(null);
    setError(null);
    try {
      const emp = await employeesApi.getByIdentity(identityLookupQuery.trim());
      setLookupResult(emp);
    } catch (err: any) {
      setError(err.message || t('auto.لم_يتم_العثور_على_أي_موظف_بهذا_7d37f7'));
    } finally {
      setIsSearchingIdentity(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsFormModalOpen(true);
  };

  const handleSave = async (payload: CreateEmployeePayload | UpdateEmployeePayload) => {
    setIsSaving(true);
    setError(null);
    try {
      if (editingEmployee) {
        await employeesApi.update(editingEmployee.id, payload);
        setSuccessMsg(t('auto.تم_تحديث_بيانات_الموظف_بنجاح_41c88a'));
      } else {
        await employeesApi.create(payload as CreateEmployeePayload);
        setSuccessMsg(t('auto.تم_إنشاء_سجل_الموظف_الجديد_بنج_5f1582'));
      }
      setIsFormModalOpen(false);
      loadEmployees();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_بيانات_الموظف_6ef2f2'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingEmployee) return;
    setIsDeactivating(true);
    try {
      await employeesApi.deactivate(deactivatingEmployee.id);
      setSuccessMsg(`تم تعطيل / حذف الموظف "${deactivatingEmployee.name}" بنجاح`);
      setDeactivatingEmployee(null);
      loadEmployees();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تعطيل_الموظف_9c4147'));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleExportXlsx = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await employeesApi.exportXlsx();
      setSuccessMsg(t('auto.تم_تصدير_ملف_الموظفين_بنجاح_6742ef'));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تصدير_ملف_الموظفين_a38acc'));
    } finally {
      setIsExporting(false);
    }
  };

  const getIdentityBadge = (emp: Employee) => {
    const type = emp.identityType || 'national_id';
    switch (type) {
      case 'national_id':
        return <span className="badge badge-primary">{t('auto.هوية_وطنية_4faf6f')}</span>;
      case 'iqama':
        return <span className="badge badge-secondary">{t('auto.إقامة_مقيم_250e80')}</span>;
      case 'passport':
        return <span className="badge badge-accent">{t('auto.جواز_سفر_3efa11')}</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  // Compute summary stats
  const activeCount = employees.filter((e) => e.isActive).length;
  const supervisorsCount = employees.filter((e) => e.role === 'supervisor' || e.roleType === 'supervisor').length;
  const workersCount = employees.filter((e) => e.role === 'worker' || e.roleType === 'worker').length;
  const avgWage =
    employees.length > 0
      ? Math.round(employees.reduce((acc, e) => acc + (Number(e.dailyWage) || 0), 0) / employees.length)
      : 0;

  const statsItems = [
    {
      label: t('auto.إجمالي_الموظفين_39fbc7'),
      value: total,
      helper: `${employees.length} مسجلين حالياً`,
      icon: <Users size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.الموظفون_النشطون_185bc8'),
      value: activeCount,
      helper: `${total - activeCount} معطل أو مؤرشف`,
      icon: <ShieldCheck size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.المشرفون_والكوادر_2b9753'),
      value: supervisorsCount,
      helper: `${workersCount} عمال تشغيل`,
      icon: <HardHat size={22} />,
      color: '#f59e0b',
    },
    {
      label: t('auto.متوسط_الأجر_اليومي_239c75'),
      value: `${avgWage} SAR`,
      helper: t('auto.لكافة_التخصصات_والمواقع_524e26'),
      icon: <DollarSign size={22} />,
      color: '#a78bfa',
    },
  ];

  const getExpiryBadge = (dateStr?: string | null) => {
    if (!dateStr) return <span style={{ color: 'var(--text-dim)' }}>—</span>;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return (
        <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.72rem' }}>
          {t('auto.منتهية_33ddc2')}{Math.abs(diffDays)} {t('auto.يوم_مضت_4bcf17')}</span>
      );
    }
    if (diffDays <= 90) {
      return (
        <span className="badge badge-primary" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '0.72rem' }}>
          {t('auto.تنتهي_خلال_1544ea')}{diffDays} {t('auto.يوم_1864c7')}</span>
      );
    }
    return (
      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
        {dateStr.split('T')[0]}
      </span>
    );
  };

  const startRecord = employees.length === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Top Header & Actions Bar */}
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
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={26} color="#60a5fa" />
            <span>{t('resources.employees_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.employees')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={isExporting || employees.length === 0}
            className="btn btn-secondary"
            style={{ gap: '0.4rem' }}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{t('common.export_excel')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-secondary"
            style={{ gap: '0.4rem' }}
          >
            <UploadCloud size={16} />
            <span>{t('operations.import_excel')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn btn-primary"
            style={{ gap: '0.4rem' }}
          >
            <Plus size={16} />
            <span>{t('resources.add_employee')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && employees.length === 0} />

      {/* Alerts */}
      {successMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--status-success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--status-danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Identity Search Box */}
      <div
        className="glass-card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
        }}
      >
        <form onSubmit={handleIdentityLookup} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', fontWeight: 600, fontSize: '0.9rem' }}>
            <CreditCard size={18} />
            <span>{t('auto.فحص_هوية_إقامة_فوري_38f076')}</span>
          </div>

          <input
            type="text"
            className="input-field"
            style={{ maxWidth: '320px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            placeholder={t('auto.أدخل_رقم_الهوية_أو_الإقامة_1c04de')}
            value={identityLookupQuery}
            onChange={(e) => setIdentityLookupQuery(e.target.value)}
          />

          <button type="submit" className="btn btn-secondary" disabled={isSearchingIdentity} style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            {isSearchingIdentity ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span>{t('auto.استعلام_625abd')}</span>
          </button>

          {lookupResult && (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: 'auto' }}>
              <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>
                {t('auto.و_جد_6dcdee')}{lookupResult.name} ({lookupResult.roleType}) - {lookupResult.branchName || t('auto.فرع_184029')}
              </span>
              <button
                type="button"
                onClick={() => setLookupResult(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Search size={14} />
            <span>{t('auto.بحث_بالاسم_أو_الكود_2f040e')}</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder={t('auto.ابحث_4fa1bf')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Building size={14} />
            <span>{t('auto.الفرع_59a3fe')}</span>
          </label>
          <select
            className="input-field"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الفروع_1a62e9')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Briefcase size={14} />
            <span>{t('auto.الدور_الوظيفي_358574')}</span>
          </label>
          <select
            className="input-field"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الأدوار_33a1e2')}</option>
            <option value="worker">{t('auto.عامل_Worker_1f1ef5')}</option>
            <option value="supervisor">{t('auto.مشرف_Supervisor_d857fa')}</option>
            <option value="engineer">{t('auto.مهندس_Engineer_2f03b8')}</option>
            <option value="project_manager">{t('auto.مدير_مشروع_36ebfd')}</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('auto.الحالة_252d72')}</label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الحالات_3318a9')}</option>
            <option value="true">{t('auto.نشط_فقط_361dab')}</option>
            <option value="false">{t('auto.معطل_فقط_66c560')}</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      {isLoading && employees.length === 0 ? (
        <TableSkeleton rows={6} columns={8} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>{t('auto.الاسم_الكود_20cd46')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الوثيقة_رقم_الهوية_21e36e')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.صلاحية_الإقامة_الهوية_39a3f4')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الفرع_الأساسي_5b1823')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الدور_59a3bd')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الأجر_اليومي_14bd29')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الحالة_252d72')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_يوجد_موظفون_مطابقون_لمعايير_41cbd3')}</td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {emp.code || t('auto.بدون_كود_519c6b')} {emp.phone ? `• ${emp.phone}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div>{getIdentityBadge(emp)}</div>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1' }}>
                            {emp.identityNumber || (emp as any).nationalId || '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {getExpiryBadge(emp.identityExpiryDate)}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {emp.branchName || t('auto.غير_محدد_1567b8')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                          {emp.roleType || emp.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {emp.dailyWage}{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('auto.SAR_يوم_65be80')}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {emp.isActive ? (
                          <span className="badge badge-success">{t('auto.نشط_185349')}</span>
                        ) : (
                          <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                            {t('auto.معطل_2f1ba8')}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          {emp.assignments && emp.assignments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setViewingAssignmentsEmp(emp)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                              title={t('auto.عرض_التعيينات_3aca01')}
                            >
                              <Layers size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title={t('auto.تعديل_الموظف_4f28c8')}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeactivatingEmployee(emp)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.25)',
                            }}
                            title={t('auto.تعطيل_حذف_560bfd')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              padding: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.موظف_عامل_4750aa')}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('auto.السابق_252abb')}</button>
              <span style={{ padding: '0.35rem 0.5rem' }}>{t('auto.صفحة_2ea914')}{page}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                {t('auto.التالي_252ecf')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleSave}
        editingEmployee={editingEmployee}
        branches={branches}
        isSaving={isSaving}
      />

      {/* XLSX Import Modal */}
      <XlsxImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(t('auto.تم_استيراد_واعتماد_بيانات_المو_558540'));
          loadEmployees();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={!!deactivatingEmployee}
        onClose={() => setDeactivatingEmployee(null)}
        title={t('auto.تأكيد_تعطيل_الموظف_53c565')}
        icon={<Trash2 size={22} color="#f87171" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeactivatingEmployee(null)}
              className="btn btn-secondary"
              disabled={isDeactivating}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button
              type="button"
              onClick={handleConfirmDeactivate}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isDeactivating}
            >
              {isDeactivating ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.تأكيد_التعطيل_63699e')}</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_تعطيل_66e6c4')}<strong style={{ color: '#ffffff' }}>"{deactivatingEmployee?.name}"</strong>{t('auto.Soft_Delete_يمكن_إعادة_تنشيطه__21ff8f')}</p>
      </Modal>

      {/* View Assignments Modal */}
      <Modal
        isOpen={!!viewingAssignmentsEmp}
        onClose={() => setViewingAssignmentsEmp(null)}
        title={`تعيينات: ${viewingAssignmentsEmp?.name || ''}`}
        icon={<Layers size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <button type="button" onClick={() => setViewingAssignmentsEmp(null)} className="btn btn-secondary">
            {t('auto.إغلاق_59834d')}</button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {viewingAssignmentsEmp?.assignments && viewingAssignmentsEmp.assignments.length > 0 ? (
            viewingAssignmentsEmp.assignments.map((a, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{a.projectName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {t('auto.كود_2f1031')}{a.projectCode} {t('auto.دور_263c7e')}{a.assignedRole}
                  </div>
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                  {t('auto.منذ_1851af')}{a.startDate ? a.startDate.split('T')[0] : '—'}
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1rem' }}>
              {t('auto.لا_توجد_تعيينات_حالية_لهذا_الم_63ad6b')}</p>
          )}
        </div>
      </Modal>
    </div>
  );
};
