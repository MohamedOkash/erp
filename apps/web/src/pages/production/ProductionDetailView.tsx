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
  const { hasRole } = useAuth();
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const target = Number(record.targetQuantity ?? (record as any).target_quantity ?? 0);
  const actual = Number(record.actualQuantity ?? (record as any).actual_quantity ?? 0);
  const ratio = target > 0 ? Math.round((actual / target) * 100) : 0;

  const projectName = record.projectName || (record as any).project_name || 'مشروع';
  const branchName = record.branchName || (record as any).branch_name || 'فرع';
  const workItemName = record.workItemName || (record as any).work_item_name || 'بند عمل';
  const workAreaName = record.workAreaName || (record as any).work_area_name || null;
  const supervisorName = record.supervisorName || (record as any).supervisor_name || '—';
  const stageName = record.stageName || (record as any).stage_name || null;

  const workersList = (record.workers || []).map((w: any) => ({
    id: w.id,
    employeeName: w.employeeName || w.employee_name || 'عامل',
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
      setSuccessMsg('تمت ترقية واعتماد مرحلة السجل بنجاح!');
      onRecordUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'فشل تنفيذ عملية الاعتماد');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل تقرير الإنتاجية اليومي"
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
                <span>طلب تصحيح (Correction Request)</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              إغلاق
            </button>

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
                <span>تقديم السجل للاعتماد (Submit)</span>
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
                title={!canSupervisorApprove ? 'يتطلب دور مشرف معتمد (Supervisor)' : ''}
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <HardHat size={16} />}
                <span>اعتماد المشرف (Supervisor Approve)</span>
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
                title={!canEngineerApprove ? 'يتطلب دور مهندس معتمد (Engineer)' : ''}
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <Compass size={16} />}
                <span>اعتماد المهندس (Engineer Approve)</span>
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
                title={!canFinalApprove ? 'يتطلب صلاحية مدير النظام (Admin)' : ''}
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                <span>الاعتماد النهائي والإغلاق (Final Approve)</span>
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
            <Calendar size={13} /> التاريخ
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
            {record.date ? record.date.split('T')[0] : '—'}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Building size={13} /> الفرع والمشروع
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
            {projectName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{branchName}</div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckSquare size={13} /> بند وموقع العمل
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#60a5fa', marginTop: '0.2rem' }}>
            {workItemName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {workAreaName || 'كامل الموقع'} {stageName ? `• ${stageName}` : ''}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.85rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <HardHat size={13} /> المشرف المسؤول
          </div>
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>نسبة إنجاز المستهدف: </span>
            <strong style={{ fontSize: '1.2rem', color: ratio >= 100 ? '#34d399' : ratio >= 80 ? '#60a5fa' : '#f87171' }}>
              {ratio}%
            </strong>
          </div>

          <div style={{ fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>الفعلي: </span>
            <strong style={{ color: '#60a5fa', fontSize: '1.1rem' }}>{actual}</strong>
            <span style={{ color: 'var(--text-dim)' }}> / المستهدف: </span>
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
            <span>توزيع حصص العمالة المشاركة (حسب السجل الميداني)</span>
          </h4>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
              <thead style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.6rem 0.8rem' }}>اسم العامل</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>الكود</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>النوع</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>الكمية الفردية</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>ساعات العمل</th>
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
                        {w.workerType === 'team' ? 'فريق' : 'فردي'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#60a5fa' }}>
                      {w.individualQuantity}
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem' }}>{w.hoursWorked} ساعة</td>
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
