import { useI18n } from '../i18n/I18nContext';
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { WheelDatePicker, WheelTimePicker } from './WheelPicker';
import { attendancePoliciesApi } from '../api/attendance-policies.api';
import type { AttendancePolicy, CreateAttendancePolicyPayload } from '../api/attendance-policies.api';
import type { Project } from '../api/projects.api';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Calendar,
  Building,
  Zap,
  Coffee,
  Check,
} from 'lucide-react';

interface AttendancePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onPolicyChanged?: () => void;
}

export const AttendancePolicyModal: React.FC<AttendancePolicyModalProps> = ({
  isOpen,
  onClose,
  projects,
  onPolicyChanged,
}) => {
  const { t } = useI18n();
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form mode: null = list, 'create' = new, policy = edit
  const [editingPolicy, setEditingPolicy] = useState<AttendancePolicy | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateAttendancePolicyPayload>({
    projectId: null,
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    graceMinutes: 15,
    breakMinutes: 60,
    overtimeThresholdHours: 8.0,
    overtimeMultiplier: 1.5,
    effectiveFrom: new Date().toISOString().split('T')[0],
    isActive: true,
  });

  const loadPolicies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await attendancePoliciesApi.getPolicies();
      setPolicies(data);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_سياسات_الحضور_والدوا_76f466'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPolicies();
      setIsFormOpen(false);
      setEditingPolicy(null);
    }
  }, [isOpen]);

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setFormData({
      projectId: null,
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      graceMinutes: 15,
      breakMinutes: 60,
      overtimeThresholdHours: 8.0,
      overtimeMultiplier: 1.5,
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (policy: AttendancePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      projectId: policy.projectId || null,
      shiftStartTime: policy.shiftStartTime || '08:00',
      shiftEndTime: policy.shiftEndTime || '17:00',
      graceMinutes: policy.graceMinutes ?? 15,
      breakMinutes: policy.breakMinutes ?? 60,
      overtimeThresholdHours: policy.overtimeThresholdHours ?? 8.0,
      overtimeMultiplier: policy.overtimeMultiplier ?? 1.5,
      effectiveFrom: policy.effectiveFrom ? policy.effectiveFrom.split('T')[0] : '2026-01-01',
      isActive: policy.isActive ?? true,
    });
    setIsFormOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      if (editingPolicy) {
        await attendancePoliciesApi.updatePolicy(editingPolicy.id, formData);
        setSuccessMsg(t('auto.تم_تحديث_سياسة_الحضور_بنجاح_45e5f2'));
      } else {
        await attendancePoliciesApi.createPolicy(formData);
        setSuccessMsg(t('auto.تم_إنشاء_سياسة_الحضور_الجديدة__43a411'));
      }
      setIsFormOpen(false);
      setEditingPolicy(null);
      loadPolicies();
      onPolicyChanged?.();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_سياسة_الحضور_185102'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!window.confirm(t('auto.هل_أنت_متأكد_من_رغبتك_في_إلغاء_27bb28'))) return;
    setIsSaving(true);
    try {
      await attendancePoliciesApi.deletePolicy(id);
      setSuccessMsg(t('auto.تم_إلغاء_تنشيط_السياسة_بنجاح_1aded0'));
      loadPolicies();
      onPolicyChanged?.();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حذف_السياسة_36f68f'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('auto.إدارة_وتخصيص_سياسات_الحضور_وال_2cc2a9')}
      icon={<Clock size={22} color="#38bdf8" />}
      maxWidth="xl"
      footer={
        !isFormOpen ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t('auto.سياسات_الحضور_تحدد_مواعيد_الدخ_4e99df')}</span>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('auto.إغلاق_59834d')}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button
              type="submit"
              form="attendance-policy-form"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ gap: '0.4rem' }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{editingPolicy ? t('auto.حفظ_تعديلات_السياسة_2dd90e') : t('auto.حفظ_وإنشاء_السياسة_4b9a42')}</span>
            </button>
          </div>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Messages */}
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
              fontSize: '0.85rem',
            }}
          >
            <CheckCircle2 size={16} />
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
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Top Header / Action */}
        {!isFormOpen ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)' }}>{t('auto.سياسات_الدوام_الحالية_7db79b')}</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t('auto.يتم_تطبيق_السياسة_الأحدث_سريان_60e172')}</p>
              </div>
              <button type="button" onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.4rem' }}>
                <Plus size={16} />
                <span>{t('auto.إضافة_سياسة_جديدة_34564a')}</span>
              </button>
            </div>

            {/* List */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <span>{t('auto.جاري_تحميل_السياسات_17a149')}</span>
              </div>
            ) : policies.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-subtle)',
                }}
              >
                <Clock size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('auto.لا_توجد_سياسات_مسجلة_حاليا_5afefa')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                {policies.map((p) => {
                  const isGeneral = !p.projectId;
                  return (
                    <div
                      key={p.id}
                      className="glass-card"
                      style={{
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderLeft: isGeneral ? '4px solid #38bdf8' : '4px solid #a855f7',
                        background: 'var(--bg-surface-elevated)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                            {isGeneral ? t('auto.السياسة_العامة_للمنشأة_52da9d') : `🏗️ مشروع: ${p.projectName || t('auto.مشروع_مخصص_5b4a40')}`}
                          </span>
                          {p.isActive ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                              {t('auto.نشطة_2f21c0')}</span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                              {t('auto.معطلة_5b459b')}</span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {t('auto.سارية_من_29a3f6')}{p.effectiveFrom}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={13} color="#38bdf8" />
                            <span>{t('auto.مواعيد_الدوام_4795ed')}<strong>{p.shiftStartTime} — {p.shiftEndTime}</strong></span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Shield size={13} color="#34d399" />
                            <span>{t('auto.فترة_السماح_37fcd0')}<strong>{p.graceMinutes} {t('auto.دقيقة_5a13f5')}</strong></span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Coffee size={13} color="#fbbf24" />
                            <span>{t('auto.الاستراحة_2ae277')}<strong>{p.breakMinutes} {t('auto.دقيقة_5a13f5')}</strong></span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Zap size={13} color="#60a5fa" />
                            <span>{t('auto.بدء_الإضافي_بعد_43d8d3')}<strong>{p.overtimeThresholdHours} {t('auto.ساعات_5a3fca')}</strong> {t('auto.معامل_2563cc')}{p.overtimeMultiplier})</span>
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}
                        >
                          <Edit2 size={13} />
                          <span>{t('auto.تعديل_59c903')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePolicy(p.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.6rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                          title={t('auto.حذف_تعطيل_6e6736')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Create / Edit Form */
          <form id="attendance-policy-form" onSubmit={handleSavePolicy} className="animate-fade-in">
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit2 size={16} color="#38bdf8" />
                  <span>{editingPolicy ? t('auto.تعديل_سياسة_الحضور_1f86a1') : t('auto.إضافة_سياسة_حضور_جديدة_1b5f36')}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                >
                  {t('auto.إلغاء_والعودة_للقائمة_37cfad')}</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Project selector */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Building size={14} />
                    <span>{t('auto.نطاق_السياسة_المشروع_أو_عام_5f4b0b')}</span>
                  </label>
                  <select
                    className="input-field"
                    value={formData.projectId || ''}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value || null })}
                  >
                    <option value="">{t('auto.السياسة_العامة_لجميع_مشاريع_ال_720348')}</option>
                    {projects.map((prj) => (
                      <option key={prj.id} value={prj.id}>
                        {t('auto.مخصصة_لمشروع_27f633')}{prj.name} ({prj.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Effective From */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Calendar size={14} />
                    <span>{t('auto.تاريخ_بدء_سريان_السياسة_28954e')}</span>
                  </label>
                  <WheelDatePicker
                    required
                    value={formData.effectiveFrom}
                    onChange={(val) => setFormData({ ...formData, effectiveFrom: val })}
                  />
                </div>

                {/* Shift Start Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Clock size={14} />
                    <span>{t('auto.ميعاد_بداية_الدوام_Shift_Start_62d700')}</span>
                  </label>
                  <WheelTimePicker
                    required
                    value={formData.shiftStartTime}
                    onChange={(val) => setFormData({ ...formData, shiftStartTime: val })}
                  />
                </div>

                {/* Shift End Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Clock size={14} />
                    <span>{t('auto.ميعاد_نهاية_الدوام_Shift_End_649e1a')}</span>
                  </label>
                  <WheelTimePicker
                    required
                    value={formData.shiftEndTime}
                    onChange={(val) => setFormData({ ...formData, shiftEndTime: val })}
                  />
                </div>

                {/* Grace Minutes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Shield size={14} />
                    <span>{t('auto.فترة_السماح_بالدقائق_Grace_Per_5e8975')}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    required
                    className="input-field"
                    placeholder="15"
                    value={formData.graceMinutes}
                    onChange={(e) => setFormData({ ...formData, graceMinutes: Number(e.target.value) })}
                  />
                </div>

                {/* Break Minutes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Coffee size={14} />
                    <span>{t('auto.مدة_الاستراحة_بالدقائق_Break_341895')}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="240"
                    required
                    className="input-field"
                    placeholder="60"
                    value={formData.breakMinutes}
                    onChange={(e) => setFormData({ ...formData, breakMinutes: Number(e.target.value) })}
                  />
                </div>

                {/* Overtime Threshold */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Zap size={14} />
                    <span>{t('auto.بدء_الإضافي_بعد_ساعات_عمل_صافي_6ba845')}</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    step="0.5"
                    required
                    className="input-field"
                    placeholder="8.0"
                    value={formData.overtimeThresholdHours}
                    onChange={(e) => setFormData({ ...formData, overtimeThresholdHours: Number(e.target.value) })}
                  />
                </div>

                {/* Overtime Multiplier */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Zap size={14} />
                    <span>{t('auto.معامل_احتساب_الساعة_الإضافية_6adaa7')}</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.25"
                    required
                    className="input-field"
                    placeholder="1.5"
                    value={formData.overtimeMultiplier}
                    onChange={(e) => setFormData({ ...formData, overtimeMultiplier: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Is Active check */}
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="policyIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="policyIsActive" style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-heading)' }}>
                  {t('auto.تفعيل_هذه_السياسة_فورا_للاستخد_8e8ad4')}</label>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
