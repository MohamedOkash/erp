import { useI18n } from '../../i18n/I18nContext';
import React, { useState } from 'react';
import type { ProductionRecord } from '../../api/production.api';
import { productionApi } from '../../api/production.api';
import { useAuth } from '../../contexts/AuthContext';
import { ApprovalTimeline } from './ApprovalTimeline';
import { Modal } from '../../components/Modal';
import {
  Loader2,
  Layers,
  Building,
  CheckSquare,
  HardHat,
  Calendar,
  Users,
  Send,
  Compass,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ProductionDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  record: ProductionRecord | null;
  onRecordUpdated: () => void;
  onRequestCorrection?: (record: ProductionRecord) => void;
}

export const ProductionDetailView: React.FC<ProductionDetailViewProps> = ({
  isOpen,
  onClose,
  record,
  onRecordUpdated,
  onRequestCorrection,
}) => {
  const { t } = useI18n();
  const { hasRole } = useAuth();
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const target = Number(record.targetQuantity ?? (record as any).target_quantity ?? 0);
  const actual = Number(record.actualQuantity ?? (record as any).actual_quantity ?? 0);
  const ratio = target > 0 ? Math.round((actual / target) * 100) : 0;

  const projectName = record.projectName || (record as any).project_name || t('auto.مشروع_5b433f');
  const branchName = record.branchName || (record as any).branch_name || t('auto.فرع_184029');
  const workItemName = record.workItemName || (record as any).work_item_name || t('auto.بند_عمل_4ad23b');
  const workAreaName = record.workAreaName || (record as any).work_area_name || null;
  const supervisorName = record.supervisorName || (record as any).supervisor_name || '—';
  const stageName = record.stageName || (record as any).stage_name || null;

  const workersList = (record.workers || []).map((w: any) => ({
    id: w.id,
    employeeName: w.employeeName || w.employee_name || t('auto.عامل_2ec042'),
    employeeCode: w.employeeCode || w.employee_code || '—',
    workerType: w.workerType || w.worker_type || 'individual',
    individualQuantity: Number(w.individualQuantity ?? w.individual_quantity ?? 0),
    hoursWorked: Number(w.hoursWorked ?? w.hours_worked ?? 8),
    overtimeHours: Number(w.overtimeHours ?? w.overtime_hours ?? 0),
  }));

  const canSupervisorApprove = hasRole(['supervisor', 'admin', 'company_admin', 'super_admin']);
  const canEngineerApprove = hasRole(['engineer', 'admin', 'company_admin', 'super_admin']);
  const canFinalApprove = hasRole(['admin', 'company_admin', 'super_admin']);

  const handleApprove = async (step: 'submit' | 'supervisor' | 'engineer' | 'final') => {
    setIsApproving(true);
    setError(null);
    try {
      await productionApi.approveStep(record.id, step);
      setSuccessMsg(t('auto.تمت_ترقية_واعتماد_مرحلة_السجل__19a38e'));
      onRecordUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تنفيذ_عملية_الاعتماد_787a5e'));
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('auto.تفاصيل_تقرير_الإنتاجية_اليومي_140e92')}
      subtitle={`المعرف: ${record.id}`}
      icon={<Layers size={22} />}
      maxWidth="3xl"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            {record.status === 'final_approved' && onRequestCorrection && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestCorrection(record);
                }}
                className="btn btn-secondary"
                style={{ gap: '0.4rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
              >
                <RotateCcw size={15} />
                <span>{t('auto.طلب_تصحيح_Correction_Request_71634a')}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('auto.إغلاق_59834d')}</button>

            {/* Step 1: Submit */}
            {record.status === 'draft' && (
              <button
                type="button"
                onClick={() => handleApprove('submit')}
                className="btn btn-primary"
                disabled={isApproving}
                style={{ gap: '0.4rem' }}
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>{t('auto.تقديم_السجل_للاعتماد_Submit_1fa6c1')}</span>
              </button>
            )}

            {/* Step 2: Supervisor Approve */}
            {record.status === 'submitted' && (
              <button
                type="button"
                onClick={() => handleApprove('supervisor')}
                className="btn btn-primary"
                disabled={!canSupervisorApprove || isApproving}
                style={{
                  gap: '0.4rem',
                  background: canSupervisorApprove ? '#d97706' : undefined,
                  opacity: canSupervisorApprove ? 1 : 0.5,
                  cursor: canSupervisorApprove ? 'pointer' : 'not-allowed',
                }}
                title={!canSupervisorApprove ? t('auto.يتطلب_دور_مشرف_معتمد_Superviso_5ca054') : ''}
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <HardHat size={16} />}
                <span>{t('auto.اعتماد_المشرف_Supervisor_Appro_691cf9')}</span>
              </button>
            )}

            {/* Step 3: Engineer Approve */}
            {record.status === 'supervisor_approved' && (
              <button
                type="button"
                onClick={() => handleApprove('engineer')}
                className="btn btn-primary"
                disabled={!canEngineerApprove || isApproving}
                style={{
                  gap: '0.4rem',
                  background: canEngineerApprove ? '#0284c7' : undefined,
                  opacity: canEngineerApprove ? 1 : 0.5,
                  cursor: canEngineerApprove ? 'pointer' : 'not-allowed',
                }}
                title={!canEngineerApprove ? t('auto.يتطلب_دور_مهندس_معتمد_Engineer_5c5b10') : ''}
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <Compass size={16} />}
                <span>{t('auto.اعتماد_المهندس_Engineer_Approv_11312b')}</span>
              </button>
            )}

            {/* Step 4: Final Approve */}
            {record.status === 'engineer_approved' && (
              <button
                type="button"
                onClick={() => handleApprove('final')}
                className="btn btn-primary"
                disabled={!canFinalApprove || isApproving}
                style={{
                  gap: '0.4rem',
                  background: canFinalApprove ? '#059669' : undefined,
                  opacity: canFinalApprove ? 1 : 0.5,
                  cursor: canFinalApprove ? 'pointer' : 'not-allowed',
                }}
                title={!canFinalApprove ? t('auto.يتطلب_صلاحية_مدير_النظام_Admin_751bd2') : ''}
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                <span>{t('auto.الاعتماد_النهائي_والإغلاق_Fina_668743')}</span>
              </button>
            )}
          </div>
        </div>
      }
    >
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

      {/* Info Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="glass-card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={13} /> {t('auto.التاريخ_7f54ad')}</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
            {record.date ? record.date.split('T')[0] : '—'}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Building size={13} /> {t('auto.الفرع_والمشروع_58ce26')}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
            {projectName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{branchName}</div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckSquare size={13} /> {t('auto.بند_وموقع_العمل_22a265')}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#60a5fa', marginTop: '0.2rem' }}>
            {workItemName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {workAreaName || t('auto.كامل_الموقع_2b70b5')} {stageName ? `• ${stageName}` : ''}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <HardHat size={13} /> {t('auto.المشرف_المسؤول_178a71')}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
            {supervisorName}
          </div>
        </div>
      </div>

      {/* Quantities & Visual Progress Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          background: 'rgba(15, 23, 42, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('auto.نسبة_إنجاز_المستهدف_6fb7e5')}</span>
            <strong style={{ fontSize: '1.2rem', color: ratio >= 100 ? '#34d399' : ratio >= 80 ? '#60a5fa' : '#f87171' }}>
              {ratio}%
            </strong>
          </div>

          <div style={{ fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>{t('auto.الفعلي_7f5ec5')}</span>
            <strong style={{ color: '#60a5fa', fontSize: '1.1rem' }}>{actual}</strong>
            <span style={{ color: 'var(--text-dim)' }}> {t('auto.المستهدف_7b953c')}</span>
            <strong>{target}</strong>
          </div>
        </div>

        {/* Progress Track */}
        <div
          style={{
            width: '100%',
            height: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(ratio, 100)}%`,
              height: '100%',
              background:
                ratio >= 100
                  ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                  : ratio >= 80
                  ? 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)'
                  : 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
              transition: 'width var(--transition-normal)',
            }}
          />
        </div>
      </div>

      {/* Workers Allocation Table */}
      {workersList.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
            <Users size={16} color="#60a5fa" />
            <span>{t('auto.توزيع_حصص_العمالة_المشاركة_حسب_59be03')}</span>
          </h4>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
              <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.6rem 0.8rem' }}>{t('auto.اسم_العامل_2d8f2a')}</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>{t('auto.الكود_59a408')}</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>{t('auto.النوع_59a413')}</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>{t('auto.الكمية_الفردية_202074')}</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>{t('auto.ساعات_العمل_51311a')}</th>
                </tr>
              </thead>
              <tbody>
                {workersList.map((w, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{w.employeeName}</td>
                    <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'monospace', color: 'var(--text-dim)' }}>
                      {w.employeeCode}
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem' }}>
                      <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                        {w.workerType === 'team' ? t('auto.فريق_2efcd4') : t('auto.فردي_2efca0')}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#60a5fa' }}>
                      {w.individualQuantity}
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem' }}>{w.hoursWorked} {t('auto.ساعة_2e9486')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* State Machine Timeline */}
      <div style={{ marginBottom: '1.5rem' }}>
        <ApprovalTimeline record={record} />
      </div>
    </Modal>
  );
};
