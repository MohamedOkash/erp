import React, { useEffect, useState, useCallback } from 'react';
import type { StaffTransfer } from '../../api/transfers.api';
import { transfersApi } from '../../api/transfers.api';
import type { Project } from '../../api/projects.api';
import { projectsApi } from '../../api/projects.api';
import { TransferRequestModal } from './TransferRequestModal';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
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
  const { t } = useI18n();
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
      setError(err?.message || t('auto.فشل_تحميل_سجل_طلبات_النقل_a78b29'));
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
      setSuccessMsg(t('auto.تمت_الموافقة_على_طلب_النقل_بنج_4a2599'));
      loadTransfers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('auto.فشل_اعتماد_طلب_النقل_3e47c7'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt(t('auto.يرجى_ذكر_سبب_رفض_طلب_النقل_4bd88f'));
    if (reason === null) return;

    setActionLoadingId(id);
    try {
      await transfersApi.reject(id, reason);
      setSuccessMsg(t('auto.تم_رفض_طلب_النقل_47ea34'));
      loadTransfers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('auto.فشل_رفض_طلب_النقل_5bbd8f'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecute = async (id: string) => {
    if (!window.confirm(t('auto.هل_تريد_تنفيذ_النقل_الفعلي_وتح_1f3a29'))) return;

    setActionLoadingId(id);
    try {
      await transfersApi.execute(id);
      setSuccessMsg(t('auto.تم_تنفيذ_النقل_الفعلي_وتحديث_ت_eb6656'));
      loadTransfers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('auto.فشل_تنفيذ_النقل_29814d'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>{t('auto.قيد_المراجعة_408549')}</span>;
      case 'approved':
        return <span className="badge badge-success">{t('auto.معتمد_وموافق_عليه_1e88c0')}</span>;
      case 'executed':
        return <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>{t('auto.تم_النقل_الفعلي_4b45f9')}</span>;
      case 'rejected':
        return <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>{t('auto.مرفوض_5b421e')}</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1380px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ArrowLeftRight size={28} color="#60a5fa" />
            <span>{t('operations.transfers_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('nav.links.transfers')}
          </p>
        </div>
        <button onClick={() => setIsRequestModalOpen(true)} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>{t('operations.request_transfer')}</span>
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
          <label className="form-label"><Filter size={14} /> <span>{t('auto.حالة_الطلب_27f5a2')}</span></label>
          <select className="input-field" value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}>
            <option value="">{t('auto.كافة_الحالات_3318a9')}</option>
            <option value="pending">{t('auto.قيد_المراجعة_Pending_d61fd8')}</option>
            <option value="approved">{t('auto.معتمد_Approved_5b77f6')}</option>
            <option value="executed">{t('auto.تم_النقل_الفعلي_Executed_6a3966')}</option>
            <option value="rejected">{t('auto.مرفوض_Rejected_19719a')}</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label"><Clock size={14} /> <span>{t('auto.درجة_الأهمية_68f37f')}</span></label>
          <select className="input-field" value={selectedUrgency} onChange={(e) => { setSelectedUrgency(e.target.value); setPage(1); }}>
            <option value="">{t('auto.كافة_الدرجات_32f848')}</option>
            <option value="urgent">{t('auto.عاجل_Urgent_2f7df9')}</option>
            <option value="normal">{t('auto.عادي_Normal_311903')}</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label"><FolderKanban size={14} /> <span>{t('auto.المشروع_7f28ee')}</span></label>
          <select className="input-field" value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setPage(1); }}>
            <option value="">{t('auto.كافة_المشاريع_65e01c')}</option>
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
                <th style={{ padding: '1rem' }}>{t('auto.الكادر_المشرف_1a5d06')}</th>
                <th style={{ padding: '1rem' }}>{t('auto.من_مشروع_4b0ba0')}</th>
                <th style={{ padding: '1rem' }}>{t('auto.إلى_مشروع_bbc0a4')}</th>
                <th style={{ padding: '1rem' }}>{t('auto.طالب_النقل_7dee0a')}</th>
                <th style={{ padding: '1rem' }}>{t('auto.السبب_والأهمية_3b462e')}</th>
                <th style={{ padding: '1rem' }}>{t('auto.التاريخ_7f54ad')}</th>
                <th style={{ padding: '1rem' }}>{t('auto.الحالة_252d72')}</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>{t('auto.جاري_تحميل_طلبات_النقل_d3f234')}</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    {t('auto.لا_توجد_طلبات_نقل_مسجلة_حاليا_581da6')}</td>
                </tr>
              ) : (
                transfers.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{item.employee_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {item.employee_role} {item.employee_code ? `(${item.employee_code})` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {item.from_project_name || '—'}
                    </td>
                    <td style={{ padding: '1rem', color: '#34d399', fontWeight: 600 }}>
                      {item.to_project_name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#ffffff' }}>{item.requester_name || item.requested_role}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.requested_role}</div>
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        {item.urgency === 'urgent' && (
                          <span className="badge badge-accent" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>{t('auto.عاجل_2ec012')}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason || ''}>
                        {item.reason || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {item.transfer_date ? new Date(item.transfer_date).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {getStatusBadge(item.status)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {isManagerOrAdmin && item.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              disabled={actionLoadingId === item.id}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
                              title={t('auto.موافقة_على_الطلب_4a4ff1')}
                            >
                              <Check size={14} /> <span>{t('auto.موافقة_e39f5c')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(item.id)}
                              disabled={actionLoadingId === item.id}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title={t('auto.رفض_الطلب_3ee027')}
                            >
                              <X size={14} /> <span>{t('auto.رفض_180606')}</span>
                            </button>
                          </>
                        )}
                        {isManagerOrAdmin && (item.status === 'approved' || item.status === 'pending') && (
                          <button
                            type="button"
                            onClick={() => handleExecute(item.id)}
                            disabled={actionLoadingId === item.id}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title={t('auto.تنفيذ_النقل_الفعلي_وتحديث_التع_109ca0')}
                          >
                            <Play size={14} /> <span>{t('auto.تنفيذ_النقل_42a24d')}</span>
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
          <span>{t('auto.إجمالي_طلبات_النقل_567614')}{total}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('auto.السابق_252abb')}</button>
            <span style={{ padding: '0.35rem 0.5rem' }}>{t('auto.صفحة_2ea914')}{page}</span>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={page * limit >= total} onClick={() => setPage(page + 1)}>{t('auto.التالي_252ecf')}</button>
          </div>
        </div>
      </div>

      {/* Transfer Request Modal */}
      <TransferRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg(t('auto.تم_تقديم_طلب_النقل_بنجاح_وهو_ق_142fc2'));
          loadTransfers();
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};
