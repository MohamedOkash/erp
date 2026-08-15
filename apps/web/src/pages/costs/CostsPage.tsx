import React, { useEffect, useState, useCallback } from 'react';
import { costsApi } from '../../api/costs.api';
import type { CostEntry, CostSummaryResponse, CreateCostPayload } from '../../api/costs.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import {
  DollarSign,
  Plus,
  Calculator,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  PieChart,
  Calendar,
} from 'lucide-react';

export const CostsPage: React.FC = () => {
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
      setCosts(listRes.data);
      setTotal(listRes.total);
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
            <DollarSign size={28} color="#60a5fa" />
            <span>سجل التكاليف والمصروفات</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            إدارة قيود تكاليف المواد، المعدات، ومقاولي الباطن، والاحتساب التلقائي لأجور العمالة من واقع الحضور.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
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

      {/* Summary KPI Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>إجمالي التكاليف المسجلة</span>
              <DollarSign size={18} color="#34d399" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
              {Number(summary.totalAmount).toLocaleString()}{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>SAR</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>توزيع الفئات</span>
              <PieChart size={18} color="#60a5fa" />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {summary.byCategory.slice(0, 3).map((c) => (
                <span key={c.category} className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                  {c.category}: {Number(c.totalAmount).toLocaleString()} SAR
                </span>
              ))}
            </div>
          </div>
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
      <div className="glass-card" style={{ overflow: 'hidden' }}>
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
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل قيود التكاليف...</p>
                  </td>
                </tr>
              ) : costs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
          <span>إجمالي القيود: {total}</span>
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

      {/* Create Cost Modal */}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '540px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem' }}>إضافة قيد تكلفة جديد</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCost}>
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
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={formData.costDate}
                    onChange={(e) => setFormData({ ...formData, costDate: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>حفظ القيد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Labor Auto-Calculate Modal */}
      {showAutoLaborModal && (
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
              <h3 style={{ fontSize: '1.25rem' }}>احتساب أجور العمالة التلقائي</h3>
              <button
                type="button"
                onClick={() => setShowAutoLaborModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              يقوم النظام بحساب تكلفة الأجور تلقائيًا من سجلات الحضور وساعات العمل والإضافي لكل موظف وفق المعادلة المعتمدة.
            </p>

            <form onSubmit={handleLaborAutoCalculate}>
              <div className="form-group">
                <label className="form-label">من تاريخ *</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={calcFromDate}
                  onChange={(e) => setCalcFromDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">إلى تاريخ *</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={calcToDate}
                  onChange={(e) => setCalcToDate(e.target.value)}
                />
              </div>

              <div className="form-group">
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAutoLaborModal(false)} className="btn btn-secondary">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>تشغيل الاحتساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
