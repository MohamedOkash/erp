import React, { useEffect, useState, useCallback } from 'react';
import { projectsApi } from '../../api/projects.api';
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '../../api/projects.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { ProjectFormModal } from './ProjectFormModal';
import { Modal } from '../../components/Modal';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Hash,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
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
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBranches = async () => {
    try {
      const res = await branchesApi.list({ isActive: true });
      setBranches(res.data);
    } catch {
      // ignore
    }
  };

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await projectsApi.list({
        page,
        limit,
        search: search.trim() || undefined,
        branchId: selectedBranch || undefined,
        status: selectedStatus || undefined,
      });
      setProjects(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات المشاريع');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedBranch, selectedStatus]);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proj: Project) => {
    setEditingProject(proj);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: CreateProjectPayload | UpdateProjectPayload) => {
    setIsSaving(true);
    setError(null);
    try {
      if (editingProject) {
        await projectsApi.update(editingProject.id, payload);
        setSuccessMsg('تم تحديث المشروع بنجاح');
      } else {
        await projectsApi.create(payload as CreateProjectPayload);
        setSuccessMsg('تم إنشاء المشروع بنجاح');
      }
      setIsModalOpen(false);
      loadProjects();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بيانات المشروع');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await projectsApi.remove(deletingProject.id);
      setSuccessMsg(`تم حذف المشروع "${deletingProject.name}" بنجاح`);
      setDeletingProject(null);
      loadProjects();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حذف المشروع');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="badge badge-primary">⚡ قيد التنفيذ</span>;
      case 'completed':
        return <span className="badge badge-success">✓ مكتمل</span>;
      case 'planned':
        return <span className="badge badge-accent">🗓️ مخطط له</span>;
      case 'on_hold':
        return <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>⏸️ معلق</span>;
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
            <FolderKanban size={28} color="#60a5fa" />
            <span>إدارة المشاريع الميدانية</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            متابعة مشاريع المقاولات، قيم العقود بالريال، ومراحل الإنجاز وربطها بالفروع.
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>إضافة مشروع جديد</span>
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
            <Search size={14} />
            <span>بحث باسم المشروع أو الكود</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="ابحث..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Filter size={14} />
            <span>فلترة بحسب الفرع التابع</span>
          </label>
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
          <label className="form-label">حالة المشروع</label>
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الحالات</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="planned">مخطط له</option>
            <option value="completed">مكتمل</option>
            <option value="on_hold">معلق</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>المشروع / الكود</th>
                <th style={{ padding: '1rem' }}>الفرع التابع</th>
                <th style={{ padding: '1rem' }}>الحالة</th>
                <th style={{ padding: '1rem' }}>قيمة العقد (SAR)</th>
                <th style={{ padding: '1rem' }}>تاريخ البدء والانتهاء</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل المشاريع...</p>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد مشاريع مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                projects.map((proj) => (
                  <tr
                    key={proj.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>{proj.name}</div>
                      {proj.code && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Hash size={11} />
                          <span>{proj.code}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {proj.branchName || 'غير محدد'}
                    </td>
                    <td style={{ padding: '1rem' }}>{getStatusBadge(proj.status)}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {proj.contractValue ? (
                        <span>
                          {Number(proj.contractValue).toLocaleString()}{' '}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={13} />
                        <span>
                          {proj.startDate ? proj.startDate.split('T')[0] : '—'} إلى{' '}
                          {proj.endDate ? proj.endDate.split('T')[0] : 'مفتوح'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(proj)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                          title="تعديل المشروع"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProject(proj)}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            color: '#f87171',
                            borderColor: 'rgba(239, 68, 68, 0.25)',
                          }}
                          title="حذف المشروع"
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
          <span>إجمالي المشاريع: {total}</span>
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
      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        editingProject={editingProject}
        branches={branches}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        title="تأكيد حذف المشروع"
        icon={<Trash2 size={22} color="#f87171" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeletingProject(null)}
              className="btn btn-secondary"
              disabled={isDeleting}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
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
          هل أنت متأكد من رغبتك في حذف المشروع <strong style={{ color: '#ffffff' }}>"{deletingProject?.name}"</strong>؟
        </p>
      </Modal>
    </div>
  );
};
