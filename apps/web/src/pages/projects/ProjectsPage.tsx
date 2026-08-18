import React, { useEffect, useState, useCallback } from 'react';
import { projectsApi } from '../../api/projects.api';
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '../../api/projects.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import { ProjectFormModal } from './ProjectFormModal';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { useI18n } from '../../i18n/I18nContext';
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
  Activity,
  CheckCheck,
  DollarSign,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { t } = useI18n();
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
      setError(err.message || t('auto.فشل_تحميل_بيانات_المشاريع_5c4301'));
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
        setSuccessMsg(t('auto.تم_تحديث_المشروع_بنجاح_642640'));
      } else {
        await projectsApi.create(payload as CreateProjectPayload);
        setSuccessMsg(t('auto.تم_إنشاء_المشروع_بنجاح_3420b8'));
      }
      setIsModalOpen(false);
      loadProjects();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_بيانات_المشروع_29001f'));
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
      setError(err.message || t('auto.فشل_حذف_المشروع_37ea5e'));
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="badge badge-primary">{t('auto.قيد_التنفيذ_32b209')}</span>;
      case 'completed':
        return <span className="badge badge-success">{t('auto.مكتمل_6dfda8')}</span>;
      case 'planned':
        return <span className="badge badge-accent">{t('auto.مخطط_له_50393d')}</span>;
      case 'on_hold':
        return <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>{t('auto.معلق_465e69')}</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  // Compute summary stats
  const inProgressCount = projects.filter((p) => p.status === 'in_progress').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const totalContractVal = projects.reduce((acc, p) => acc + (Number(p.contractValue) || 0), 0);

  const statsItems = [
    {
      label: t('auto.إجمالي_المشاريع_38d9fb'),
      value: total,
      helper: `${projects.length} معروضة بالجلسة`,
      icon: <FolderKanban size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.مشاريع_قيد_التنفيذ_17aa1e'),
      value: inProgressCount,
      helper: t('auto.مواقع_إنتاجية_نشطة_270251'),
      icon: <Activity size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.مشاريع_مكتملة_ومسل_مة_1fb12c'),
      value: completedCount,
      helper: `${projects.filter((p) => p.status === 'on_hold').length} متوقف أو معلق`,
      icon: <CheckCheck size={22} />,
      color: '#10b981',
    },
    {
      label: t('auto.إجمالي_قيمة_العقود_13189c'),
      value: `${totalContractVal.toLocaleString()} SAR`,
      helper: t('auto.لكافة_المشاريع_المسجلة_ce226b'),
      icon: <DollarSign size={22} />,
      color: '#f59e0b',
    },
  ];

  const startRecord = projects.length === 0 ? 0 : (page - 1) * limit + 1;
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
            <FolderKanban size={26} color="#60a5fa" />
            <span>{t('resources.projects_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.projects')}
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>{t('resources.add_project')}</span>
        </button>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && projects.length === 0} />

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
            <span>{t('auto.بحث_باسم_المشروع_أو_الكود_215401')}</span>
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
            <Filter size={14} />
            <span>{t('auto.فلترة_بحسب_الفرع_التابع_f35b44')}</span>
          </label>
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
          <label className="form-label">{t('auto.حالة_المشروع_1d74d7')}</label>
          <select
            className="input-field"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الحالات_3318a9')}</option>
            <option value="in_progress">{t('auto.قيد_التنفيذ_63bb0d')}</option>
            <option value="planned">{t('auto.مخطط_له_72934d')}</option>
            <option value="completed">{t('auto.مكتمل_5b49f6')}</option>
            <option value="on_hold">{t('auto.معلق_2f1bc1')}</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      {isLoading && projects.length === 0 ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>{t('auto.المشروع_الكود_45c134')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الفرع_التابع_26570d')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الحالة_252d72')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.قيمة_العقد_SAR_57ae97')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.تاريخ_البدء_والانتهاء_41f11d')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_مشاريع_مسجلة_مطابقة_لل_2af0cb')}</td>
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
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1.05rem' }}>{proj.name}</div>
                        {proj.code && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Hash size={11} />
                            <span>{proj.code}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {proj.branchName || t('auto.غير_محدد_1567b8')}
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
                            {proj.startDate ? proj.startDate.split('T')[0] : '—'} {t('auto.إلى_17d96a')}{' '}
                            {proj.endDate ? proj.endDate.split('T')[0] : t('auto.مفتوح_5b490e')}
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
                            title={t('auto.تعديل_المشروع_6a18e9')}
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
                            title={t('auto.حذف_المشروع_34393c')}
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.مشروع_5b433f')}</span>
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
        title={t('auto.تأكيد_حذف_المشروع_3d2800')}
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
              {t('auto.إلغاء_5987b3')}</button>
            <button
              type="button"
              onClick={handleConfirmDelete}
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
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_حذف_ا_479702')}<strong style={{ color: 'var(--text-heading)' }}>"{deletingProject?.name}"</strong>{t('auto.k_61f')}</p>
      </Modal>
    </div>
  );
};
