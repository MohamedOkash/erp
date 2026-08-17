import React, { useEffect, useState, useCallback } from 'react';
import { costsApi } from '../../api/costs.api';
import type { CostEntry, CostSummaryResponse, CreateCostPayload } from '../../api/costs.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { WheelDatePicker } from '../../components/WheelPicker';
import { useAuth } from '../../contexts/AuthContext';
import {
  DollarSign,
  Plus,
  Calculator,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  HardHat,
  Truck,
  User,
  Lock,
} from 'lucide-react';

export const CostsPage: React.FC = () => {
  const { user } = useAuth();
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [summary, setSummary] = useState<CostSummaryResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const isSingleScoped = Boolean(user?.scopes && user.scopes.length === 1);

  // Set default project if single scoped
  useEffect(() => {
    if (user?.scopes && user.scopes.length === 1 && !selectedProject) {
      setSelectedProject(user.scopes[0].projectId);
    }
  }, [user?.scopes]);

  // Scoped projects list
  const scopedProjects = React.useMemo(() => {
    let list = projects;
    if (user?.scopes && user.scopes.length > 0) {
      const allowedIds = new Set(user.scopes.map((s) => s.projectId));
      list = list.filter((p) => allowedIds.has(p.id));
    }
    if (selectedBranch) {
      list = list.filter((p) => p.branchId === selectedBranch);
    }
    return list;
  }, [projects, user?.scopes, selectedBranch]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAutoLaborModal, setShowAutoLaborModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState<CreateCostPayload>({
    projectId: '',
    branchId: '',
    category: 'material',
    description: '',
    amount: 1000,
    costDate: new Date().toISOString().split('T')[0],
    quantity: 1,
    unitCost: 1000,
  });

  // Labor Auto-calc state
  const [calcFromDate, setCalcFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [calcToDate, setCalcToDate] = useState(new Date().toISOString().split('T')[0]);
  const [calcProjectId, setCalcProjectId] = useState('');

  const loadDependencies = async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        projectsApi.getProjects({ limit: 100 }),
        branchesApi.getBranches({ isActive: true }),
      ]);
      setProjects(pRes.data);
      setBranches(bRes.data);
    } catch {
      // ignore
    }
  };

  const loadCostsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listRes, summaryRes] = await Promise.all([
        costsApi.getCosts({
          page,
          limit,
          projectId: selectedProject || undefined,
          branchId: selectedBranch || undefined,
          category: selectedCategory || undefined,
        }),
        costsApi.getSummary(),
      ]);
      setCosts(listRes.data || []);
      setTotal(listRes.total || (listRes.data ? listRes.data.length : 0));
      setSummary(summaryRes);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات التكاليف');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedProject, selectedBranch, selectedCategory]);

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadCostsData();
  }, [loadCostsData]);

  const openCreateModal = () => {
    setFormData({
      projectId: projects[0]?.id || '',
      branchId: branches[0]?.id || '',
      category: 'material',
      description: '',
      amount: 1000,
      costDate: new Date().toISOString().split('T')[0],
      quantity: 1,
      unitCost: 1000,
    });
    setShowCreateModal(true);
  };

  const handleSaveCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await costsApi.createCost({
        ...formData,
        amount: Number(formData.amount),
        quantity: Number(formData.quantity) || undefined,
        unitCost: Number(formData.unitCost) || undefined,
        projectId: formData.projectId || undefined,
        branchId: formData.branchId || undefined,
      });
      setSuccessMsg('تم تسجيل قيد التكلفة بنجاح');
      setShowCreateModal(false);
      loadCostsData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ قيد التكلفة');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaborAutoCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await costsApi.laborAutoCalculate({
        fromDate: calcFromDate,
        toDate: calcToDate,
        projectId: calcProjectId || undefined,
      });
      setSuccessMsg(`تم احتساب أجور العمالة تلقائيًا: تم إنشاء ${res.calculatedCount} قيد بإجمالي ${res.totalAmount.toLocaleString()} SAR`);
      setShowAutoLaborModal(false);
      loadCostsData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل احتساب أجور العمالة');
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      labor: { label: '👷 أجور عمالة', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
      material: { label: '🧱 مواد وخامات', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
      equipment: { label: '🚜 معدات وآليات', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
      subcontractor: { label: '🤝 مقاولو باطن', bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' },
      overhead: { label: '🏢 مصاريف إدارية', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' },
      other: { label: '📌 أخرى', bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' },
    };
    const c = map[category] || { label: category, bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' };
    return (
      <span className="badge" style={{ background: c.bg, color: c.color }}>
        {c.label}
      </span>
    );
  };

  // Compute summary stats
  const totalCostsAmount = Number(summary?.totalAmount || 0);
  const materialAmount = Number(summary?.byCategory?.find((c) => c.category === 'material')?.totalAmount || 0);
  const laborAmount = Number(summary?.byCategory?.find((c) => c.category === 'labor')?.totalAmount || 0);
  const equipmentSubAmount =
    Number(summary?.byCategory?.find((c) => c.category === 'equipment')?.totalAmount || 0) +
    Number(summary?.byCategory?.find((c) => c.category === 'subcontractor')?.totalAmount || 0);

  const statsItems = [
    {
      label: 'إجمالي التكاليف المسجلة',
      value: `${totalCostsAmount.toLocaleString()} SAR`,
      helper: `${total} قيد محاسبي`,
      icon: <DollarSign size={22} />,
      color: '#34d399',
    },
    {
      label: 'تكاليف المواد والخامات',
      value: `${materialAmount.toLocaleString()} SAR`,
      helper: totalCostsAmount > 0 ? `${Math.round((materialAmount / totalCostsAmount) * 100)}% من الإجمالي` : '0%',
      icon: <Layers size={22} />,
      color: '#60a5fa',
    },
    {
      label: 'أجور العمالة المحتسبة',
      value: `${laborAmount.toLocaleString()} SAR`,
      helper: 'مستخرجة من الحضور الميداني',
      icon: <HardHat size={22} />,
      color: '#f59e0b',
    },
    {
      label: 'المعدات ومقاولو الباطن',
      value: `${equipmentSubAmount.toLocaleString()} SAR`,
      helper: 'آليات ومقاولي تنفيذ',
      icon: <Truck size={22} />,
      color: '#ec4899',
    },
  ];

  const startRecord = costs.length === 0 ? 0 : (page - 1) * limit + 1;
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
            <DollarSign size={26} color="#60a5fa" />
            <span>التكاليف والمصروفات الميدانية</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            إدارة قيود تكاليف المواد، المعدات، ومقاولي الباطن، والاحتساب التلقائي لأجور العمالة من واقع الحضور
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAutoLaborModal(true)}
            className="btn btn-secondary"
            style={{ gap: '0.5rem', borderColor: 'rgba(59, 130, 246, 0.4)' }}
          >
            <Calculator size={18} color="#60a5fa" />
            <span>احتساب أجور العمالة تلقائيًا</span>
          </button>

          <button onClick={openCreateModal} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <Plus size={18} />
            <span>إضافة قيد تكلفة</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && costs.length === 0} />

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} />
              <span>المشروع</span>
            </div>
            {isSingleScoped && (
              <span style={{ fontSize: '10px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Lock size={11} /> نطاق مخصص
              </span>
            )}
          </label>
          <select
            className="input-field"
            value={selectedProject}
            disabled={isSingleScoped}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
            style={isSingleScoped ? { opacity: 0.85, cursor: 'not-allowed', borderColor: 'rgba(139, 92, 246, 0.4)' } : {}}
          >
            {!isSingleScoped && <option value="">كافة المشاريع</option>}
            {scopedProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">الفرع</label>
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
          <label className="form-label">نوع التكلفة</label>
          <select
            className="input-field"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الفئات</option>
            <option value="labor">أجور عمالة (Labor)</option>
            <option value="material">مواد وخامات (Material)</option>
            <option value="equipment">معدات وآليات (Equipment)</option>
            <option value="subcontractor">مقاولو باطن (Subcontractor)</option>
            <option value="overhead">مصاريف إدارية (Overhead)</option>
          </select>
        </div>
      </div>

      {/* Costs Table */}
      {isLoading && costs.length === 0 ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>التاريخ</th>
                  <th style={{ padding: '1rem' }}>الوصف والبيان</th>
                  <th style={{ padding: '1rem' }}>الفئة</th>
                  <th style={{ padding: '1rem' }}>المشروع والفرع</th>
                  <th style={{ padding: '1rem' }}>المبلغ (SAR)</th>
                  <th style={{ padding: '1rem' }}>الكمية × السعر</th>
                  <th style={{ padding: '1rem' }}>المسجِّل / المصدر</th>
                </tr>
              </thead>
              <tbody>
                {costs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      لا توجد قيود تكاليف مسجلة
                    </td>
                  </tr>
                ) : (
                  costs.map((c) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} color="#60a5fa" />
                          <span>{c.costDate ? c.costDate.split('T')[0] : '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{c.description}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>{getCategoryBadge(c.category)}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        <div>{c.projectName || 'عام'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{c.branchName}</div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#34d399' }}>
                        {Number(c.amount).toLocaleString()}{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {c.quantity && c.unitCost ? `${c.quantity} × ${c.unitCost}` : '—'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-secondary" style={{ gap: '0.25rem', fontSize: '0.72rem' }}>
                          <User size={11} />
                          <span>قيد نظامي</span>
                        </span>
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
              عرض {startRecord}–{endRecord} من إجمالي {total} قيد تكلفة
            </span>
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
      )}

      {/* Create Cost Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="إضافة قيد تكلفة جديد"
        icon={<DollarSign size={22} color="#34d399" />}
        maxWidth="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
              إلغاء
            </button>
            <button type="submit" form="create-cost-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>حفظ القيد</span>
            </button>
          </div>
        }
      >
        <form id="create-cost-form" onSubmit={handleSaveCost}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">البيان / الوصف *</label>
              <input
                type="text"
                required
                placeholder="مثال: شراء إسمنت ومواد عزل للموقع"
                className="input-field"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">الفئة *</label>
              <select
                required
                className="input-field"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="material">🧱 مواد وخامات</option>
                <option value="labor">👷 أجور عمالة</option>
                <option value="equipment">🚜 معدات وآليات</option>
                <option value="subcontractor">🤝 مقاول باطن</option>
                <option value="overhead">🏢 مصاريف إدارية</option>
                <option value="other">📌 أخرى</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">التاريخ *</label>
              <WheelDatePicker
                required
                value={formData.costDate}
                onChange={(val) => setFormData({ ...formData, costDate: val })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">المشروع</label>
              <select
                className="input-field"
                value={formData.projectId || ''}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              >
                <option value="">بدون تخصيص مشروع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">الفرع</label>
              <select
                className="input-field"
                value={formData.branchId || ''}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              >
                <option value="">بدون تخصيص فرع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">الكمية</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">سعر الوحدة (SAR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={formData.unitCost || ''}
                onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">المبلغ الإجمالي (SAR) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="input-field"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Labor Auto-Calculate Modal */}
      <Modal
        isOpen={showAutoLaborModal}
        onClose={() => setShowAutoLaborModal(false)}
        title="احتساب أجور العمالة التلقائي"
        icon={<Calculator size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button type="button" onClick={() => setShowAutoLaborModal(false)} className="btn btn-secondary">
              إلغاء
            </button>
            <button type="submit" form="auto-labor-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>تشغيل الاحتساب</span>
            </button>
          </div>
        }
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', marginTop: 0 }}>
          يقوم النظام بحساب تكلفة الأجور تلقائيًا من سجلات الحضور وساعات العمل والإضافي لكل موظف وفق المعادلة المعتمدة.
        </p>

        <form id="auto-labor-form" onSubmit={handleLaborAutoCalculate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">من تاريخ *</label>
              <WheelDatePicker
                required
                value={calcFromDate}
                onChange={(val) => setCalcFromDate(val)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">إلى تاريخ *</label>
              <WheelDatePicker
                required
                value={calcToDate}
                onChange={(val) => setCalcToDate(val)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">المشروع (اختياري)</label>
              <select
                className="input-field"
                value={calcProjectId}
                onChange={(e) => setCalcProjectId(e.target.value)}
              >
                <option value="">كافة المشاريع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
