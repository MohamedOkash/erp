import React, { useEffect, useState, useCallback } from 'react';
import { employeesApi } from '../../api/employees.api';
import type { Employee, CreateEmployeePayload, UpdateEmployeePayload } from '../../api/employees.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { EmployeeFormModal } from './EmployeeFormModal';
import { XlsxImportModal } from './XlsxImportModal';
import { Modal } from '../../components/Modal';
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
  Calendar,
  Briefcase,
  Layers,
  X,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
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
      setError(err.message || 'فشل تحميل بيانات الموظفين');
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
      setError(err.message || 'لم يتم العثور على أي موظف بهذا الرقم القومي/الهوية');
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
        setSuccessMsg('تم تحديث بيانات الموظف بنجاح');
      } else {
        await employeesApi.create(payload as CreateEmployeePayload);
        setSuccessMsg('تم إنشاء سجل الموظف الجديد بنجاح');
      }
      setIsFormModalOpen(false);
      loadEmployees();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بيانات الموظف');
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
      setError(err.message || 'فشل تعطيل الموظف');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleExportXlsx = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await employeesApi.exportXlsx();
      setSuccessMsg('تم تصدير ملف الموظفين بنجاح');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تصدير ملف الموظفين');
    } finally {
      setIsExporting(false);
    }
  };

  const getIdentityBadge = (emp: Employee) => {
    const type = emp.identityType || 'national_id';
    switch (type) {
      case 'national_id':
        return <span className="badge badge-primary">هوية وطنية 🇸🇦</span>;
      case 'iqama':
        return <span className="badge badge-secondary">إقامة مقيم</span>;
      case 'passport':
        return <span className="badge badge-accent">جواز سفر</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

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
            <Users size={28} color="#60a5fa" />
            <span>إدارة الموظفين والعمالة</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            سجل القوى العاملة، متابعة الهويات والإقامات، واستيراد وتصدير بيانات الكادر عبر Excel.
          </p>
        </div>

        {/* 3 Action Buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportXlsx}
            className="btn btn-secondary"
            disabled={isExporting}
            style={{ gap: '0.4rem' }}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-secondary"
            style={{ gap: '0.4rem', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
          >
            <UploadCloud size={16} />
            <span>استيراد من Excel</span>
          </button>

          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>إضافة موظف</span>
          </button>
        </div>
      </div>

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
            <span>فحص هوية / إقامة فوري:</span>
          </div>

          <input
            type="text"
            className="input-field"
            style={{ maxWidth: '320px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            placeholder="أدخل رقم الهوية أو الإقامة..."
            value={identityLookupQuery}
            onChange={(e) => setIdentityLookupQuery(e.target.value)}
          />

          <button type="submit" className="btn btn-secondary" disabled={isSearchingIdentity} style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            {isSearchingIdentity ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span>استعلام</span>
          </button>

          {lookupResult && (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: 'auto' }}>
              <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>
                ✓ وُجد: {lookupResult.name} ({lookupResult.roleType}) - {lookupResult.branchName || 'فرع'}
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
            <span>بحث بالاسم أو الكود</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="ابحث..."
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
            <span>الفرع</span>
          </label>
          <select
            className="input-field"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الفروع</option>
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
            <span>الدور الوظيفي</span>
          </label>
          <select
            className="input-field"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الأدوار</option>
            <option value="worker">عامل (Worker)</option>
            <option value="supervisor">مشرف (Supervisor)</option>
            <option value="engineer">مهندس (Engineer)</option>
            <option value="project_manager">مدير مشروع</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">الحالة</label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الحالات</option>
            <option value="true">نشط فقط</option>
            <option value="false">معطل فقط</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>الاسم / الكود</th>
                <th style={{ padding: '1rem' }}>الوثيقة / رقم الهوية</th>
                <th style={{ padding: '1rem' }}>الفرع الأساسي</th>
                <th style={{ padding: '1rem' }}>الدور</th>
                <th style={{ padding: '1rem' }}>الأجر اليومي</th>
                <th style={{ padding: '1rem' }}>الحالة</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل الموظفين...</p>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا يوجد موظفون مطابقون لمعايير البحث
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
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {emp.code || 'بدون كود'} {emp.phone ? `• ${emp.phone}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div>{getIdentityBadge(emp)}</div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          {emp.identityNumber || (emp as any).nationalId || '—'}
                        </span>
                        {emp.identityExpiryDate && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Calendar size={11} />
                            <span>ينتهي: {emp.identityExpiryDate.split('T')[0]}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {emp.branchName || 'غير محدد'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                        {emp.roleType || emp.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {emp.dailyWage}{' '}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR/يوم</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {emp.isActive ? (
                        <span className="badge badge-success">نشط</span>
                      ) : (
                        <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                          معطل
                        </span>
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
                            title="عرض التعيينات"
                          >
                            <Layers size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                          title="تعديل الموظف"
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
                          title="تعطيل / حذف"
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
          <span>إجمالي الموظفين: {total}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              السابق
            </button>
            <span style={{ padding: '0.35rem 0.5rem' }}>صفحة {page}</span>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              disabled={page * limit >= total}
              onClick={() => setPage(page + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      </div>

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
          setSuccessMsg('تم استيراد واعتماد بيانات الموظفين بنجاح!');
          loadEmployees();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={!!deactivatingEmployee}
        onClose={() => setDeactivatingEmployee(null)}
        title="تأكيد تعطيل الموظف"
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
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirmDeactivate}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isDeactivating}
            >
              {isDeactivating ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>تأكيد التعطيل</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          هل أنت متأكد من رغبتك في تعطيل الموظف <strong style={{ color: '#ffffff' }}>"{deactivatingEmployee?.name}"</strong>؟ (Soft Delete - يمكن إعادة تنشيطه لاحقًا).
        </p>
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
            إغلاق
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
                    كود: {a.projectCode} • دور: {a.assignedRole}
                  </div>
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                  منذ {a.startDate ? a.startDate.split('T')[0] : '—'}
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1rem' }}>
              لا توجد تعيينات حالية لهذا الموظف
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};
