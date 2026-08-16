import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
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
      setError(err.message || 'فشل تحميل سياسات الحضور والدوام');
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
        setSuccessMsg('تم تحديث سياسة الحضور بنجاح');
      } else {
        await attendancePoliciesApi.createPolicy(formData);
        setSuccessMsg('تم إنشاء سياسة الحضور الجديدة بنجاح');
      }
      setIsFormOpen(false);
      setEditingPolicy(null);
      loadPolicies();
      onPolicyChanged?.();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ سياسة الحضور');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء/حذف هذه السياسة؟')) return;
    setIsSaving(true);
    try {
      await attendancePoliciesApi.deletePolicy(id);
      setSuccessMsg('تم إلغاء تنشيط السياسة بنجاح');
      loadPolicies();
      onPolicyChanged?.();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حذف السياسة');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إدارة وتخصيص سياسات الحضور والدوام"
      icon={<Clock size={22} color="#38bdf8" />}
      maxWidth="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            * سياسات الحضور تحدد مواعيد الدخول، دقائق السماح، واحتساب الإضافي آلياً وبشكل مرن
          </span>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            إغلاق
          </button>
        </div>
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
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>سياسات الدوام الحالية</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  يتم تطبيق السياسة الأحدث سرياناً على مستوى المشروع، أو السياسة العامة للمنشأة عند عدم التخصيص
                </p>
              </div>
              <button type="button" onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.4rem' }}>
                <Plus size={16} />
                <span>إضافة سياسة جديدة</span>
              </button>
            </div>

            {/* List */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <span>جاري تحميل السياسات...</span>
              </div>
            ) : policies.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-subtle)',
                }}
              >
                <Clock size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>لا توجد سياسات مسجلة حالياً</p>
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
                        background: 'rgba(15, 23, 42, 0.6)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                            {isGeneral ? '🏢 السياسة العامة للمنشأة' : `🏗️ مشروع: ${p.projectName || 'مشروع مخصص'}`}
                          </span>
                          {p.isActive ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                              نشطة
                            </span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                              معطلة
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            سارية من: {p.effectiveFrom}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={13} color="#38bdf8" />
                            <span>مواعيد الدوام: <strong>{p.shiftStartTime} — {p.shiftEndTime}</strong></span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Shield size={13} color="#34d399" />
                            <span>فترة السماح: <strong>{p.graceMinutes} دقيقة</strong></span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Coffee size={13} color="#fbbf24" />
                            <span>الاستراحة: <strong>{p.breakMinutes} دقيقة</strong></span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Zap size={13} color="#60a5fa" />
                            <span>بدء الإضافي بعد: <strong>{p.overtimeThresholdHours} ساعات</strong> (معامل ×{p.overtimeMultiplier})</span>
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
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePolicy(p.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.6rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                          title="حذف / تعطيل"
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
          <form onSubmit={handleSavePolicy} className="animate-fade-in">
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit2 size={16} color="#38bdf8" />
                  <span>{editingPolicy ? 'تعديل سياسة الحضور' : 'إضافة سياسة حضور جديدة'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                >
                  إلغاء والعودة للقائمة
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Project selector */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Building size={14} />
                    <span>نطاق السياسة (المشروع أو عام)</span>
                  </label>
                  <select
                    className="input-field"
                    value={formData.projectId || ''}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value || null })}
                  >
                    <option value="">🏢 السياسة العامة لجميع مشاريع المنشأة</option>
                    {projects.map((prj) => (
                      <option key={prj.id} value={prj.id}>
                        🏗️ مخصصة لمشروع: {prj.name} ({prj.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Effective From */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Calendar size={14} />
                    <span>تاريخ بدء سريان السياسة *</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  />
                </div>

                {/* Shift Start Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Clock size={14} />
                    <span>ميعاد بداية الدوام (Shift Start) *</span>
                  </label>
                  <input
                    type="time"
                    required
                    className="input-field"
                    value={formData.shiftStartTime}
                    onChange={(e) => setFormData({ ...formData, shiftStartTime: e.target.value })}
                  />
                </div>

                {/* Shift End Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Clock size={14} />
                    <span>ميعاد نهاية الدوام (Shift End) *</span>
                  </label>
                  <input
                    type="time"
                    required
                    className="input-field"
                    value={formData.shiftEndTime}
                    onChange={(e) => setFormData({ ...formData, shiftEndTime: e.target.value })}
                  />
                </div>

                {/* Grace Minutes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <Shield size={14} />
                    <span>فترة السماح بالدقائق (Grace Period)</span>
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
                    <span>مدة الاستراحة بالدقائق (Break)</span>
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
                    <span>بدء الإضافي بعد (ساعات عمل صافية)</span>
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
                    <span>معامل احتساب الساعة الإضافية</span>
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
                <label htmlFor="policyIsActive" style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff' }}>
                  تفعيل هذه السياسة فوراً للاستخدام في حسابات الحضور واستيراد البصمات
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ gap: '0.4rem' }}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{editingPolicy ? 'حفظ تعديلات السياسة' : 'حفظ وإنشاء السياسة'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
