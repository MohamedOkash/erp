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
import { useI18n } from '../../i18n/I18nContext';
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
  const { t } = useI18n();
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
      setError(err.message || t('auto.فشل_تحميل_بيانات_التكاليف_2f03d1'));
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
      setSuccessMsg(t('auto.تم_تسجيل_قيد_التكلفة_بنجاح_62fd7e'));
      setShowCreateModal(false);
      loadCostsData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_قيد_التكلفة_3ee2b1'));
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
      setError(err.message || t('auto.فشل_احتساب_أجور_العمالة_698eaa'));
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      labor: { label: t('auto.أجور_عمالة_71f0f9'), bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
      material: { label: t('auto.مواد_وخامات_69bfa5'), bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
      equipment: { label: t('auto.معدات_وآليات_29956b'), bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
      subcontractor: { label: t('auto.مقاولو_باطن_28abbd'), bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' },
      overhead: { label: t('auto.مصاريف_إدارية_2a2259'), bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' },
      other: { label: t('auto.أخرى_583aba'), bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' },
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
      label: t('auto.إجمالي_التكاليف_المسجلة_28064a'),
      value: `${totalCostsAmount.toLocaleString()} SAR`,
      helper: `${total} قيد محاسبي`,
      icon: <DollarSign size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.تكاليف_المواد_والخامات_761efd'),
      value: `${materialAmount.toLocaleString()} SAR`,
      helper: totalCostsAmount > 0 ? `${Math.round((materialAmount / totalCostsAmount) * 100)}% من الإجمالي` : '0%',
      icon: <Layers size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.أجور_العمالة_المحتسبة_42914c'),
      value: `${laborAmount.toLocaleString()} SAR`,
      helper: t('auto.مستخرجة_من_الحضور_الميداني_76edd9'),
      icon: <HardHat size={22} />,
      color: '#f59e0b',
    },
    {
      label: t('auto.المعدات_ومقاولو_الباطن_58efe9'),
      value: `${equipmentSubAmount.toLocaleString()} SAR`,
      helper: t('auto.آليات_ومقاولي_تنفيذ_5c45cb'),
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
            <span>{t('finance_reports.costs_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.costs')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAutoLaborModal(true)}
            className="btn btn-secondary"
            style={{ gap: '0.5rem', borderColor: 'rgba(59, 130, 246, 0.4)' }}
          >
            <Calculator size={18} color="#60a5fa" />
            <span>{t('auto.احتساب_أجور_العمالة_تلقائي_ا_5bf301')}</span>
          </button>

          <button onClick={openCreateModal} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <Plus size={18} />
            <span>{t('auto.إضافة_قيد_تكلفة_b41d75')}</span>
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
              <span>{t('auto.المشروع_7f28ee')}</span>
            </div>
            {isSingleScoped && (
              <span style={{ fontSize: '10px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Lock size={11} /> {t('auto.نطاق_مخصص_1b6320')}</span>
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
            {!isSingleScoped && <option value="">{t('auto.كافة_المشاريع_65e01c')}</option>}
            {scopedProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('auto.الفرع_59a3fe')}</label>
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
          <label className="form-label">{t('auto.نوع_التكلفة_669a06')}</label>
          <select
            className="input-field"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الفئات_1a6316')}</option>
            <option value="labor">{t('auto.أجور_عمالة_Labor_3ac192')}</option>
            <option value="material">{t('auto.مواد_وخامات_Material_4f452e')}</option>
            <option value="equipment">{t('auto.معدات_وآليات_Equipment_660891')}</option>
            <option value="subcontractor">{t('auto.مقاولو_باطن_Subcontractor_70a3d2')}</option>
            <option value="overhead">{t('auto.مصاريف_إدارية_Overhead_249198')}</option>
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
                  <th style={{ padding: '1rem' }}>{t('auto.التاريخ_7f54ad')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الوصف_والبيان_7d6019')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الفئة_59a3fc')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المشروع_والفرع_410648')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المبلغ_SAR_dfd932')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الكمية_السعر_5cdcdf')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المسج_ل_المصدر_d1edb2')}</th>
                </tr>
              </thead>
              <tbody>
                {costs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_قيود_تكاليف_مسجلة_1debdf')}</td>
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
                        <div>{c.projectName || t('auto.عام_1820f7')}</div>
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
                          <span>{t('auto.قيد_نظامي_3006ab')}</span>
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.قيد_تكلفة_318bd1')}</span>
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

      {/* Create Cost Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('auto.إضافة_قيد_تكلفة_جديد_522029')}
        icon={<DollarSign size={22} color="#34d399" />}
        maxWidth="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="create-cost-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.حفظ_القيد_262543')}</span>
            </button>
          </div>
        }
      >
        <form id="create-cost-form" onSubmit={handleSaveCost}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">{t('auto.البيان_الوصف_bd6e15')}</label>
              <input
                type="text"
                required
                placeholder={t('auto.مثال_شراء_إسمنت_ومواد_عزل_للمو_237e75')}
                className="input-field"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.الفئة_7f688d')}</label>
              <select
                required
                className="input-field"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="material">{t('auto.مواد_وخامات_69bfa5')}</option>
                <option value="labor">{t('auto.أجور_عمالة_71f0f9')}</option>
                <option value="equipment">{t('auto.معدات_وآليات_29956b')}</option>
                <option value="subcontractor">{t('auto.مقاول_باطن_5c59e5')}</option>
                <option value="overhead">{t('auto.مصاريف_إدارية_2a2259')}</option>
                <option value="other">{t('auto.أخرى_583aba')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.التاريخ_31f58d')}</label>
              <WheelDatePicker
                required
                value={formData.costDate}
                onChange={(val) => setFormData({ ...formData, costDate: val })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.المشروع_7f28ee')}</label>
              <select
                className="input-field"
                value={formData.projectId || ''}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              >
                <option value="">{t('auto.بدون_تخصيص_مشروع_34720d')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.الفرع_59a3fe')}</label>
              <select
                className="input-field"
                value={formData.branchId || ''}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              >
                <option value="">{t('auto.بدون_تخصيص_فرع_6b4ced')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.الكمية_252300')}</label>
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
              <label className="form-label">{t('auto.سعر_الوحدة_SAR_7869ce')}</label>
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
              <label className="form-label">{t('auto.المبلغ_الإجمالي_SAR_2b1289')}</label>
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
        title={t('auto.احتساب_أجور_العمالة_التلقائي_2fff76')}
        icon={<Calculator size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button type="button" onClick={() => setShowAutoLaborModal(false)} className="btn btn-secondary">
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="auto-labor-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.تشغيل_الاحتساب_6088be')}</span>
            </button>
          </div>
        }
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', marginTop: 0 }}>
          {t('auto.يقوم_النظام_بحساب_تكلفة_الأجور_679258')}</p>

        <form id="auto-labor-form" onSubmit={handleLaborAutoCalculate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.من_تاريخ_611b39')}</label>
              <WheelDatePicker
                required
                value={calcFromDate}
                onChange={(val) => setCalcFromDate(val)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.إلى_تاريخ_48a6fe')}</label>
              <WheelDatePicker
                required
                value={calcToDate}
                onChange={(val) => setCalcToDate(val)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.المشروع_اختياري_30dcf0')}</label>
              <select
                className="input-field"
                value={calcProjectId}
                onChange={(e) => setCalcProjectId(e.target.value)}
              >
                <option value="">{t('auto.كافة_المشاريع_65e01c')}</option>
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
