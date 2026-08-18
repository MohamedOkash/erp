import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect } from 'react';
import type { RequestTransferPayload } from '../../api/transfers.api';
import { transfersApi } from '../../api/transfers.api';
import type { Employee } from '../../api/employees.api';
import { employeesApi } from '../../api/employees.api';
import type { Project } from '../../api/projects.api';
import { projectsApi } from '../../api/projects.api';
import { Modal } from '../../components/Modal';
import { WheelDatePicker } from '../../components/WheelPicker';
import {
  Loader2,
  ArrowLeftRight,
  User,
  FolderKanban,
  AlertCircle,
  Clock,
  FileText,
} from 'lucide-react';

interface TransferRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferRequestModal: React.FC<TransferRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [fromProjectId, setFromProjectId] = useState('');
  const [toProjectId, setToProjectId] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setReason('');
      setUrgency('normal');
      setTransferDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [empRes, projRes] = await Promise.all([
        employeesApi.list({ isActive: true, limit: 100 }),
        projectsApi.list(),
      ]);
      setEmployees(empRes.data || []);
      setProjects(projRes.data || []);
      if (empRes.data && empRes.data.length > 0) {
        setEmployeeId(empRes.data[0].id);
      }
      if (projRes.data && projRes.data.length > 0) {
        setToProjectId(projRes.data[0].id);
        if (projRes.data.length > 1) {
          setFromProjectId(projRes.data[1].id);
        }
      }
    } catch (err: any) {
      setError(err?.message || t('auto.تعذر_تحميل_البيانات_4c70dd'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !toProjectId) {
      setError(t('auto.يرجى_اختيار_الموظف_والمشروع_ال_455fdd'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: RequestTransferPayload = {
        employeeId,
        fromProjectId: fromProjectId || undefined,
        toProjectId,
        reason: reason.trim() || undefined,
        urgency,
        transferDate,
      };
      await transfersApi.request(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('auto.فشل_إرسال_طلب_النقل_5a7d3d'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('auto.طلب_نقل_كادر_أو_مشرف_ميداني_5eb41a')}
      icon={<ArrowLeftRight size={22} color="#60a5fa" />}
      maxWidth="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
            {t('auto.إلغاء_5987b3')}</button>
          <button type="submit" form="transfer-request-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{t('auto.إرسال_طلب_النقل_للمدير_208d4f')}</span>
          </button>
        </div>
      }
    >
      <form id="transfer-request-form" onSubmit={handleSubmit}>

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
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
              <label className="form-label">
                <User size={14} />
                <span>{t('auto.المشرف_أو_الكادر_المطلوب_نقله_53188e')}</span>
              </label>
              <select
                required
                className="input-field"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — ({emp.roleType || t('auto.موظف_2f1f2e')})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <FolderKanban size={14} />
                <span>{t('auto.من_مشروع_الموقع_الحالي_66e6f5')}</span>
              </label>
              <select
                className="input-field"
                value={fromProjectId}
                onChange={(e) => setFromProjectId(e.target.value)}
              >
                <option value="">{t('auto.التعيين_الحالي_التلقائي_6b987b')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <FolderKanban size={14} color="#34d399" />
                <span style={{ color: '#34d399', fontWeight: 700 }}>{t('auto.إلى_مشروع_الموقع_المطلوب_480c9a')}</span>
              </label>
              <select
                required
                className="input-field"
                style={{ borderColor: 'rgba(52, 211, 153, 0.4)' }}
                value={toProjectId}
                onChange={(e) => setToProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.تاريخ_التنفيذ_المطلوب_2fbe46')}</label>
              <WheelDatePicker
                required
                value={transferDate}
                onChange={(val) => setTransferDate(val)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Clock size={14} />
                <span>{t('auto.درجة_الأهمية_والاستعجال_1548dd')}</span>
              </label>
              <select
                className="input-field"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
              >
                <option value="normal">{t('auto.عادي_جدولة_اعتيادية_196655')}</option>
                <option value="urgent">{t('auto.عاجل_على_وجه_الضرورة_القصوى_3d7678')}</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
              <label className="form-label">
                <FileText size={14} />
                <span>{t('auto.سبب_ومبررات_طلب_النقل_5a04fd')}</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder={t('auto.مثال_حاجة_ماسة_للإشراف_على_أعم_4e2910')}
                className="input-field"
                style={{ resize: 'vertical' }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

      </form>
    </Modal>
  );
};
