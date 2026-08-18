import { useI18n } from '../../i18n/I18nContext';
import React, { useEffect, useState, useCallback } from 'react';
import {
  reportsApi,
  type SavedReportItem,
  type CreateSavedReportPayload,
  type RunReportResult,
} from '../../api/reports.api';
import { projectsApi, type Project } from '../../api/projects.api';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import {
  FileSpreadsheet,
  Plus,
  Play,
  Share2,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  Globe,
  Lock,
} from 'lucide-react';

export const SavedReportsPage: React.FC = () => {
  const { t } = useI18n();
  const [reports, setReports] = useState<SavedReportItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create / Edit Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingReport, setEditingReport] = useState<SavedReportItem | null>(null);
  const [formData, setFormData] = useState<CreateSavedReportPayload>({
    name: '',
    reportType: 'production',
    filters: {},
    isPublic: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Run Report Modal
  const [runningReport, setRunningReport] = useState<SavedReportItem | null>(null);
  const [runResult, setRunResult] = useState<RunReportResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Share Modal
  const [sharingReport, setSharingReport] = useState<SavedReportItem | null>(null);
  const [shareUserIdsText, setShareUserIdsText] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  // Delete Modal
  const [deletingReport, setDeletingReport] = useState<SavedReportItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getProjects({ limit: 100 });
      setProjects(res.data);
    } catch {
      // ignore
    }
  };

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await reportsApi.list({
        page,
        limit,
        reportType: typeFilter || undefined,
      });
      setReports(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_التقارير_المحفوظة_514333'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, typeFilter]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleOpenCreate = () => {
    setEditingReport(null);
    setFormData({
      name: '',
      reportType: 'production',
      filters: {},
      isPublic: true,
    });
    setShowReportModal(true);
  };

  const handleOpenEdit = (rep: SavedReportItem) => {
    setEditingReport(rep);
    const cfg = typeof rep.query_config === 'string' ? JSON.parse(rep.query_config) : rep.query_config || {};
    setFormData({
      name: rep.name,
      reportType: rep.report_type,
      filters: cfg.filters || {},
      isPublic: rep.is_public,
    });
    setShowReportModal(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(t('auto.اسم_التقرير_مطلوب_4ba927'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingReport) {
        await reportsApi.update(editingReport.id, formData);
        setSuccessMsg(t('auto.تم_تحديث_التقرير_المحفوظ_بنجاح_d8ba6d'));
      } else {
        await reportsApi.create(formData);
        setSuccessMsg(t('auto.تم_إنشاء_وحفظ_التقرير_الجديد_ب_41a726'));
      }
      setShowReportModal(false);
      loadReports();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_التقرير_38ecdd'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunReport = async (rep: SavedReportItem) => {
    setRunningReport(rep);
    setRunResult(null);
    setIsRunning(true);
    setError(null);
    try {
      const res = await reportsApi.run(rep.id);
      setRunResult(res);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تشغيل_التقرير_3a8af0'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenShare = (rep: SavedReportItem) => {
    setSharingReport(rep);
    const cfg = typeof rep.query_config === 'string' ? JSON.parse(rep.query_config) : rep.query_config || {};
    setShareUserIdsText((cfg.sharedUserIds || []).join(', '));
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingReport) return;

    setIsSharing(true);
    setError(null);
    try {
      const ids = shareUserIdsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await reportsApi.share(sharingReport.id, ids);
      setSuccessMsg(t('auto.تم_تحديث_صلاحيات_مشاركة_التقري_1307c1'));
      setSharingReport(null);
      loadReports();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_مشاركة_التقرير_757208'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReport) return;
    setIsDeleting(true);
    setError(null);
    try {
      await reportsApi.delete(deletingReport.id);
      setSuccessMsg(`تم حذف التقرير "${deletingReport.name}" بنجاح.`);
      setDeletingReport(null);
      loadReports();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حذف_التقرير_367441'));
    } finally {
      setIsDeleting(false);
    }
  };

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'production':
        return <span className="badge badge-primary">{t('auto.إنتاجية_ميدانية_3ed33c')}</span>;
      case 'attendance':
        return <span className="badge badge-success">{t('auto.حضور_وغياب_207b71')}</span>;
      case 'costs':
        return <span className="badge badge-accent">{t('auto.تكاليف_ومصروفات_6adf39')}</span>;
      case 'control_cards':
        return <span className="badge badge-secondary">{t('auto.بطاقات_تحكم_125a40')}</span>;
      case 'boq':
        return <span className="badge badge-primary" style={{ background: '#4f46e5' }}>{t('auto.مستخلصات_BOQ_5c9348')}</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  // Compute summary stats
  const prodReportsCount = reports.filter((r) => r.report_type === 'production').length;
  const costAttReportsCount = reports.filter((r) => r.report_type === 'costs' || r.report_type === 'attendance').length;
  const sharedReportsCount = reports.filter((r) => r.is_public).length;

  const statsItems = [
    {
      label: t('auto.إجمالي_التقارير_المحفوظة_6b62dc'),
      value: total,
      helper: `${reports.length} معروضة بالجلسة`,
      icon: <FileSpreadsheet size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.تقارير_الإنتاجية_والأداء_b12cc5'),
      value: prodReportsCount,
      helper: t('auto.تحليلات_الإنجاز_اليومي_5b118a'),
      icon: <TrendingUp size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.تقارير_الحضور_والتكاليف_1e0f0c'),
      value: costAttReportsCount,
      helper: t('auto.مراقبة_المصاريف_والعمالة_150d53'),
      icon: <DollarSign size={22} />,
      color: '#f59e0b',
    },
    {
      label: t('auto.تقارير_عامة_مشتركة_للشركة_32c54d'),
      value: sharedReportsCount,
      helper: t('auto.متاحة_لجميع_مدراء_المشاريع_7eff24'),
      icon: <Globe size={22} />,
      color: '#a78bfa',
    },
  ];

  const startRecord = reports.length === 0 ? 0 : (page - 1) * limit + 1;
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
            <FileSpreadsheet size={26} color="#60a5fa" />
            <span>{t('auto.التقارير_المحفوظة_والمخصصة_Sav_3e2a3f')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('auto.بناء_تقارير_ديناميكية_مخصصة_بم_3def7f')}</p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>{t('auto.إنشاء_قالب_تقرير_جديد_5ff773')}</span>
        </button>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && reports.length === 0} />

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
          display: 'flex',
          gap: '1rem',
          alignItems: 'end',
          flexWrap: 'wrap',
        }}
      >
        <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
          <label className="form-label">{t('auto.تصفية_بحسب_نوع_التقرير_207a44')}</label>
          <select
            className="input-field"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_أنواع_التقارير_3be7bf')}</option>
            <option value="production">{t('auto.إنتاجية_ميدانية_3ed33c')}</option>
            <option value="attendance">{t('auto.حضور_وغياب_207b71')}</option>
            <option value="costs">{t('auto.تكاليف_ومصروفات_6adf39')}</option>
            <option value="control_cards">{t('auto.بطاقات_تحكم_125a40')}</option>
            <option value="boq">{t('auto.مستخلصات_المقايسة_16fecf')}</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      {isLoading && reports.length === 0 ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>{t('auto.اسم_التقرير_7ae285')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.نوع_التقرير_669ac1')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الصلاحية_والمشاركة_752f89')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.تاريخ_الإنشاء_759697')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_تقارير_محفوظة_مطابقة_ل_3ed42c')}</td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr
                      key={rep.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>{rep.name}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>{getReportTypeBadge(rep.report_type)}</td>
                      <td style={{ padding: '1rem' }}>
                        {rep.is_public ? (
                          <span className="badge badge-success" style={{ gap: '0.3rem' }}>
                            <Globe size={12} />
                            <span>{t('auto.عام_للشركة_3ddfff')}</span>
                          </span>
                        ) : (
                          <span className="badge badge-secondary" style={{ gap: '0.3rem' }}>
                            <Lock size={12} />
                            <span>{t('auto.خاص_محدد_76c4d5')}</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} color="#60a5fa" />
                          <span>{rep.created_at ? rep.created_at.split('T')[0] : '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleRunReport(rep)}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.3rem', background: '#3b82f6' }}
                            title={t('auto.تشغيل_التقرير_واستعراض_البيانا_b002b9')}
                          >
                            <Play size={13} />
                            <span>{t('auto.تشغيل_59c6e7')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenShare(rep)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title={t('auto.مشاركة_التقرير_472244')}
                          >
                            <Share2 size={15} color="#a78bfa" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rep)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title={t('auto.تعديل_القالب_4f26f0')}
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingReport(rep)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.25)',
                            }}
                            title={t('auto.حذف_التقرير_35af59')}
                          >
                            <Trash2 size={15} />
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.تقرير_محفوظ_218c8b')}</span>
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

      {/* CREATE / EDIT REPORT MODAL */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={editingReport ? t('auto.تعديل_قالب_التقرير_61251b') : t('auto.إنشاء_وحفظ_قالب_تقرير_جديد_13aa35')}
        icon={<FileSpreadsheet size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="saved-report-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingReport ? t('auto.حفظ_التعديلات_4ff313') : t('auto.حفظ_التقرير_3336bd')}</span>
            </button>
          </div>
        }
      >
        <form id="saved-report-form" onSubmit={handleSaveReport}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>{t('auto.اسم_التقرير_7ae285')}</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={t('auto.مثال_التقرير_الأسبوعي_للإنتاجي_691638')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>{t('auto.نوع_التقرير_ومصدر_البيانات_2bedb7')}</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="input-field"
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
              >
                <option value="production">{t('auto.إنتاجية_ومخرجات_الموقع_Product_2dcfd7')}</option>
                <option value="attendance">{t('auto.الحضور_والانصراف_والإضافي_Atte_572526')}</option>
                <option value="costs">{t('auto.التكاليف_والمصروفات_المحاسبية__47657e')}</option>
                <option value="control_cards">{t('auto.بطاقات_التحكم_والربحية_Control_568f9c')}</option>
                <option value="boq">{t('auto.تقدم_بنود_المقايسة_BOQ_Progres_7decca')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.المشروع_التابع_اختياري_3c403d')}</label>
              <select
                className="input-field"
                value={formData.filters?.projectId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    filters: { ...formData.filters, projectId: e.target.value || undefined },
                  })
                }
              >
                <option value="">{t('auto.كافة_المشاريع_65e01c')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="checkbox"
                id="isPublicCheck"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              <label htmlFor="isPublicCheck" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
                {t('auto.تقرير_عام_متاح_لكافة_مستخدمي_ا_4d4b4f')}</label>
            </div>
          </div>
        </form>
      </Modal>

      {/* RUN REPORT RESULT MODAL */}
      <Modal
        isOpen={!!runningReport}
        onClose={() => {
          setRunningReport(null);
          setRunResult(null);
        }}
        title={`نتائج تشغيل: ${runningReport?.name}`}
        icon={<Play size={22} color="#34d399" />}
        maxWidth="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button
              type="button"
              onClick={() => {
                setRunningReport(null);
                setRunResult(null);
              }}
              className="btn btn-secondary"
            >
              {t('auto.إغلاق_59834d')}</button>
          </div>
        }
      >
        <div>
          {isRunning ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
              <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>{t('auto.جاري_تشغيل_الاستعلام_واستخراج__1ddafd')}</p>
            </div>
          ) : runResult ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.5)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('auto.عدد_السجلات_المستخرجة_5f0b9a')}</span>
                  <strong style={{ color: '#34d399' }}>{runResult.rowCount || (runResult.data ? runResult.data.length : 0)} {t('auto.سجل_180b0b')}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {t('auto.تاريخ_التشغيل_44ca2b')}{runResult.executedAt ? new Date(runResult.executedAt).toLocaleString('ar-SA') : t('auto.الآن_2e43e2')}
                </div>
              </div>

              {/* Data Table */}
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                {runResult.data && runResult.data.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15, 23, 42, 0.9)', position: 'sticky', top: 0 }}>
                        {Object.keys(runResult.data[0]).slice(0, 6).map((k) => (
                          <th key={k} style={{ padding: '0.75rem' }}>
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runResult.data.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {Object.keys(row).slice(0, 6).map((k) => (
                            <td key={k} style={{ padding: '0.75rem' }}>
                              {String(row[k] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                    {t('auto.لا_توجد_سجلات_مستخرجة_مطابقة_ل_7ffc04')}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* SHARE MODAL */}
      <Modal
        isOpen={!!sharingReport}
        onClose={() => setSharingReport(null)}
        title={`مشاركة التقرير: ${sharingReport?.name}`}
        icon={<Share2 size={22} color="#a78bfa" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setSharingReport(null)}
              className="btn btn-secondary"
              disabled={isSharing}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="share-report-form" className="btn btn-primary" disabled={isSharing}>
              {isSharing ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.حفظ_المشاركة_6583b6')}</span>
            </button>
          </div>
        }
      >
        <form id="share-report-form" onSubmit={handleShareSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auto.معرفات_المستخدمين_المصرح_لهم_م_332db0')}</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="user-uuid-1, user-uuid-2..."
              value={shareUserIdsText}
              onChange={(e) => setShareUserIdsText(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
              {t('auto.اترك_الحقل_فارغا_إذا_كان_التقر_160dc6')}</span>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={!!deletingReport}
        onClose={() => setDeletingReport(null)}
        title={t('auto.تأكيد_حذف_التقرير_المحفوظ_1e2e52')}
        icon={<Trash2 size={22} color="#f87171" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeletingReport(null)}
              className="btn btn-secondary"
              disabled={isDeleting}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.تأكيد_الحذف_4af57e')}</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_حذف_ق_66627c')}<strong style={{ color: '#ffffff' }}>"{deletingReport?.name}"</strong>{t('auto.k_61f')}</p>
      </Modal>
    </div>
  );
};
