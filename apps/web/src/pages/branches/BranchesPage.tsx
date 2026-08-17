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
      setError(err.message || 'فشل تحميل بيانات الفروع');
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
        setSuccessMsg('تم تحديث بيانات الفرع بنجاح');
      } else {
        await branchesApi.create(payload as CreateBranchPayload);
        setSuccessMsg('تم إنشاء الفرع الجديد بنجاح');
      }
      setIsModalOpen(false);
      loadBranches();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بيانات الفرع');
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
      setError(err.message || 'فشل حذف الفرع');
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute summary stats
  const activeCount = branches.filter((b) => b.isActive).length;
  const inactiveCount = total - activeCount;

  const statsItems = [
    {
      label: 'إجمالي الفروع الإدارية',
      value: total,
      helper: `${branches.length} معروضين حالياً`,
      icon: <Building size={22} />,
      color: '#60a5fa',
    },
    {
      label: 'الفروع النشطة والتشغيلية',
      value: activeCount,
      helper: 'تستقبل مشاريع وتكاليف',
      icon: <Check size={22} />,
      color: '#34d399',
    },
    {
      label: 'الفروع المعطلة أو المؤرشفة',
      value: inactiveCount,
      helper: 'مغلقة إدارياً',
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
            <span>بحث باسم الفرع أو الكود</span>
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
          <label className="form-label">الحالة</label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة الحالات</option>
            <option value="true">النشطة فقط</option>
            <option value="false">المعطلة فقط</option>
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
                <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>اسم الفرع</th>
                  <th style={{ padding: '1rem' }}>كود الفرع</th>
                  <th style={{ padding: '1rem' }}>الموقع / العنوان</th>
                  <th style={{ padding: '1rem' }}>الحالة</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      لا توجد فروع مسجلة مطابقة للبحث
                    </td>
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
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>{b.name}</div>
                        {b.phone && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>هاتف: {b.phone}</div>
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
                          <span>{b.location || b.address || 'غير محدد'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {b.isActive ? (
                          <span className="badge badge-success">نشط</span>
                        ) : (
                          <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                            معطل
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(b)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                            title="تعديل الفرع"
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
                            title="حذف الفرع"
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
              عرض {startRecord}–{endRecord} من إجمالي {total} فرع
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
        title="تأكيد حذف الفرع"
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
          هل أنت متأكد من رغبتك في حذف الفرع <strong style={{ color: '#ffffff' }}>"{deletingBranch?.name}"</strong>؟ هذا الإجراء لا يمكن التراجع عنه.
        </p>
      </Modal>
    </div>
  );
};
