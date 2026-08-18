import React, { useEffect, useState, useCallback } from 'react';
import { branchesApi } from '../../api/branches.api';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '../../api/branches.api';
import { BranchFormModal } from './BranchFormModal';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { useI18n } from '../../i18n/I18nContext';
import {
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Hash,
  Check,
  XCircle,
} from 'lucide-react';

export const BranchesPage: React.FC = () => {
  const { t } = useI18n();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirm State
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await branchesApi.list({
        page,
        limit,
        search: search.trim() || undefined,
        isActive: statusFilter === '' ? undefined : statusFilter === 'true',
      });
      setBranches(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_بيانات_الفروع_175a7c'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: CreateBranchPayload | UpdateBranchPayload) => {
    setIsSaving(true);
    setError(null);
    try {
      if (editingBranch) {
        await branchesApi.update(editingBranch.id, payload);
        setSuccessMsg(t('auto.تم_تحديث_بيانات_الفرع_بنجاح_77b520'));
      } else {
        await branchesApi.create(payload as CreateBranchPayload);
        setSuccessMsg(t('auto.تم_إنشاء_الفرع_الجديد_بنجاح_7bc327'));
      }
      setIsModalOpen(false);
      loadBranches();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_بيانات_الفرع_20ceec'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBranch) return;
    setIsDeleting(true);
    try {
      await branchesApi.remove(deletingBranch.id);
      setSuccessMsg(`تم حذف الفرع "${deletingBranch.name}" بنجاح`);
      setDeletingBranch(null);
      loadBranches();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حذف_الفرع_62818c'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute summary stats
  const activeCount = branches.filter((b) => b.isActive).length;
  const inactiveCount = total - activeCount;

  const statsItems = [
    {
      label: t('auto.إجمالي_الفروع_الإدارية_6eb51f'),
      value: total,
      helper: `${branches.length} معروضين حالياً`,
      icon: <Building size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.الفروع_النشطة_والتشغيلية_1a1746'),
      value: activeCount,
      helper: t('auto.تستقبل_مشاريع_وتكاليف_737235'),
      icon: <Check size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.الفروع_المعطلة_أو_المؤرشفة_35664c'),
      value: inactiveCount,
      helper: t('auto.مغلقة_إداريا_275fd7'),
      icon: <XCircle size={22} />,
      color: '#f87171',
    },
  ];

  const startRecord = branches.length === 0 ? 0 : (page - 1) * limit + 1;
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
            <Building size={26} color="#60a5fa" />
            <span>{t('resources.branches_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.branches')}
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>{t('resources.add_branch')}</span>
        </button>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && branches.length === 0} />

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
            <span>{t('auto.بحث_باسم_الفرع_أو_الكود_28852f')}</span>
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
          <label className="form-label">{t('auto.الحالة_252d72')}</label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('auto.كافة_الحالات_3318a9')}</option>
            <option value="true">{t('auto.النشطة_فقط_4eb69d')}</option>
            <option value="false">{t('auto.المعطلة_فقط_6b59cd')}</option>
          </select>
        </div>
      </div>

      {/* Branches Table */}
      {isLoading && branches.length === 0 ? (
        <TableSkeleton rows={6} columns={5} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>{t('auto.اسم_الفرع_61a0aa')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.كود_الفرع_6d339b')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الموقع_العنوان_136885')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الحالة_252d72')}</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_فروع_مسجلة_مطابقة_للبح_384aec')}</td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1.05rem' }}>{b.name}</div>
                        {b.phone && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('auto.هاتف_5b5965')}{b.phone}</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          <Hash size={12} />
                          <span>{b.code || '—'}</span>
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={14} color="#60a5fa" />
                          <span>{b.location || b.address || t('auto.غير_محدد_1567b8')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {b.isActive ? (
                          <span className="badge badge-success">{t('auto.نشط_185349')}</span>
                        ) : (
                          <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                            {t('auto.معطل_2f1ba8')}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(b)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title={t('auto.تعديل_الفرع_acfb26')}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingBranch(b)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.25)',
                            }}
                            title={t('auto.حذف_الفرع_30012f')}
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.فرع_184029')}</span>
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
      <BranchFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        editingBranch={editingBranch}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingBranch}
        onClose={() => setDeletingBranch(null)}
        title={t('auto.تأكيد_حذف_الفرع_1c70b3')}
        icon={<Trash2 size={22} color="#f87171" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeletingBranch(null)}
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
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_حذف_ا_4c8746')}<strong style={{ color: 'var(--text-heading)' }}>"{deletingBranch?.name}"</strong>{t('auto.هذا_الإجراء_لا_يمكن_التراجع_عن_66852b')}</p>
      </Modal>
    </div>
  );
};
