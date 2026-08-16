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
  const [uploadCategory, setUploadCategory] = useState('عقود ومستندات تعاقدية');
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
      setError(err.message || 'فشل تحميل قائمة المستندات');
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
      setError('يرجى اختيار ملف لرفعه');
      return;
    }
    if (!uploadTitle.trim()) {
      setError('يرجى إدخال عنوان المستند');
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
      setSuccessMsg('تم رفع المستند بنجاح وأرشفته كإصدار أول (v1).');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDocNumber('');
      setUploadNotes('');
      loadDocuments();
    } catch (err: any) {
      setError(err.message || 'فشل رفع المستند');
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
      setError(err.message || 'فشل تحميل إصدارات المستند');
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
      setError('يرجى اختيار الملف الجديد');
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
      setError(err.message || 'فشل رفع الإصدار الجديد');
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
      setError(err.message || 'فشل تحميل الملف');
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
      setError(err.message || 'فشل حذف المستند');
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
      label: 'إجمالي المستندات المؤرشفة',
      value: total,
      helper: `${documents.length} معروضة بالجلسة`,
      icon: <Folder size={22} />,
      color: '#60a5fa',
    },
    {
      label: 'مستندات مرتبطة بمشاريع',
      value: projectLinkedCount,
      helper: 'مخططات وعقود تنفيذية',
      icon: <Layers size={22} />,
      color: '#34d399',
    },
    {
      label: 'مستندات بإصدارات متعددة',
      value: multiVersionCount,
      helper: 'تم تحديثها ومراجعتها (v2+)',
      icon: <History size={22} />,
      color: '#f59e0b',
    },
    {
      label: 'حجم التخزين المستهلك',
      value: formatFileSize(totalSizeBytes),
      helper: 'مساحة الملفات السحابية',
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
            <span>الأرشيف والمستندات الهندسية</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            إدارة وتخزين عقود المشاريع، المخططات التنفيذية، المستخلصات مع تتبع كامل للإصدارات السابقة
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary"
          style={{ gap: '0.5rem' }}
        >
          <Upload size={18} />
          <span>رفع مستند جديد</span>
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
          <label className="form-label">تصفية بحسب المشروع</label>
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
          <label className="form-label">تصنيف المستند</label>
          <select
            className="input-field"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة التصنيفات</option>
            <option value="عقود ومستندات تعاقدية">عقود ومستندات تعاقدية</option>
            <option value="مخططات ورسومات هندسية">مخططات ورسومات هندسية</option>
            <option value="مستخلصات ومطالبات مالية">مستخلصات ومطالبات مالية</option>
            <option value="تقارير جودة واختبارات">تقارير جودة واختبارات</option>
            <option value="أخرى">أخرى</option>
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
                  <th style={{ padding: '1rem' }}>عنوان المستند والملف</th>
                  <th style={{ padding: '1rem' }}>رقم المستند</th>
                  <th style={{ padding: '1rem' }}>التصنيف</th>
                  <th style={{ padding: '1rem' }}>المشروع</th>
                  <th style={{ padding: '1rem' }}>الإصدار</th>
                  <th style={{ padding: '1rem' }}>الحجم والتاريخ</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      لا توجد مستندات مسجلة مطابقة للبحث
                    </td>
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
                        <span className="badge badge-secondary">{doc.category_name || 'عام'}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {doc.project_name || 'عام / غير مقيد'}
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
                            title="تحميل الملف"
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
                            title="سجل الإصدارات"
                          >
                            <History size={15} color="#60a5fa" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenNewVersion(doc)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title="رفع إصدار جديد"
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
                            title="حذف المستند"
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
              عرض {startRecord}–{endRecord} من إجمالي {total} مستند
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

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="رفع مستند جديد إلى الأرشيف"
        icon={<Upload size={22} color="#60a5fa" />}
        maxWidth="md"
      >
        <form onSubmit={handleUploadSubmit}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>الملف المراد رفعه</span>
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
                <span>عنوان المستند</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: عقد أعمال الحفر والردم - مشروع برج الرياض"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">تصنيف المستند</label>
                <select
                  className="input-field"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  <option value="عقود ومستندات تعاقدية">عقود ومستندات تعاقدية</option>
                  <option value="مخططات ورسومات هندسية">مخططات ورسومات هندسية</option>
                  <option value="مستخلصات ومطالبات مالية">مستخلصات ومطالبات مالية</option>
                  <option value="تقارير جودة واختبارات">تقارير جودة واختبارات</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المشروع التابع (اختياري)</label>
                <select
                  className="input-field"
                  value={uploadProjectId}
                  onChange={(e) => setUploadProjectId(e.target.value)}
                >
                  <option value="">عام / بدون مشروع محدد</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">رقم المستند / المرجع (اختياري)</label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: DOC-2026-0042"
                value={uploadDocNumber}
                onChange={(e) => setUploadDocNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات وبيان (اختياري)</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="تفاصيل حول محتوى المستند أو شروط الاعتماد..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="btn btn-secondary"
              disabled={isUploading}
            >
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={isUploading}>
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>بدء الرفع والأرشفة</span>
            </button>
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
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>الإصدار الحالي النشط: </span>
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
              <span>رفع إصدار جديد</span>
            </button>
          </div>

          {isLoadingVersions ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>جاري تحميل الإصدارات...</p>
            </div>
          ) : docVersions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              لا توجد إصدارات مسجلة
            </p>
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
                        {formatFileSize(ver.file_size_bytes)} • تم الرفع:{' '}
                        {ver.created_at ? ver.created_at.split('T')[0] : '—'}
                      </div>
                      {ver.notes && (
                        <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '0.2rem' }}>
                          ملاحظات: {ver.notes}
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
                    <span>تحميل هذا الإصدار</span>
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
      >
        <form onSubmit={handleUploadNewVersionSubmit}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>الملف المحدّث</span>
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
              <label className="form-label">ملاحظات وبيان التعديل في هذا الإصدار</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="مثال: تعديل المخطط الإنشائي وفق ملاحظات الاستشاري..."
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={() => setShowNewVersionModal(false)}
              className="btn btn-secondary"
              disabled={isUploadingNewVersion}
            >
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={isUploadingNewVersion}>
              {isUploadingNewVersion ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>اعتماد ورفع الإصدار v{(newVersionDoc?.version || 0) + 1}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        title="تأكيد حذف المستند"
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
              <span>تأكيد الحذف النهائي</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          هل أنت متأكد من رغبتك في حذف المستند <strong style={{ color: '#ffffff' }}>"{deletingDoc?.title}"</strong>؟
          سيتم حذف الملف وكافة إصداراته السابقة نهائيًا.
        </p>
      </Modal>
    </div>
  );
};
