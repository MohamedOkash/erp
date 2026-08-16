import React, { useEffect, useState, useCallback } from 'react';
import { branchesApi } from '../../api/branches.api';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '../../api/branches.api';
import { BranchFormModal } from './BranchFormModal';
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
} from 'lucide-react';

export const BranchesPage: React.FC = () => {
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
            <Building size={28} color="#60a5fa" />
            <span>إدارة الفروع والمكاتب</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            سجل الفروع الجغرافية والمكاتب الإقليمية التابعة للشركة وربطها بالمشاريع والعمالة.
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>إضافة فرع جديد</span>
        </button>
      </div>

      {/* Success / Error Toast Alerts */}
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
      <div className="glass-card" style={{ overflow: 'hidden' }}>
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل الفروع...</p>
                  </td>
                </tr>
              ) : branches.length === 0 ? (
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
          <span>إجمالي الفروع: {total}</span>
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
      <BranchFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        editingBranch={editingBranch}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Modal */}
      {deletingBranch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
        >
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171', marginBottom: '1rem' }}>
              <Trash2 size={24} />
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>تأكيد حذف الفرع</h3>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              هل أنت متأكد من رغبتك في حذف الفرع <strong style={{ color: '#ffffff' }}>"{deletingBranch.name}"</strong>؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
          </div>
        </div>
      )}
    </div>
  );
};
