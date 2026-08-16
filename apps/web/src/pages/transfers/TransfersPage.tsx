import React, { useEffect, useState, useCallback } from 'react';
import type { StaffTransfer } from '../../api/transfers.api';
import { transfersApi } from '../../api/transfers.api';
import type { Project } from '../../api/projects.api';
import { projectsApi } from '../../api/projects.api';
import { TransferRequestModal } from './TransferRequestModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeftRight,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  Play,
  Loader2,
  FolderKanban,
} from 'lucide-react';

export const TransfersPage: React.FC = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<StaffTransfer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Action processing
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Role check
  const roleCodes = (user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r.roleCode));
  const isManagerOrAdmin = roleCodes.some((r: string) =>
    ['project_manager', 'program_manager', 'admin', 'company_admin', 'super_admin'].includes(r),
  );

  const loadProjects = async () => {
    try {
      const res = await projectsApi.list();
      setProjects(res.data || []);
    } catch {
      // ignore
    }
  };

  const loadTransfers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await transfersApi.list({
        status: selectedStatus || undefined,
        urgency: selectedUrgency || undefined,
        projectId: selectedProject || undefined,
        page,
        limit,
      });
      setTransfers(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل سجل طلبات النقل');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedStatus, selectedUrgency, selectedProject]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await transfersApi.approve(id);
      setSuccessMsg('تمت الموافقة على طلب النقل بنجاح');
      loadTransfers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل اعتماد طلب النقل');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('يرجى ذكر سبب رفض طلب النقل:');
    if (reason === null) return;

    setActionLoadingId(id);
    try {
      await transfersApi.reject(id, reason);
      setSuccessMsg('تم رفض طلب النقل');
      loadTransfers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل رفض طلب النقل');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecute = async (id: string) => {
    if (!window.confirm('هل تريد تنفيذ النقل الفعلي وتحديث مشروع الكادر في النظام فوراً؟')) return;

    setActionLoadingId(id);
    try {
      await transfersApi.execute(id);
      setSuccessMsg('تم تنفيذ النقل الفعلي وتحديث تعيين الكادر بنجاح');
      loadTransfers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تنفيذ النقل');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>قيد المراجعة</span>;
      case 'approved':
        return <span className="badge badge-success">معتمد وموافق عليه</span>;
      case 'executed':
        return <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>تم النقل الفعلي</span>;
      case 'rejected':
        return <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>مرفوض</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1380px', margin: '0 auto' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ArrowLeftRight size={28} color="#60a5fa" />
            <span>نظام تنقل الكوادر والمشرفين الميدانيين</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            إدارة طلبات نقل المشرفين والفنيين بين المشاريع بناءً على الحاجة التشغيلية واعتماد الإدارة.
          </p>
        </div>
        <button onClick={() => setIsRequestModalOpen(true)} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>طلب نقل كادر</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--status-success-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <CheckCircle2 size={18} /> <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--status-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label"><Filter size={14} /> <span>حالة الطلب</span></label>
          <select className="input-field" value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}>
            <option value="">كافة الحالات</option>
            <option value="pending">قيد المراجعة (Pending)</option>
            <option value="approved">معتمد (Approved)</option>
            <option value="executed">تم النقل الفعلي (Executed)</option>
            <option value="rejected">مرفوض (Rejected)</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label"><Clock size={14} /> <span>درجة الأهمية</span></label>
          <select className="input-field" value={selectedUrgency} onChange={(e) => { setSelectedUrgency(e.target.value); setPage(1); }}>
            <option value="">كافة الدرجات</option>
            <option value="urgent">عاجل (Urgent)</option>
            <option value="normal">عادي (Normal)</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label"><FolderKanban size={14} /> <span>المشروع</span></label>
          <select className="input-field" value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setPage(1); }}>
            <option value="">كافة المشاريع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>الكادر / المشرف</th>
                <th style={{ padding: '1rem' }}>من مشروع</th>
                <th style={{ padding: '1rem' }}>إلى مشروع</th>
                <th style={{ padding: '1rem' }}>طالب النقل</th>
                <th style={{ padding: '1rem' }}>السبب والأهمية</th>
                <th style={{ padding: '1rem' }}>التاريخ</th>
                <th style={{ padding: '1rem' }}>الحالة</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل طلبات النقل...</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد طلبات نقل مسجلة حالياً
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{t.employee_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {t.employee_role} {t.employee_code ? `(${t.employee_code})` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {t.from_project_name || '—'}
                    </td>
                    <td style={{ padding: '1rem', color: '#34d399', fontWeight: 600 }}>
                      {t.to_project_name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#ffffff' }}>{t.requester_name || t.requested_role}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t.requested_role}</div>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        {t.urgency === 'urgent' && (
                          <span className="badge badge-accent" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>عاجل</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.reason || ''}>
                        {t.reason || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {t.transfer_date ? new Date(t.transfer_date).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {getStatusBadge(t.status)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {isManagerOrAdmin && t.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(t.id)}
                              disabled={actionLoadingId === t.id}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
                              title="موافقة على الطلب"
                            >
                              <Check size={14} /> <span>موافقة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(t.id)}
                              disabled={actionLoadingId === t.id}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title="رفض الطلب"
                            >
                              <X size={14} /> <span>رفض</span>
                            </button>
                          </>
                        )}
                        {isManagerOrAdmin && (t.status === 'approved' || t.status === 'pending') && (
                          <button
                            type="button"
                            onClick={() => handleExecute(t.id)}
                            disabled={actionLoadingId === t.id}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="تنفيذ النقل الفعلي وتحديث التعيين"
                          >
                            <Play size={14} /> <span>تنفيذ النقل</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>إجمالي طلبات النقل: {total}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
            <span style={{ padding: '0.35rem 0.5rem' }}>صفحة {page}</span>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={page * limit >= total} onClick={() => setPage(page + 1)}>التالي</button>
          </div>
        </div>
      </div>

      {/* Transfer Request Modal */}
      <TransferRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('تم تقديم طلب النقل بنجاح وهو قيد مراجعة الإدارة');
          loadTransfers();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};
