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
      setError(err.message || 'فشل تحميل التقارير المحفوظة');
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
      setError('اسم التقرير مطلوب');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingReport) {
        await reportsApi.update(editingReport.id, formData);
        setSuccessMsg('تم تحديث التقرير المحفوظ بنجاح.');
      } else {
        await reportsApi.create(formData);
        setSuccessMsg('تم إنشاء وحفظ التقرير الجديد بنجاح.');
      }
      setShowReportModal(false);
      loadReports();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ التقرير');
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
      setError(err.message || 'فشل تشغيل التقرير');
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
      setSuccessMsg('تم تحديث صلاحيات مشاركة التقرير بنجاح.');
      setSharingReport(null);
      loadReports();
    } catch (err: any) {
      setError(err.message || 'فشل مشاركة التقرير');
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
      setError(err.message || 'فشل حذف التقرير');
    } finally {
      setIsDeleting(false);
    }
  };

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'production':
        return <span className="badge badge-primary">إنتاجية ميدانية</span>;
      case 'attendance':
        return <span className="badge badge-success">حضور وغياب</span>;
      case 'costs':
        return <span className="badge badge-accent">تكاليف ومصروفات</span>;
      case 'control_cards':
        return <span className="badge badge-secondary">بطاقات تحكم</span>;
      case 'boq':
        return <span className="badge badge-primary" style={{ background: '#4f46e5' }}>مستخلصات BOQ</span>;
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
      label: 'إجمالي التقارير المحفوظة',
      value: total,
      helper: `${reports.length} معروضة بالجلسة`,
      icon: <FileSpreadsheet size={22} />,
      color: '#60a5fa',
    },
    {
      label: 'تقارير الإنتاجية والأداء',
      value: prodReportsCount,
      helper: 'تحليلات الإنجاز اليومي',
      icon: <TrendingUp size={22} />,
      color: '#34d399',
    },
    {
      label: 'تقارير الحضور والتكاليف',
      value: costAttReportsCount,
      helper: 'مراقبة المصاريف والعمالة',
      icon: <DollarSign size={22} />,
      color: '#f59e0b',
    },
    {
      label: 'تقارير عامة مشتركة للشركة',
      value: sharedReportsCount,
      helper: 'متاحة لجميع مدراء المشاريع',
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
            <span>التقارير المحفوظة والمخصصة (Saved Reports)</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            بناء تقارير ديناميكية مخصصة بمرشحات مختلفة، تشغيلها دورياً ومشاركتها مع فريق الإدارة
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>إنشاء قالب تقرير جديد</span>
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
          <label className="form-label">تصفية بحسب نوع التقرير</label>
          <select
            className="input-field"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة أنواع التقارير</option>
            <option value="production">إنتاجية ميدانية</option>
            <option value="attendance">حضور وغياب</option>
            <option value="costs">تكاليف ومصروفات</option>
            <option value="control_cards">بطاقات تحكم</option>
            <option value="boq">مستخلصات المقايسة</option>
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
                  <th style={{ padding: '1rem' }}>اسم التقرير</th>
                  <th style={{ padding: '1rem' }}>نوع التقرير</th>
                  <th style={{ padding: '1rem' }}>الصلاحية والمشاركة</th>
                  <th style={{ padding: '1rem' }}>تاريخ الإنشاء</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      لا توجد تقارير محفوظة مطابقة للاختيار
                    </td>
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
                            <span>عام للشركة</span>
                          </span>
                        ) : (
                          <span className="badge badge-secondary" style={{ gap: '0.3rem' }}>
                            <Lock size={12} />
                            <span>خاص / محدد</span>
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
                            title="تشغيل التقرير واستعراض البيانات"
                          >
                            <Play size={13} />
                            <span>تشغيل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenShare(rep)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title="مشاركة التقرير"
                          >
                            <Share2 size={15} color="#a78bfa" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rep)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title="تعديل القالب"
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
                            title="حذف التقرير"
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
              عرض {startRecord}–{endRecord} من إجمالي {total} تقرير محفوظ
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

      {/* CREATE / EDIT REPORT MODAL */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={editingReport ? 'تعديل قالب التقرير' : 'إنشاء وحفظ قالب تقرير جديد'}
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
              إلغاء
            </button>
            <button type="submit" form="saved-report-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingReport ? 'حفظ التعديلات' : 'حفظ التقرير'}</span>
            </button>
          </div>
        }
      >
        <form id="saved-report-form" onSubmit={handleSaveReport}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>اسم التقرير</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: التقرير الأسبوعي للإنتاجية - فرع الرياض"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>نوع التقرير ومصدر البيانات</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="input-field"
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
              >
                <option value="production">إنتاجية ومخرجات الموقع (Production)</option>
                <option value="attendance">الحضور والانصراف والإضافي (Attendance)</option>
                <option value="costs">التكاليف والمصروفات المحاسبية (Costs)</option>
                <option value="control_cards">بطاقات التحكم والربحية (Control Cards)</option>
                <option value="boq">تقدم بنود المقايسة (BOQ Progress)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">المشروع التابع (اختياري)</label>
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
                <option value="">كافة المشاريع</option>
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
                تقرير عام متاح لكافة مستخدمي الشركة
              </label>
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
              إغلاق
            </button>
          </div>
        }
      >
        <div>
          {isRunning ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
              <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تشغيل الاستعلام واستخراج البيانات...</p>
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
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>عدد السجلات المستخرجة: </span>
                  <strong style={{ color: '#34d399' }}>{runResult.rowCount || (runResult.data ? runResult.data.length : 0)} سجل</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  تاريخ التشغيل: {runResult.executedAt ? new Date(runResult.executedAt).toLocaleString('ar-SA') : 'الآن'}
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
                    لا توجد سجلات مستخرجة مطابقة لشروط التقرير
                  </p>
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
              إلغاء
            </button>
            <button type="submit" form="share-report-form" className="btn btn-primary" disabled={isSharing}>
              {isSharing ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>حفظ المشاركة</span>
            </button>
          </div>
        }
      >
        <form id="share-report-form" onSubmit={handleShareSubmit}>
          <div className="form-group">
            <label className="form-label">معرفات المستخدمين المصرح لهم (مفصولة بفواصل)</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="user-uuid-1, user-uuid-2..."
              value={shareUserIdsText}
              onChange={(e) => setShareUserIdsText(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
              اترك الحقل فارغاً إذا كان التقرير متاحاً للعامة
            </span>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={!!deletingReport}
        onClose={() => setDeletingReport(null)}
        title="تأكيد حذف التقرير المحفوظ"
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
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>تأكيد الحذف</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          هل أنت متأكد من رغبتك في حذف قالب التقرير <strong style={{ color: '#ffffff' }}>"{deletingReport?.name}"</strong>؟
        </p>
      </Modal>
    </div>
  );
};
