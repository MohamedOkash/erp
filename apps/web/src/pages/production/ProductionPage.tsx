import React, { useEffect, useState, useCallback } from 'react';
import { productionApi } from '../../api/production.api';
import type { ProductionRecord } from '../../api/production.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { workItemsApi } from '../../api/work-items.api';
import type { WorkItem } from '../../api/work-items.api';
import { workAreasApi } from '../../api/work-areas.api';
import type { WorkArea } from '../../api/work-areas.api';
import { employeesApi } from '../../api/employees.api';
import type { Employee } from '../../api/employees.api';
import { ProductionFormModal } from './ProductionFormModal';
import { ProductionDetailView } from './ProductionDetailView';
import { CorrectionFormModal } from './CorrectionFormModal';
import { XlsxProductionImportModal } from './XlsxProductionImportModal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { WheelDatePicker } from '../../components/WheelPicker';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Eye,
  Users,
  Download,
  UploadCloud,
  TrendingUp,
  ShieldCheck,
  Clock,
  Lock,
} from 'lucide-react';

export const ProductionPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
  const [supervisors, setSupervisors] = useState<Employee[]>([]);
  const [workers, setWorkers] = useState<Employee[]>([]);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<ProductionRecord | null>(null);
  const [correctingRecord, setCorrectingRecord] = useState<ProductionRecord | null>(null);

  const loadDependencies = async () => {
    try {
      const [bRes, pRes, wRes, aRes, eRes] = await Promise.all([
        branchesApi.list({ isActive: true, limit: 100 }),
        projectsApi.list({ limit: 100 }),
        workItemsApi.list({ limit: 100, isActive: true }),
        workAreasApi.list({ limit: 100 }),
        employeesApi.list({ limit: 100, isActive: true }),
      ]);

      setBranches(bRes.data);
      setProjects(pRes.data);
      setWorkItems(wRes.data);
      setWorkAreas(aRes.data);

      const allEmps = eRes.data;
      const sups = allEmps.filter((e) => e.roleType === 'supervisor' || e.role === 'supervisor');
      setSupervisors(sups.length > 0 ? sups : allEmps);

      const wrks = allEmps.filter((e) => e.roleType === 'worker' || e.role === 'worker');
      setWorkers(wrks.length > 0 ? wrks : allEmps);
    } catch {
      // ignore
    }
  };

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await productionApi.list({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        branchId: selectedBranch || undefined,
        projectId: selectedProject || undefined,
        status: selectedStatus || undefined,
        search: search.trim() || undefined,
      });
      setRecords(res.data);
      setTotal(res.total);
      setViewingRecord((prev) => (prev ? res.data.find((r) => r.id === prev.id) || prev : null));
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_سجلات_الإنتاج_اليومي_1a4ccc'));
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, selectedBranch, selectedProject, selectedStatus, search]);

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleExportXlsx = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await productionApi.exportXlsx();
      setSuccessMsg(t('auto.تم_تصدير_ملف_إنتاجية_الإكسيل_ب_e3b068'));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تصدير_ملف_الإنتاجية_6425b1'));
    } finally {
      setIsExporting(false);
    }
  };

  const isSingleScoped = Boolean(user?.scopes && user.scopes.length === 1);

  // Set default project if user is scoped to a single project
  useEffect(() => {
    if (user?.scopes && user.scopes.length === 1 && !selectedProject) {
      setSelectedProject(user.scopes[0].projectId);
    }
  }, [user?.scopes]);

  // Filter projects by branch and user scopes in the page filter
  const branchProjects = React.useMemo(() => {
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

  // Compute summary stats
  const finalApprovedCount = records.filter((r) => r.status === 'final_approved').length;
  const pendingCount = records.filter(
    (r) => r.status === 'submitted' || r.status === 'supervisor_approved' || r.status === 'engineer_approved',
  ).length;
  const totalActual = records.reduce((acc, r) => acc + (Number(r.actualQuantity) || 0), 0);
  const totalTarget = records.reduce((acc, r) => acc + (Number(r.targetQuantity) || 0), 0);
  const avgCompletion = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  const statsItems = [
    {
      label: t('auto.إجمالي_السجلات_الشهر_3fdbcb'),
      value: total,
      helper: `${records.length} مسجلة حالياً`,
      icon: <Layers size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.متوسط_نسبة_الإنجاز_1204e8'),
      value: `${avgCompletion}%`,
      helper: `${totalActual.toLocaleString()} / ${totalTarget.toLocaleString()} وحدة`,
      icon: <TrendingUp size={22} />,
      color: avgCompletion >= 80 ? '#34d399' : '#f59e0b',
    },
    {
      label: t('auto.معتمد_نهائيا_ومغلق_7091aa'),
      value: finalApprovedCount,
      helper: t('auto.جاهز_للحسابات_والحوافز_74aa50'),
      icon: <ShieldCheck size={22} />,
      color: '#10b981',
    },
    {
      label: t('auto.بانتظار_الاعتماد_9ee1aa'),
      value: pendingCount,
      helper: `${records.filter((r) => r.status === 'draft').length} مسودة`,
      icon: <Clock size={22} />,
      color: '#fbbf24',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-secondary">{t('auto.مسودة_Draft_f72705')}</span>;
      case 'submitted':
        return <span className="badge badge-accent">{t('auto.مقدم_Submitted_3e7c5c')}</span>;
      case 'supervisor_approved':
        return (
          <span className="badge badge-primary" style={{ background: 'rgba(217, 119, 6, 0.2)', color: '#fbbf24' }}>
            {t('auto.معتمد_مشرف_464ae0')}</span>
        );
      case 'engineer_approved':
        return (
          <span className="badge badge-primary" style={{ background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' }}>
            {t('auto.معتمد_مهندس_7cf7d5')}</span>
        );
      case 'final_approved':
        return <span className="badge badge-success">{t('auto.معتمد_نهائي_ا_5a4613')}</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const getRatioBadge = (actual: number, target: number) => {
    const safeTarget = target > 0 ? target : 1;
    const ratio = Math.round((actual / safeTarget) * 100);

    let color = '#34d399'; // Green > 100%
    let bg = 'rgba(16, 185, 129, 0.15)';

    if (ratio >= 80 && ratio <= 100) {
      color = '#60a5fa'; // Blue 80-100%
      bg = 'rgba(37, 99, 235, 0.15)';
    } else if (ratio < 80) {
      color = '#f87171'; // Red < 80%
      bg = 'rgba(239, 68, 68, 0.15)';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.5rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontWeight: 700,
          background: bg,
          color: color,
        }}
      >
        {ratio}%
      </span>
    );
  };

  const paginatedRecords = records.slice((page - 1) * limit, page * limit);
  const startRecord = records.length === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, records.length);

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
            <Layers size={26} color="#60a5fa" />
            <span>{t('operations.production_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.production')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={isExporting || records.length === 0}
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
            onClick={() => setIsFormModalOpen(true)}
            className="btn btn-primary"
            style={{ gap: '0.4rem' }}
          >
            <Plus size={16} />
            <span>{t('operations.record_production')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && records.length === 0} />

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Search size={14} />
            <span>{t('auto.بحث_بند_مشروع_مشرف_76f259')}</span>
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
            <Calendar size={14} />
            <span>{t('auto.من_تاريخ_4c8e03')}</span>
          </label>
          <WheelDatePicker
            placeholder={t('auto.من_تاريخ_3db437')}
            value={fromDate}
            onChange={(val) => {
              setFromDate(val);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Calendar size={14} />
            <span>{t('auto.إلى_تاريخ_d3e6d7')}</span>
          </label>
          <WheelDatePicker
            placeholder={t('auto.إلى_تاريخ_33c707')}
            value={toDate}
            onChange={(val) => {
              setToDate(val);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('auto.الفرع_59a3fe')}</label>
          <select
            className="input-field"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setSelectedProject('');
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
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t('auto.المشروع_7f28ee')}</span>
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
            {branchProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Filter size={14} />
            <span>{t('auto.حالة_الاعتماد_6243e3')}</span>
          </label>
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الحالات_3318a9')}</option>
            <option value="draft">{t('auto.مسودة_Draft_f72705')}</option>
            <option value="submitted">{t('auto.مقدم_Submitted_3e7c5c')}</option>
            <option value="supervisor_approved">{t('auto.معتمد_مشرف_464ae0')}</option>
            <option value="engineer_approved">{t('auto.معتمد_مهندس_7cf7d5')}</option>
            <option value="final_approved">{t('auto.معتمد_نهائي_ا_5187ee')}</option>
          </select>
        </div>
      </div>

      {/* Production Table */}
      {isLoading && records.length === 0 ? (
        <TableSkeleton rows={6} columns={10} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          {/* Desktop Table View */}
          <div className="desktop-table-view table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>{t('auto.التاريخ_7f54ad')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المشروع_الفرع_45c129')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.البند_والمرحلة_6d447a')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.النوع_والفريق_27ce8e')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المستهدف_660633')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الفعلي_252416')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.نسبة_الإنجاز_3259d2')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المشرف_25225a')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الحالة_252d72')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_سجلات_إنتاجية_مطابقة_ل_6534d4')}</td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                          <Calendar size={13} color="#60a5fa" />
                          <span>{rec.date ? rec.date.split('T')[0] : '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{rec.projectName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {rec.branchName || t('auto.فرع_184029')} {rec.workAreaName ? `• ${rec.workAreaName}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{rec.workItemName}</div>
                        {rec.stageName && (
                          <div style={{ fontSize: '0.72rem', color: '#60a5fa' }}>
                            {rec.stageName} {rec.stagePercentage ? `(${rec.stagePercentage}%)` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {rec.productionType === 'team' ? (
                          <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                            <Users size={11} /> {t('auto.فريق_6319f5')}{rec.teamCode || 'Team'})
                          </span>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                            {t('auto.فردي_625775')}{rec.workers?.length || 0} {t('auto.عمال_5aa1b4')}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{rec.targetQuantity}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#60a5fa' }}>{rec.actualQuantity}</td>
                      <td style={{ padding: '1rem' }}>{getRatioBadge(Number(rec.actualQuantity), Number(rec.targetQuantity))}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {rec.supervisorName || '—'}
                      </td>
                      <td style={{ padding: '1rem' }}>{getStatusBadge(rec.status)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setViewingRecord(rec)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', gap: '0.35rem' }}
                          title={t('auto.عرض_التفاصيل_ومسار_الاعتماد_3e24f0')}
                        >
                          <Eye size={14} color="#60a5fa" />
                          <span>{t('auto.عرض_18221e')}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (<=768px) */}
          <div className="mobile-cards-view" style={{ padding: '0.75rem' }}>
            {paginatedRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {t('auto.لا_توجد_سجلات_إنتاجية_مطابقة_ل_6534d4')}</div>
            ) : (
              paginatedRecords.map((rec) => (
                <div key={rec.id} className="mobile-record-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700 }}>
                      <Calendar size={14} color="#60a5fa" />
                      <span>{rec.date ? rec.date.split('T')[0] : '—'}</span>
                    </div>
                    <div>{getStatusBadge(rec.status)}</div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)' }}>{rec.projectName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rec.workItemName} {rec.stageName ? `• ${rec.stageName}` : ''}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-surface-elevated)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t('auto.الفعلي_المستهدف_761eb1')}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--brand-primary)' }}>{rec.actualQuantity} / {rec.targetQuantity}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t('auto.نسبة_الإنجاز_3259d2')}</div>
                      <div>{getRatioBadge(Number(rec.actualQuantity), Number(rec.targetQuantity))}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingRecord(rec)}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', gap: '0.4rem', justifyContent: 'center' }}
                  >
                    <Eye size={15} color="#60a5fa" />
                    <span>{t('auto.عرض_التفاصيل_والاعتماد_32eb6a')}</span>
                  </button>
                </div>
              ))
            )}
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.سجل_إنتاجية_331abe')}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('auto.السابق_252abb')}</button>
              <span style={{ padding: '0.35rem 0.5rem' }}>
                {t('auto.صفحة_2ea914')}{page} {t('auto.من_c8a1')}{Math.ceil(total / limit) || 1}
              </span>
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

      {/* Production Form Modal */}
      <ProductionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(t('auto.تم_تسجيل_تقرير_الإنتاجية_بنجاح_4cd4f0'));
          loadRecords();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
        branches={branches}
        projects={projects}
        workItems={workItems}
        workAreas={workAreas}
        supervisors={supervisors}
        workers={workers}
      />

      {/* Production Detail View Modal (Single Clean Instance) */}
      {viewingRecord && (
        <ProductionDetailView
          key={viewingRecord.id}
          isOpen={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
          record={viewingRecord}
          onRecordUpdated={() => {
            loadRecords();
          }}
          onRequestCorrection={(rec) => {
            setCorrectingRecord(rec);
          }}
        />
      )}

      {/* Correction Form Modal */}
      {correctingRecord && (
        <CorrectionFormModal
          key={correctingRecord.id}
          isOpen={!!correctingRecord}
          onClose={() => setCorrectingRecord(null)}
          onSuccess={() => {
            setSuccessMsg(t('auto.تم_تقديم_طلب_التصحيح_بنجاح_2e852b'));
            loadRecords();
            setTimeout(() => setSuccessMsg(null), 4000);
          }}
          record={correctingRecord}
        />
      )}

      {/* XLSX Production Import Modal */}
      <XlsxProductionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(t('auto.تم_استيراد_واعتماد_سجلات_الإنت_934aa9'));
          loadRecords();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};
