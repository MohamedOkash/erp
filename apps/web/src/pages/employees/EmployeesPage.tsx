import React, { useEffect, useState, useCallback } from 'react';
import { employeesApi } from '../../api/employees.api';
import type { Employee, CreateEmployeePayload, UpdateEmployeePayload } from '../../api/employees.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
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
  Hash,
  HardHat,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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
  const [selectedProfession, setSelectedProfession] = useState('');
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

  // View Assignments & Project Codes State
  const [viewingAssignmentsEmp, setViewingAssignmentsEmp] = useState<Employee | null>(null);
  const [viewingProjectCodesEmp, setViewingProjectCodesEmp] = useState<Employee | null>(null);
  const [projectCodesList, setProjectCodesList] = useState<any[]>([]);
  const [selectedProjectForCode, setSelectedProjectForCode] = useState('');
  const [customProjectCode, setCustomProjectCode] = useState('');
  const [savingProjectCode, setSavingProjectCode] = useState(false);

  const loadBranches = async () => {
    try {
      const res = await branchesApi.list({ isActive: true });
      setBranches(res.data);
    } catch {
      // ignore
    }
  };

  const loadProjects = async () => {
    try {
      const res = await projectsApi.list({ limit: 100 });
      setProjects(res.data || []);
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
        profession: selectedProfession || undefined,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
      });
      setEmployees(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_بيانات_الموظفين_5d64ce'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedBranch, selectedRole, selectedProfession, statusFilter]);

  useEffect(() => {
    loadBranches();
    loadProjects();
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
      setSuccessMsg(t('auto.تم_تعطيل_الموظف_بنجاح', { defaultValue: 'Deleted successfully' }));
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

  const openProjectCodes = async (emp: Employee) => {
    setViewingProjectCodesEmp(emp);
    setSelectedProjectForCode('');
    setCustomProjectCode('');
    try {
      const res = await employeesApi.getProjectCodes(emp.id);
      setProjectCodesList(res.data || []);
    } catch {
      setProjectCodesList([]);
    }
  };

  const handleSaveProjectCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingProjectCodesEmp || !selectedProjectForCode || !customProjectCode.trim()) return;

    setSavingProjectCode(true);
    try {
      await employeesApi.assignProjectCode(
        viewingProjectCodesEmp.id,
        selectedProjectForCode,
        customProjectCode.trim(),
      );
      const res = await employeesApi.getProjectCodes(viewingProjectCodesEmp.id);
      setProjectCodesList(res.data || []);
      setSelectedProjectForCode('');
      setCustomProjectCode('');
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setSavingProjectCode(false);
    }
  };

  const getIdentityBadge = (emp: Employee) => {
    const type = emp.identityType || 'national_id';
    switch (type) {
      case 'national_id':
        return <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{t('auto.هوية_وطنية_1377ce')}</span>;
      case 'iqama':
        return <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{t('auto.إقامة_599723')}</span>;
      case 'passport':
        return <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{t('auto.جواز_سفر_523f66')}</span>;
      default:
        return null;
    }
  };

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={28} color="#f59e0b" />
            <span>{t('nav.links.employees')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('resources.employees_title')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportXlsx}
            disabled={isExporting}
            className="btn btn-secondary"
            style={{ gap: '0.5rem' }}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{t('auto.تصدير_Excel_547f87')}</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-secondary"
            style={{ gap: '0.5rem' }}
          >
            <UploadCloud size={16} />
            <span>{t('auto.استيراد_XLSX_4f1b40')}</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="btn btn-primary"
            style={{ gap: '0.5rem', background: '#f59e0b', color: '#000' }}
          >
            <Plus size={16} />
            <span>{t('resources.add_employee')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <StatsStrip
        items={[
          { label: t('auto.إجمالي_الموظفين_العمال_20fc02'), value: total, icon: <Users size={16} /> },
          {
            label: t('auto.النشطون_حاليا_150f59'),
            value: employees.filter((e) => e.isActive).length,
            icon: <Users size={16} />,
            color: 'success',
          },
          { label: t('auto.الفروع_المسجلة_44ec46'), value: branches.length, icon: <Building size={16} /> },
        ]}
      />

      {/* Messages */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Quick Lookup Card */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-heading)', fontWeight: 600 }}>
          <CreditCard size={18} color="#f59e0b" />
          <span>{t('auto.استعلام_سريع_برقم_الهوية_الإ_524b01')}</span>
        </div>

        <form onSubmit={handleIdentityLookup} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input-field"
            placeholder="10xxxxxxxx / 23xxxxxxxx"
            style={{ flex: '1 1 300px' }}
            value={identityLookupQuery}
            onChange={(e) => setIdentityLookupQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" disabled={isSearchingIdentity} style={{ gap: '0.5rem' }}>
            {isSearchingIdentity ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{t('auto.استعلام_27a925')}</span>
          </button>

          {lookupResult && (
            <div
              className="badge badge-success animate-fade-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
              }}
            >
              <span>{t('auto.مطابق_2f22b7')} {lookupResult.name} ({lookupResult.roleType})</span>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
            <Briefcase size={14} color="#f59e0b" />
            <span>{t('employees.profession')}</span>
          </label>
          <select
            className="input-field"
            value={selectedProfession}
            onChange={(e) => {
              setSelectedProfession(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('common.all')}</option>
            <option value="Plasterer">Plasterer</option>
            <option value="Tiler">Tiler</option>
            <option value="Painter">Painter</option>
            <option value="Gypsum Board">Gypsum Board</option>
            <option value="Carpenter">Carpenter</option>
            <option value="Steel Fixer">Steel Fixer</option>
            <option value="Plumber">Plumber</option>
            <option value="Electrician">Electrician</option>
            <option value="Helper">Helper</option>
          </select>
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
            <HardHat size={14} />
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
        <TableSkeleton rows={6} columns={9} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>{t('auto.الاسم_الكود_20cd46')}</th>
                  <th style={{ padding: '1rem' }}>{t('employees.profession')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الوثيقة_رقم_الهوية_21e36e')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الفرع_الأساسي_5b1823')}</th>
                  <th style={{ padding: '1rem' }}>{t('employees.hourly_rate')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الأجر_اليومي_14bd29')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الحالة_252d72')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_يوجد_موظفون_مطابقون_لمعايير_41cbd3')}
                    </td>
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
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {emp.companyEmployeeId || emp.code || 'EMP'} {emp.phone ? `• ${emp.phone}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-secondary" style={{ color: '#f59e0b', fontWeight: 600 }}>
                          {emp.profession || 'Craftsman'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div>{getIdentityBadge(emp)}</div>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1' }}>
                            {emp.identityNumber || (emp as any).nationalId || '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {emp.branchName || '—'}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#f59e0b' }}>
                        {emp.hourlyRate || emp.hourly_rate || Math.round(((emp.dailyWage || 0) / 8.0) * 100) / 100}{' '}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>SAR/hr</span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {emp.dailyWage}{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {emp.isActive ? (
                          <span className="badge badge-success">{t('common.active')}</span>
                        ) : (
                          <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                            {t('common.inactive')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          {/* Project Codes Button */}
                          <button
                            type="button"
                            onClick={() => openProjectCodes(emp)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', color: '#f59e0b' }}
                            title="Project IDs"
                          >
                            <Hash size={14} />
                          </button>

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
                            title={t('common.edit')}
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
                            title={t('common.delete')}
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.موظف_عامل_4750aa')}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('auto.السابق_252abb')}
              </button>
              <span style={{ padding: '0.35rem 0.5rem' }}>{t('auto.صفحة_2ea914')}{page}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                {t('auto.التالي_252ecf')}
              </button>
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

      {/* Per-Project Codes Modal */}
      {viewingProjectCodesEmp && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center p-4 overflow-y-auto"
          style={{ alignItems: 'flex-start' }}
        >
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Hash size={20} color="#f59e0b" />
                  <span>{t('employees.project_employee_id')}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {viewingProjectCodesEmp.name} ({viewingProjectCodesEmp.companyEmployeeId || viewingProjectCodesEmp.code})
                </p>
              </div>
              <button
                onClick={() => setViewingProjectCodesEmp(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* List of current project codes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground">{t('common.all_projects')}</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {projectCodesList.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-3 text-center bg-muted/20 rounded-xl">
                    {t('common.no_data')}
                  </div>
                ) : (
                  projectCodesList.map((pc) => (
                    <div
                      key={pc.id}
                      className="flex items-center justify-between p-2.5 bg-background/80 border border-border/60 rounded-xl text-xs"
                    >
                      <span className="font-semibold text-foreground">{pc.project_name}</span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500">
                        {pc.project_employee_code}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add / Update Project Code Form */}
            <form onSubmit={handleSaveProjectCode} className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-foreground">{t('common.add')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">{t('common.all_projects')} *</label>
                  <select
                    required
                    value={selectedProjectForCode}
                    onChange={(e) => setSelectedProjectForCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs"
                  >
                    <option value="">{t('common.select')}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">{t('employees.project_employee_id')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="PRJ-01-EMP-10"
                    value={customProjectCode}
                    onChange={(e) => setCustomProjectCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingProjectCode}
                  className="px-4 py-1.5 bg-amber-500 text-black font-semibold rounded-lg text-xs hover:bg-amber-400 disabled:opacity-50"
                >
                  {savingProjectCode ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>

            <div className="flex justify-end border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setViewingProjectCodesEmp(null)}
                className="px-4 py-2 bg-muted text-foreground rounded-xl text-xs font-semibold hover:bg-muted/80"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {t('auto.إلغاء_5987b3')}
            </button>
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
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_تعطيل_66e6c4')}{' '}
          <strong style={{ color: 'var(--text-heading)' }}>"{deactivatingEmployee?.name}"</strong>?
        </p>
      </Modal>

      {/* View Assignments Modal */}
      <Modal
        isOpen={!!viewingAssignmentsEmp}
        onClose={() => setViewingAssignmentsEmp(null)}
        title={`Assignments: ${viewingAssignmentsEmp?.name || ''}`}
        icon={<Layers size={22} color="#f59e0b" />}
        maxWidth="md"
        footer={
          <button type="button" onClick={() => setViewingAssignmentsEmp(null)} className="btn btn-secondary">
            {t('auto.إغلاق_59834d')}
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {viewingAssignmentsEmp?.assignments && viewingAssignmentsEmp.assignments.length > 0 ? (
            viewingAssignmentsEmp.assignments.map((a, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{a.projectName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Code: {a.projectCode} • Role: {a.assignedRole}
                  </div>
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                  {a.startDate ? a.startDate.split('T')[0] : '—'}
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1rem' }}>
              {t('auto.لا_توجد_تعيينات_حالية_لهذا_الم_63ad6b')}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};
