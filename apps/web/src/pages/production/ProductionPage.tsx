import React, { useEffect, useState, useCallback } from 'react';
import { productionApi } from '../../api/production.api';
import type { ProductionRecord, CreateProductionPayload, ProductionWorkerItem } from '../../api/production.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { workItemsApi } from '../../api/work-items.api';
import type { WorkItem } from '../../api/work-items.api';
import { employeesApi } from '../../api/employees.api';
import type { Employee } from '../../api/employees.api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Layers,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Send,
  ShieldCheck,
  Compass,
  HardHat,
  RotateCcw,
  Calendar,
} from 'lucide-react';

export const ProductionPage: React.FC = () => {
  const { hasRole } = useAuth();

  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workersList, setWorkersList] = useState<Employee[]>([]);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<ProductionRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState<{
    branchId: string;
    projectId: string;
    workItemId: string;
    date: string;
    productionType: 'individual' | 'crew' | 'mixed';
    actualQuantity: number;
    targetQuantity: number;
    supervisorId: string;
    notes: string;
    workers: ProductionWorkerItem[];
  }>({
    branchId: '',
    projectId: '',
    workItemId: '',
    date: new Date().toISOString().split('T')[0],
    productionType: 'individual',
    actualQuantity: 100,
    targetQuantity: 100,
    supervisorId: '',
    notes: '',
    workers: [],
  });

  // Correction Form State
  const [correctionDelta, setCorrectionDelta] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  const loadDependencies = async () => {
    try {
      const [bRes, pRes, wRes, eRes] = await Promise.all([
        branchesApi.getBranches({ isActive: true }),
        projectsApi.getProjects({ limit: 100 }),
        workItemsApi.getWorkItems({ isActive: true }),
        employeesApi.getEmployees({ limit: 100, isActive: true }),
      ]);
      setBranches(bRes.data);
      setProjects(pRes.data);
      setWorkItems(wRes.data);
      setWorkersList(eRes.data);
    } catch {
      // ignore
    }
  };

  const loadProduction = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await productionApi.getProductionRecords({
        page,
        limit,
        projectId: selectedProject || undefined,
        branchId: selectedBranch || undefined,
        status: selectedStatus || undefined,
      });
      setRecords(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل سجلات الإنتاجية');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedProject, selectedBranch, selectedStatus]);

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadProduction();
  }, [loadProduction]);

  const openCreateModal = () => {
    const defaultBranch = branches[0]?.id || '';
    const defaultProject = projects[0]?.id || '';
    const defaultWorkItem = workItems[0]?.id || '';
    const supervisors = workersList.filter((e) => e.roleType === 'supervisor');
    const defaultSupervisor = supervisors[0]?.id || workersList[0]?.id || '';
    const firstWorker = workersList[0]?.id || '';

    setFormData({
      branchId: defaultBranch,
      projectId: defaultProject,
      workItemId: defaultWorkItem,
      date: new Date().toISOString().split('T')[0],
      productionType: 'individual',
      actualQuantity: 100,
      targetQuantity: 100,
      supervisorId: defaultSupervisor,
      notes: '',
      workers: firstWorker ? [{ employeeId: firstWorker, workerType: 'individual', individualQuantity: 100, hoursWorked: 8 }] : [],
    });
    setShowCreateModal(true);
  };

  const addWorkerRow = () => {
    if (workersList.length === 0) return;
    setFormData({
      ...formData,
      workers: [
        ...formData.workers,
        { employeeId: workersList[0].id, workerType: 'individual', individualQuantity: 0, hoursWorked: 8 },
      ],
    });
  };

  const removeWorkerRow = (index: number) => {
    const updated = formData.workers.filter((_, i) => i !== index);
    setFormData({ ...formData, workers: updated });
  };

  const handleSaveProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Rule R5: total worker quantities must equal actualQuantity
    const workersSum = formData.workers.reduce((acc, w) => acc + (Number(w.individualQuantity) || 0), 0);
    if (formData.productionType === 'individual' && workersSum !== Number(formData.actualQuantity)) {
      setError(`خطأ في قاعدة العمل R5: مجموع كميات العمال (${workersSum}) لا يطابق إجمالي كمية السجل (${formData.actualQuantity})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProductionPayload = {
        branchId: formData.branchId,
        projectId: formData.projectId,
        workItemId: formData.workItemId,
        date: formData.date,
        productionType: formData.productionType,
        actualQuantity: Number(formData.actualQuantity),
        targetQuantity: Number(formData.targetQuantity),
        supervisorId: formData.supervisorId,
        notes: formData.notes || undefined,
        workers: formData.workers.map((w) => ({
          employeeId: w.employeeId,
          workerType: w.workerType || 'individual',
          individualQuantity: Number(w.individualQuantity) || 0,
          hoursWorked: Number(w.hoursWorked) || 8,
        })),
      };

      await productionApi.createProductionRecord(payload);
      setSuccessMsg('تم تسجيل تقرير الإنتاجية بنجاح بحالة مسودة (draft)');
      setShowCreateModal(false);
      loadProduction();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل تقرير الإنتاج');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveStep = async (record: ProductionRecord, step: 'submit' | 'supervisor' | 'engineer' | 'final') => {
    try {
      await productionApi.approveStep(record.id, step);
      setSuccessMsg(`تم ترقية واعتماد السجل بنجاح`);
      loadProduction();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل اعتماد السجل');
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionRecord) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await productionApi.createCorrection(correctionRecord.id, {
        type: 'quantity_adjust',
        delta: Number(correctionDelta),
        reason: correctionReason,
      });
      setSuccessMsg('تم تقديم طلب التصحيح بنجاح');
      setCorrectionRecord(null);
      loadProduction();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تقديم طلب التصحيح');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-secondary">مسودة (Draft)</span>;
      case 'submitted':
        return <span className="badge badge-accent">مقدم (Submitted)</span>;
      case 'supervisor_approved':
        return <span className="badge badge-primary">معتمد مشرف</span>;
      case 'engineer_approved':
        return <span className="badge badge-primary" style={{ background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' }}>معتمد مهندس</span>;
      case 'final_approved':
        return <span className="badge badge-success">✓ معتمد نهائيًا ومغلق</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
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
            <Layers size={28} color="#60a5fa" />
            <span>الإنتاجية اليومية ودورة الاعتماد</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            تسجيل الإنجاز اليومي وتوزيع حصص العمال (R5) مع مسار الاعتماد الصارم (مشرف ← مهندس ← مدير).
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>تسجيل إنتاج جديد</span>
        </button>
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

      {/* Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Filter size={14} />
            <span>المشروع</span>
          </label>
          <select
            className="input-field"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة المشاريع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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
          <label className="form-label">مرحلة الاعتماد</label>
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الحالات</option>
            <option value="draft">مسودة (Draft)</option>
            <option value="submitted">مقدم (Submitted)</option>
            <option value="supervisor_approved">معتمد مشرف</option>
            <option value="engineer_approved">معتمد مهندس</option>
            <option value="final_approved">معتمد نهائيًا</option>
          </select>
        </div>
      </div>

      {/* Production Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>التاريخ</th>
                <th style={{ padding: '1rem' }}>المشروع / البند</th>
                <th style={{ padding: '1rem' }}>المستهدف</th>
                <th style={{ padding: '1rem' }}>الفعلي</th>
                <th style={{ padding: '1rem' }}>النسبة (R1)</th>
                <th style={{ padding: '1rem' }}>المشرف</th>
                <th style={{ padding: '1rem' }}>الحالة</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>إجراءات الاعتماد</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل سجلات الإنتاج...</p>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد سجلات إنتاجية مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const target = Number(rec.targetQuantity) || 1;
                  const actual = Number(rec.actualQuantity) || 0;
                  const ratio = ((actual / target) * 100).toFixed(0);

                  return (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} color="#60a5fa" />
                          <span>{rec.date ? rec.date.split('T')[0] : '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{rec.workItemName || 'بند عمل'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          {rec.projectName} ({rec.branchName})
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {rec.targetQuantity}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#60a5fa' }}>
                        {rec.actualQuantity}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          className="badge"
                          style={{
                            background: Number(ratio) >= 100 ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
                            color: Number(ratio) >= 100 ? 'var(--status-success)' : 'var(--status-warning)',
                          }}
                        >
                          {ratio}%
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {rec.supervisorName || '—'}
                      </td>
                      <td style={{ padding: '1rem' }}>{getStatusBadge(rec.status)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {/* Sequential Approval Action based on strict state machine */}
                        <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {rec.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleApproveStep(rec, 'submit')}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem' }}
                            >
                              <Send size={12} />
                              <span>تقديم (Submit)</span>
                            </button>
                          )}

                          {rec.status === 'submitted' && hasRole(['supervisor', 'super_admin', 'company_admin']) && (
                            <button
                              type="button"
                              onClick={() => handleApproveStep(rec, 'supervisor')}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem', background: '#d97706' }}
                            >
                              <HardHat size={12} />
                              <span>اعتماد المشرف</span>
                            </button>
                          )}

                          {rec.status === 'supervisor_approved' && hasRole(['engineer', 'super_admin', 'company_admin']) && (
                            <button
                              type="button"
                              onClick={() => handleApproveStep(rec, 'engineer')}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem', background: '#0284c7' }}
                            >
                              <Compass size={12} />
                              <span>اعتماد المهندس</span>
                            </button>
                          )}

                          {rec.status === 'engineer_approved' && hasRole(['company_admin', 'admin', 'super_admin']) && (
                            <button
                              type="button"
                              onClick={() => handleApproveStep(rec, 'final')}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem', background: '#059669' }}
                            >
                              <ShieldCheck size={12} />
                              <span>اعتماد نهائي</span>
                            </button>
                          )}

                          {rec.status === 'final_approved' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCorrectionRecord(rec);
                                setCorrectionDelta(0);
                                setCorrectionReason('');
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem' }}
                              title="طلب تصحيح للسجل المغلق"
                            >
                              <RotateCcw size={12} />
                              <span>تصحيح</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Create Production Modal */}
      {showCreateModal && (
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
              maxWidth: '680px',
              padding: '2rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem' }}>تسجيل تقرير إنتاجية يومية جديد</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduction}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">الفرع *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  >
                    <option value="">اختر الفرع...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">المشروع *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  >
                    <option value="">اختر المشروع...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">بند العمل *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.workItemId}
                    onChange={(e) => setFormData({ ...formData, workItemId: e.target.value })}
                  >
                    <option value="">اختر بند العمل...</option>
                    {workItems.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.unitSymbol || 'وحدة'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">المشرف المسؤول *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.supervisorId}
                    onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
                  >
                    <option value="">اختر المشرف...</option>
                    {workersList.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.roleType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">التاريخ *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">نوع الإنتاجية *</label>
                  <select
                    className="input-field"
                    value={formData.productionType}
                    onChange={(e) => setFormData({ ...formData, productionType: e.target.value as any })}
                  >
                    <option value="individual">فردي (حسب إنجاز كل عامل)</option>
                    <option value="crew">فريق عمل جماعي</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">الكمية المستهدفة *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input-field"
                    value={formData.targetQuantity}
                    onChange={(e) => setFormData({ ...formData, targetQuantity: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الكمية الفعلية المنفذة *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input-field"
                    value={formData.actualQuantity}
                    onChange={(e) => setFormData({ ...formData, actualQuantity: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Workers Allocation Section (R5) */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem' }}>توزيع العمال المشاركين (R5)</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      مجموع كميات العمال يجب أن يساوي الكمية الفعلية ({formData.actualQuantity})
                    </span>
                  </div>
                  <button type="button" onClick={addWorkerRow} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                    <Plus size={14} />
                    <span>إضافة عامل</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {formData.workers.map((w, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.6)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <select
                        className="input-field"
                        value={w.employeeId}
                        onChange={(e) => {
                          const updated = [...formData.workers];
                          updated[idx].employeeId = e.target.value;
                          setFormData({ ...formData, workers: updated });
                        }}
                      >
                        {workersList.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.code || 'بدون كود'})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        placeholder="الكمية"
                        className="input-field"
                        value={w.individualQuantity}
                        onChange={(e) => {
                          const updated = [...formData.workers];
                          updated[idx].individualQuantity = Number(e.target.value);
                          setFormData({ ...formData, workers: updated });
                        }}
                      />

                      <input
                        type="number"
                        min="1"
                        max="24"
                        placeholder="الساعات"
                        className="input-field"
                        value={w.hoursWorked}
                        onChange={(e) => {
                          const updated = [...formData.workers];
                          updated[idx].hoursWorked = Number(e.target.value);
                          setFormData({ ...formData, workers: updated });
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => removeWorkerRow(idx)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.3rem' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>تسجيل التقرير</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionRecord && (
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>طلب تعديل / تصحيح إنتاج مغلق</h3>
              <button
                type="button"
                onClick={() => setCorrectionRecord(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              السجل معتمد نهائيًا ومغلق. التصحيح يضاف كقيد إضافي (Additive Correction) بعد الاعتماد.
            </p>

            <form onSubmit={handleSaveCorrection}>
              <div className="form-group">
                <label className="form-label">فارق الكمية (Delta Quantity) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="مثال: +5 أو -3"
                  className="input-field"
                  value={correctionDelta}
                  onChange={(e) => setCorrectionDelta(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">سبب طلب التصحيح *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="يرجى ذكر سبب التعديل بالتفصيل..."
                  className="input-field"
                  style={{ resize: 'vertical' }}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setCorrectionRecord(null)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>تقديم طلب التصحيح</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
