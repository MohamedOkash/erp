import React from 'react';
import type { ProductionRecord } from '../../api/production.api';
import {
  CheckCircle2,
  Clock,
  HardHat,
  Compass,
  ShieldCheck,
  Send,
  FileEdit,
  XCircle,
} from 'lucide-react';

interface ApprovalTimelineProps {
  record: ProductionRecord;
}

interface StepInfo {
  key: 'draft' | 'submitted' | 'supervisor_approved' | 'engineer_approved' | 'final_approved';
  title: string;
  roleLabel: string;
  icon: React.ReactNode;
  approverName?: string | null;
  timestamp?: string | null;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ record }) => {
  const stepsOrder: ('draft' | 'submitted' | 'supervisor_approved' | 'engineer_approved' | 'final_approved')[] = [
    'draft',
    'submitted',
    'supervisor_approved',
    'engineer_approved',
    'final_approved',
  ];

  const currentIdx = stepsOrder.indexOf(record.status);

  const steps: StepInfo[] = [
    {
      key: 'draft',
      title: 'إنشاء المسودة',
      roleLabel: 'مُسجل الإنتاج',
      icon: <FileEdit size={16} />,
      approverName: record.supervisorName || 'المسؤول الميداني',
      timestamp: record.createdAt,
    },
    {
      key: 'submitted',
      title: 'تقديم السجل للاعتماد',
      roleLabel: 'مسؤول الموقع',
      icon: <Send size={16} />,
      approverName: record.supervisorName || 'المشرف',
      timestamp: record.submittedAt,
    },
    {
      key: 'supervisor_approved',
      title: 'اعتماد المشرف الميداني',
      roleLabel: 'مشرف التنفيذ (Supervisor)',
      icon: <HardHat size={16} />,
      approverName: record.supervisorName,
      timestamp: record.supervisorApprovedAt,
    },
    {
      key: 'engineer_approved',
      title: 'اعتماد المهندس المسؤول',
      roleLabel: 'مهندس الموقع (Engineer)',
      icon: <Compass size={16} />,
      approverName: record.engineerName,
      timestamp: record.engineerApprovedAt,
    },
    {
      key: 'final_approved',
      title: 'الاعتماد النهائي والإغلاق',
      roleLabel: 'مدير المشروع / الإدارة (Admin)',
      icon: <ShieldCheck size={16} />,
      approverName: record.engineerName || 'الإدارة المركزية',
      timestamp: record.finalApprovedAt,
    },
  ];

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('ar-SA')} - ${d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div
      style={{
        padding: '1.25rem',
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <h4
        style={{
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          color: '#ffffff',
        }}
      >
        <Clock size={18} color="#60a5fa" />
        <span>مسار ودورة الاعتمادات الصارمة (State Machine Timeline)</span>
      </h4>

      {record.rejectionReason && (
        <div
          style={{
            padding: '0.65rem 1rem',
            background: 'var(--status-danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <XCircle size={16} />
          <span>سبب الرفض / الإعادة: {record.rejectionReason}</span>
        </div>
      )}

      {/* Stepper Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          position: 'relative',
        }}
      >
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          let statusBg = 'rgba(30, 41, 59, 0.5)';
          let statusBorder = 'rgba(255, 255, 255, 0.08)';
          let iconColor = 'var(--text-dim)';
          let badgeText = 'في الانتظار';
          let badgeBg = 'rgba(255, 255, 255, 0.05)';

          if (isCurrent) {
            statusBg = 'rgba(37, 99, 235, 0.15)';
            statusBorder = 'rgba(59, 130, 246, 0.5)';
            iconColor = '#60a5fa';
            badgeText = 'المرحلة الحالية';
            badgeBg = 'rgba(37, 99, 235, 0.3)';
          } else if (isCompleted) {
            statusBg = 'rgba(16, 185, 129, 0.1)';
            statusBorder = 'rgba(16, 185, 129, 0.4)';
            iconColor = '#34d399';
            badgeText = '✓ مكتمل';
            badgeBg = 'rgba(16, 185, 129, 0.2)';
          }

          return (
            <div
              key={step.key}
              style={{
                background: statusBg,
                border: `1px solid ${statusBorder}`,
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                position: 'relative',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: iconColor,
                  }}
                >
                  {isCompleted && !isCurrent ? <CheckCircle2 size={16} /> : step.icon}
                </div>

                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '12px',
                    background: badgeBg,
                    color: isCompleted ? '#34d399' : isCurrent ? '#60a5fa' : 'var(--text-dim)',
                    fontWeight: 600,
                  }}
                >
                  {badgeText}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
                {step.title}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {step.roleLabel}
              </div>

              {step.approverName && isCompleted && (
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: 'auto', paddingTop: '0.3rem' }}>
                  بواسطة: <span style={{ fontWeight: 600 }}>{step.approverName}</span>
                </div>
              )}

              {formatDate(step.timestamp) && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', direction: 'ltr', textAlign: 'right' }}>
                  {formatDate(step.timestamp)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
