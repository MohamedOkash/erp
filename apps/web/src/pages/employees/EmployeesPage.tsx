import React, { useEffect, useState, useCallback } from 'react';
import { employeesApi } from '../../api/employees.api';
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from '../../api/employees.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Briefcase,
  IdCard,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('true');

  // Quick Identity Lookup state
  const [quickIdentity, setQuickIdentity] = useState('');
  const [identityResult, setIdentityResult] = useState<Employee | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateEmployeePayload>({
    name: '',
    identityNumber: '',
    identityType: 'national_id',
    identityExpiryDate: '',
    nationality: 'Saudi',
    roleType: 'worker',
    dailyWage: 200,
    primaryBranchId: '',
    code: '',
    phone: '',
  });

  const loadBranches = async () => {
    try {
      const res = await branchesApi.getBranches({ isActive: true });
      setBranches(res.data);
    } catch {
      // ignore
    }
  };

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await employeesApi.getEmployees({
        page,
        limit,
        search: search.trim() || undefined,
        branchId: selectedBranch || undefined,
        role: selectedRole || undefined,
        isActive: selectedStatus === '' ? undefined : selectedStatus === 'true',
      });
      setEmployees(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات الموظفين');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedBranch, selectedRole, selectedStatus]);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleQuickIdentitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickIdentity.trim()) return;

    setIdentityLoading(true);
    setIdentityError(null);
    setIdentityResult(null);

    try {
      const result = await employeesApi.getEmployeeByIdentity(quickIdentity.trim());
      setIdentityResult(result);
    } catch (err: any) {
      setIdentityError(err.message || 'لم يتم العثور على موظف بهذا الرقم');
    } finally {
      setIdentityLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      identityNumber: '',
      identityType: 'national_id',
      identityExpiryDate: '',
      nationality: 'Saudi',
      roleType: 'worker',
      dailyWage: 200,
      primaryBranchId: branches[0]?.id || '',
      code: '',
      phone: '',
    });
    setShowCreateModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      identityNumber: emp.identityNumber,
      identityType: emp.identityType || 'national_id',
      identityExpiryDate: emp.identityExpiryDate ? emp.identityExpiryDate.split('T')[0] : '',
      nationality: emp.nationality || '',
      roleType: emp.roleType,
      dailyWage: emp.dailyWage,
      primaryBranchId: emp.primaryBranchId || '',
      code: emp.code || '',
      phone: emp.phone || '',
    });
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (editingEmployee) {
        const payload: UpdateEmployeePayload = {
          name: formData.name,
          identityNumber: formData.identityNumber,
          identityType: formData.identityType,
          identityExpiryDate: formData.identityExpiryDate || undefined,
          nationality: formData.nationality || undefined,
          roleType: formData.roleType,
          dailyWage: Number(formData.dailyWage),
          primaryBranchId: formData.primaryBranchId || undefined,
          code: formData.code || undefined,
          phone: formData.phone || undefined,
        };
        await employeesApi.updateEmployee(editingEmployee.id, payload);
        setSuccessMsg('تم تحديث بيانات الموظف بنجاح');
        setEditingEmployee(null);
      } else {
        await employeesApi.createEmployee({
          ...formData,
          dailyWage: Number(formData.dailyWage),
          primaryBranchId: formData.primaryBranchId || undefined,
          identityExpiryDate: formData.identityExpiryDate || undefined,
        });
        setSuccessMsg('تم إضافة الموظف الجديد بنجاح');
        setShowCreateModal(false);
      }
      loadEmployees();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بيانات الموظف');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في إلغاء تفعيل الموظف "${name}"؟`)) {
      return;
    }

    try {
      await employeesApi.deleteEmployee(id);
      setSuccessMsg('تم إلغاء تفعيل الموظف بنجاح');
      loadEmployees();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل إلغاء تفعيل الموظف');
    }
  };

  const getIdentityBadge = (type?: string) => {
    switch (type) {
      case 'iqama':
        return <span className="badge badge-accent">📋 إقامة</span>;
      case 'passport':
        return <span className="badge badge-primary">🛂 جواز</span>;
      default:
        return <span className="badge badge-success">🇸🇦 هوية وطنية</span>;
    }
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      worker: 'عامل تنفيذ',
      engineer: 'مهندس موقع',
      supervisor: 'مشرف تنفيذ',
      project_manager: 'مدير مشروع',
      company_admin: 'مدير شركة',
    };
    return map[role] || role;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header & Quick Action */}
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
            <span>إدارة العمال والموظفين</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            سجل القوى العاملة، وتوطين الهويات (هوية وطنية / إقامة / جواز)، ومتابعة تواريخ الانتهاء والأجور.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Success / Error Alerts */}
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

      {/* Quick Identity Lookup Card */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(17, 29, 56, 0.7) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <IdCard size={20} color="#60a5fa" />
          <h3 style={{ fontSize: '1.05rem' }}>البحث الفوري برقم الهوية أو الإقامة</h3>
        </div>

        <form onSubmit={handleQuickIdentitySearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }} className="input-wrapper">
            <input
              type="text"
              className="input-field"
              placeholder="أدخل رقم الهوية أو الإقامة أو الجواز للبحث الفوري..."
              value={quickIdentity}
              onChange={(e) => setQuickIdentity(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={identityLoading}>
            {identityLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>فحص الهوية</span>
          </button>
        </form>

        {/* Identity Search Result Preview */}
        {identityResult && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{identityResult.name}</span>
                {getIdentityBadge(identityResult.identityType)}
                <span className="badge badge-primary">{getRoleLabel(identityResult.roleType)}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                رقم الهوية: <strong style={{ color: '#fff' }}>{identityResult.identityNumber}</strong> | 
                الفرع: <strong>{identityResult.branchName || 'غير محدد'}</strong> | 
                الأجر اليومي: <strong>{identityResult.dailyWage} SAR</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewingEmployee(identityResult)}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <Eye size={16} />
              <span>عرض التعيينات الكاملة</span>
            </button>
          </div>
        )}

        {identityError && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#f87171' }}>
            ⚠️ {identityError}
          </div>
        )}
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
            <span>بحث بالاسم / الكود</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="ابحث بالاسم أو الكود..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">الفرع التابع</label>
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
          <label className="form-label">الدور الوظيفي</label>
          <select
            className="input-field"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الأدوار</option>
            <option value="worker">عامل تنفيذ</option>
            <option value="supervisor">مشرف تنفيذ</option>
            <option value="engineer">مهندس موقع</option>
            <option value="project_manager">مدير مشروع</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">الحالة</label>
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="true">النشطون فقط</option>
            <option value="false">المعطلون فقط</option>
            <option value="">الكل</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>الموظف / الكود</th>
                <th style={{ padding: '1rem' }}>رقم الهوية / الإقامة</th>
                <th style={{ padding: '1rem' }}>الدور الوظيفي</th>
                <th style={{ padding: '1rem' }}>الفرع</th>
                <th style={{ padding: '1rem' }}>الأجر اليومي</th>
                <th style={{ padding: '1rem' }}>انتهاء الهوية</th>
                <th style={{ padding: '1rem' }}>الحالة</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل البيانات...</p>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد سجلات مطابقة للبحث
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
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {emp.code || 'بدون كود'} {emp.phone && `• ${emp.phone}`}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.identityNumber}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
                        {getIdentityBadge(emp.identityType)}
                        {emp.nationality && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            ({emp.nationality})
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge badge-primary">{getRoleLabel(emp.roleType)}</span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {emp.branchName || 'غير محدد'}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {emp.dailyWage} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {emp.identityExpiryDate ? (
                        <span>{emp.identityExpiryDate.split('T')[0]}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
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
                        <button
                          type="button"
                          onClick={() => setViewingEmployee(emp)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                          title="تفاصيل التعيين"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                          title="تعديل"
                        >
                          <Edit2 size={15} />
                        </button>
                        {emp.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.2)',
                            }}
                            title="إلغاء تفعيل"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
          <span>إجمالي السجلات: {total}</span>
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

      {/* Create / Edit Modal */}
      {(showCreateModal || editingEmployee) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '600px',
              padding: '2rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem' }}>
                {editingEmployee ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEmployee(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="مثال: أحمد محمد علي"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">نوع الهوية *</label>
                  <select
                    className="input-field"
                    value={formData.identityType}
                    onChange={(e) => setFormData({ ...formData, identityType: e.target.value as any })}
                  >
                    <option value="national_id">🇸🇦 هوية وطنية</option>
                    <option value="iqama">📋 إقامة</option>
                    <option value="passport">🛂 جواز سفر</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">رقم الهوية / الإقامة *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="رقم الهوية الفريد..."
                    value={formData.identityNumber}
                    onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الجنسية</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="مثال: Saudi, Egyptian, Pakistani"
                    value={formData.nationality || ''}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ انتهاء الهوية/الإقامة</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.identityExpiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, identityExpiryDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الدور الوظيفي *</label>
                  <select
                    className="input-field"
                    value={formData.roleType}
                    onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                  >
                    <option value="worker">عامل تنفيذ</option>
                    <option value="supervisor">مشرف تنفيذ</option>
                    <option value="engineer">مهندس موقع</option>
                    <option value="project_manager">مدير مشروع</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">الأجر اليومي (SAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field"
                    value={formData.dailyWage}
                    onChange={(e) => setFormData({ ...formData, dailyWage: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الفرع التابع</label>
                  <select
                    className="input-field"
                    value={formData.primaryBranchId || ''}
                    onChange={(e) => setFormData({ ...formData, primaryBranchId: e.target.value })}
                  >
                    <option value="">بدون فرع رئيسي</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">كود الموظف</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="مثال: WRK-01"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">رقم الهاتف</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="05xxxxxxxx"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEmployee(null);
                  }}
                  className="btn btn-secondary"
                  disabled={isSaving}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>{editingEmployee ? 'حفظ التعديلات' : 'إضافة الموظف'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Assignments Modal */}
      {viewingEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
        >
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '540px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>{viewingEmployee.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  رقم الهوية: {viewingEmployee.identityNumber} ({viewingEmployee.roleType})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingEmployee(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Briefcase size={16} color="#60a5fa" />
              <span>التعيينات النشطة في المشاريع</span>
            </h4>

            {viewingEmployee.assignments && viewingEmployee.assignments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {viewingEmployee.assignments.map((a) => (
                  <div
                    key={a.projectId}
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{a.projectName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                      الكود: {a.projectCode} • الدور: {a.assignedRole} • بدء التعيين: {a.startDate}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem' }}>
                لا توجد تعيينات نشطة مسجلة لهذا الموظف حاليًا.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setViewingEmployee(null)} className="btn btn-secondary">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
