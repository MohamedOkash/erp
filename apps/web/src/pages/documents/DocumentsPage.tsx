import React, { useEffect, useState, useCallback } from 'react';
import {
  documentsApi,
  type DocumentItem,
  type DocumentVersionItem,
} from '../../api/documents.api';
import { projectsApi, type Project } from '../../api/projects.api';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { useI18n } from '../../i18n/I18nContext';
import {
  FileText,
  Plus,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Folder,
  History,
  HardDrive,
  FileSpreadsheet,
  FileCode,
  Layers,
  Calendar,
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(t('auto.عقود_ومستندات_تعاقدية_31ea69'));
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploadDocNumber, setUploadDocNumber] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');

  // Versions Modal
  const [selectedDocForVersions, setSelectedDocForVersions] = useState<DocumentItem | null>(null);
  const [docVersions, setDocVersions] = useState<DocumentVersionItem[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // New Version Modal
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionDoc, setNewVersionDoc] = useState<DocumentItem | null>(null);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [isUploadingNewVersion, setIsUploadingNewVersion] = useState(false);

  // Delete Modal
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getProjects({ limit: 100 });
      setProjects(res.data);
    } catch {
      // ignore
    }
  };

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await documentsApi.list({
        page,
        limit,
        projectId: selectedProject || undefined,
        category: selectedCategory || undefined,
      });
      setDocuments(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_قائمة_المستندات_df4153'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedProject, selectedCategory]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError(t('auto.يرجى_اختيار_ملف_لرفعه_28cdef'));
      return;
    }
    if (!uploadTitle.trim()) {
      setError(t('auto.يرجى_إدخال_عنوان_المستند_631609'));
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle.trim());
      formData.append('category', uploadCategory);
      if (uploadProjectId) formData.append('projectId', uploadProjectId);
      if (uploadDocNumber.trim()) formData.append('documentNumber', uploadDocNumber.trim());
      if (uploadNotes.trim()) formData.append('notes', uploadNotes.trim());

      await documentsApi.upload(formData);
      setSuccessMsg(t('auto.تم_رفع_المستند_بنجاح_وأرشفته_ك_6787ee'));
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDocNumber('');
      setUploadNotes('');
      loadDocuments();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_رفع_المستند_2239a6'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenVersions = async (doc: DocumentItem) => {
    setSelectedDocForVersions(doc);
    setIsLoadingVersions(true);
    try {
      const vers = await documentsApi.getVersions(doc.id);
      setDocVersions(vers || []);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_إصدارات_المستند_769cae'));
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleOpenNewVersion = (doc: DocumentItem) => {
    setNewVersionDoc(doc);
    setNewVersionFile(null);
    setNewVersionNotes('');
    setShowNewVersionModal(true);
  };

  const handleUploadNewVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionDoc || !newVersionFile) {
      setError(t('auto.يرجى_اختيار_الملف_الجديد_788f2b'));
      return;
    }

    setIsUploadingNewVersion(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', newVersionFile);
      if (newVersionNotes.trim()) formData.append('notes', newVersionNotes.trim());

      await documentsApi.uploadNewVersion(newVersionDoc.id, formData);
      setSuccessMsg(`تم رفع الإصدار الجديد (v${newVersionDoc.version + 1}) بنجاح.`);
      setShowNewVersionModal(false);
      setNewVersionDoc(null);
      setNewVersionFile(null);
      setNewVersionNotes('');
      loadDocuments();
      if (selectedDocForVersions && selectedDocForVersions.id === newVersionDoc.id) {
        handleOpenVersions(newVersionDoc);
      }
    } catch (err: any) {
      setError(err.message || t('auto.فشل_رفع_الإصدار_الجديد_456793'));
    } finally {
      setIsUploadingNewVersion(false);
    }
  };

  const handleDownload = async (docId: string, fileName?: string, version?: number) => {
    setDownloadingId(docId);
    setError(null);
    try {
      await documentsApi.download(docId, fileName, version);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_الملف_3e9c64'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    setError(null);
    try {
      await documentsApi.delete(deletingDoc.id);
      setSuccessMsg(`تم حذف المستند "${deletingDoc.title}" وكافة إصداراته بنجاح.`);
      setDeletingDoc(null);
      loadDocuments();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حذف_المستند_37e9cf'));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName?: string) => {
    const ext = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      return <FileSpreadsheet size={16} color="#34d399" />;
    }
    if (ext === 'dwg' || ext === 'dxf' || ext === 'json') {
      return <FileCode size={16} color="#f59e0b" />;
    }
    return <FileText size={16} color="#60a5fa" />;
  };

  // Compute summary stats
  const multiVersionCount = documents.filter((d) => d.version > 1).length;
  const projectLinkedCount = documents.filter((d) => !!d.project_id).length;
  const totalSizeBytes = documents.reduce((acc, d) => acc + (Number(d.file_size) || 0), 0);

  const statsItems = [
    {
      label: t('auto.إجمالي_المستندات_المؤرشفة_1bcf18'),
      value: total,
      helper: `${documents.length} معروضة بالجلسة`,
      icon: <Folder size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.مستندات_مرتبطة_بمشاريع_d20de4'),
      value: projectLinkedCount,
      helper: t('auto.مخططات_وعقود_تنفيذية_2f7f71'),
      icon: <Layers size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.مستندات_بإصدارات_متعددة_26f8d5'),
      value: multiVersionCount,
      helper: t('auto.تم_تحديثها_ومراجعتها_v2_53f39f'),
      icon: <History size={22} />,
      color: '#f59e0b',
    },
    {
      label: t('auto.حجم_التخزين_المستهلك_8097e3'),
      value: formatFileSize(totalSizeBytes),
      helper: t('auto.مساحة_الملفات_السحابية_8b1d18'),
      icon: <HardDrive size={22} />,
      color: '#a78bfa',
    },
  ];

  const startRecord = documents.length === 0 ? 0 : (page - 1) * limit + 1;
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
            <FileText size={26} color="#60a5fa" />
            <span>{t('finance_reports.documents_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.documents')}
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary"
          style={{ gap: '0.5rem' }}
        >
          <Upload size={18} />
          <span>{t('auto.رفع_مستند_جديد_192b69')}</span>
        </button>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && documents.length === 0} />

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
          <label className="form-label">{t('auto.تصفية_بحسب_المشروع_1c083e')}</label>
          <select
            className="input-field"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_المشاريع_65e01c')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('auto.تصنيف_المستند_1adeb4')}</label>
          <select
            className="input-field"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_التصنيفات_563586')}</option>
            <option value={t('auto.عقود_ومستندات_تعاقدية_31ea69')}>{t('auto.عقود_ومستندات_تعاقدية_31ea69')}</option>
            <option value={t('auto.مخططات_ورسومات_هندسية_4a2a3f')}>{t('auto.مخططات_ورسومات_هندسية_4a2a3f')}</option>
            <option value={t('auto.مستخلصات_ومطالبات_مالية_1aeb91')}>{t('auto.مستخلصات_ومطالبات_مالية_1aeb91')}</option>
            <option value={t('auto.تقارير_جودة_واختبارات_529be8')}>{t('auto.تقارير_جودة_واختبارات_529be8')}</option>
            <option value={t('auto.أخرى_2e21be')}>{t('auto.أخرى_2e21be')}</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      {isLoading && documents.length === 0 ? (
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
                  <th style={{ padding: '1rem' }}>{t('auto.عنوان_المستند_والملف_2b9aec')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.رقم_المستند_626b4f')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.التصنيف_7f5b59')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المشروع_7f28ee')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الإصدار_7f1489')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الحجم_والتاريخ_6937a5')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_مستندات_مسجلة_مطابقة_ل_a1a7a6')}</td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {getFileIcon(doc.file_name)}
                          <div>
                            <div style={{ fontWeight: 700, color: '#ffffff' }}>{doc.title}</div>
                            {doc.file_name && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                {doc.file_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {doc.document_number || '—'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-secondary">{doc.category_name || t('auto.عام_1820f7')}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {doc.project_name || t('auto.عام_غير_مقيد_360275')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className={`badge ${doc.version > 1 ? 'badge-primary' : 'badge-secondary'}`}>
                          v{doc.version}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <div>{formatFileSize(doc.file_size)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={11} />
                          <span>{doc.created_at ? doc.created_at.split('T')[0] : '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleDownload(doc.id, doc.file_name, doc.version)}
                            disabled={downloadingId === doc.id}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title={t('auto.تحميل_الملف_554000')}
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Download size={15} color="#34d399" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenVersions(doc)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title={t('auto.سجل_الإصدارات_6f1dd7')}
                          >
                            <History size={15} color="#60a5fa" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenNewVersion(doc)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title={t('auto.رفع_إصدار_جديد_43dbd5')}
                          >
                            <Plus size={15} color="#f59e0b" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingDoc(doc)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.25)',
                            }}
                            title={t('auto.حذف_المستند_3439ca')}
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.مستند_5b42b1')}</span>
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

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={t('auto.رفع_مستند_جديد_إلى_الأرشيف_5726a8')}
        icon={<Upload size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="btn btn-secondary"
              disabled={isUploading}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="upload-doc-form" className="btn btn-primary" disabled={isUploading}>
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>{t('auto.بدء_الرفع_والأرشفة_1f6c30')}</span>
            </button>
          </div>
        }
      >
        <form id="upload-doc-form" onSubmit={handleUploadSubmit}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>{t('auto.الملف_المراد_رفعه_28b8d2')}</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="file"
                className="input-field"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    setUploadFile(f);
                    if (!uploadTitle) {
                      // Set default title from filename without ext
                      setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>{t('auto.عنوان_المستند_406d2b')}</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={t('auto.مثال_عقد_أعمال_الحفر_والردم_مش_152aa4')}
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{t('auto.تصنيف_المستند_1adeb4')}</label>
                <select
                  className="input-field"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  <option value={t('auto.عقود_ومستندات_تعاقدية_31ea69')}>{t('auto.عقود_ومستندات_تعاقدية_31ea69')}</option>
                  <option value={t('auto.مخططات_ورسومات_هندسية_4a2a3f')}>{t('auto.مخططات_ورسومات_هندسية_4a2a3f')}</option>
                  <option value={t('auto.مستخلصات_ومطالبات_مالية_1aeb91')}>{t('auto.مستخلصات_ومطالبات_مالية_1aeb91')}</option>
                  <option value={t('auto.تقارير_جودة_واختبارات_529be8')}>{t('auto.تقارير_جودة_واختبارات_529be8')}</option>
                  <option value={t('auto.أخرى_2e21be')}>{t('auto.أخرى_2e21be')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('auto.المشروع_التابع_اختياري_3c403d')}</label>
                <select
                  className="input-field"
                  value={uploadProjectId}
                  onChange={(e) => setUploadProjectId(e.target.value)}
                >
                  <option value="">{t('auto.عام_بدون_مشروع_محدد_4a170d')}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.رقم_المستند_المرجع_اختياري_32c11d')}</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('auto.مثال_DOC_2026_0042_29ddab')}
                value={uploadDocNumber}
                onChange={(e) => setUploadDocNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.ملاحظات_وبيان_اختياري_49b427')}</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder={t('auto.تفاصيل_حول_محتوى_المستند_أو_شر_348c58')}
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* VERSIONS HISTORY MODAL */}
      <Modal
        isOpen={!!selectedDocForVersions}
        onClose={() => setSelectedDocForVersions(null)}
        title={`سجل إصدارات: ${selectedDocForVersions?.title}`}
        icon={<History size={22} color="#60a5fa" />}
        maxWidth="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button type="button" onClick={() => setSelectedDocForVersions(null)} className="btn btn-secondary">
              {t('auto.إغلاق_59834d')}</button>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.5)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('auto.الإصدار_الحالي_النشط_598413')}</span>
              <strong style={{ color: '#60a5fa' }}>v{selectedDocForVersions?.version}</strong>
            </div>

            <button
              onClick={() => {
                if (selectedDocForVersions) {
                  handleOpenNewVersion(selectedDocForVersions);
                }
              }}
              className="btn btn-primary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}
            >
              <Plus size={14} />
              <span>{t('auto.رفع_إصدار_جديد_43dbd5')}</span>
            </button>
          </div>

          {isLoadingVersions ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>{t('auto.جاري_تحميل_الإصدارات_75b402')}</p>
            </div>
          ) : docVersions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              {t('auto.لا_توجد_إصدارات_مسجلة_37d0ad')}</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {docVersions.map((ver) => (
                <div
                  key={ver.id}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className={`badge ${
                        ver.version_number === selectedDocForVersions?.version
                          ? 'badge-success'
                          : 'badge-secondary'
                      }`}
                      style={{ fontSize: '0.9rem', padding: '0.3rem 0.6rem' }}
                    >
                      v{ver.version_number}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{ver.file_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {formatFileSize(ver.file_size_bytes)} {t('auto.تم_الرفع_6deb4e')}{' '}
                        {ver.created_at ? ver.created_at.split('T')[0] : '—'}
                      </div>
                      {ver.notes && (
                        <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '0.2rem' }}>
                          {t('auto.ملاحظات_6d2302')}{ver.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        selectedDocForVersions!.id,
                        ver.file_name,
                        ver.version_number,
                      )
                    }
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                  >
                    <Download size={14} color="#34d399" />
                    <span>{t('auto.تحميل_هذا_الإصدار_5fd562')}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* UPLOAD NEW VERSION MODAL */}
      <Modal
        isOpen={showNewVersionModal}
        onClose={() => setShowNewVersionModal(false)}
        title={`رفع إصدار جديد (v${(newVersionDoc?.version || 0) + 1}): ${newVersionDoc?.title}`}
        icon={<Plus size={22} color="#f59e0b" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowNewVersionModal(false)}
              className="btn btn-secondary"
              disabled={isUploadingNewVersion}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="new-version-doc-form" className="btn btn-primary" disabled={isUploadingNewVersion}>
              {isUploadingNewVersion ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>{t('auto.اعتماد_ورفع_الإصدار_v_2c608e')}{(newVersionDoc?.version || 0) + 1}</span>
            </button>
          </div>
        }
      >
        <form id="new-version-doc-form" onSubmit={handleUploadNewVersionSubmit}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>{t('auto.الملف_المحد_ث_741e52')}</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="file"
                className="input-field"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNewVersionFile(e.target.files[0]);
                  }
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto.ملاحظات_وبيان_التعديل_في_هذا_ا_2d12cd')}</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder={t('auto.مثال_تعديل_المخطط_الإنشائي_وفق_1b45df')}
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        title={t('auto.تأكيد_حذف_المستند_3d2771')}
        icon={<Trash2 size={22} color="#f87171" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeletingDoc(null)}
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
              <span>{t('auto.تأكيد_الحذف_النهائي_70d6c3')}</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_حذف_ا_479791')}<strong style={{ color: '#ffffff' }}>"{deletingDoc?.title}"</strong>{t('auto.سيتم_حذف_الملف_وكافة_إصداراته__73b427')}</p>
      </Modal>
    </div>
  );
};
