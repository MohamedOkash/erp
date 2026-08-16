import React, { useState, useEffect } from 'react';
import type { ProductionRecord, CorrectionPayload } from '../../api/production.api';
import { productionApi } from '../../api/production.api';
import {
  X,
  Loader2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface CorrectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: ProductionRecord | null;
}

export const CorrectionFormModal: React.FC<CorrectionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  record,
}) => {
  const [type, setType] = useState<'quantity_adjust' | 'annul' | 'note'>('quantity_adjust');
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType('quantity_adjust');
      setDelta(0);
      setReason('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('يرجى كتابة سبب طلب التصحيح');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CorrectionPayload = {
        type,
        delta: type === 'quantity_adjust' ? Number(delta) : undefined,
        reason: reason.trim(),
      };

      await productionApi.createCorrection(record.id, payload);
      setSuccessMsg('تم تقديم طلب التصحيح بنجاح، بانتظار الاعتماد!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      if (err.code === 'RECORD_NOT_LOCKED') {
        setError('خطأ: لا يمكن تقديم طلب تصحيح إلا للسجلات المعتمدة نهائيًا والمغلقة (final_approved)');
      } else {
        setError(err.message || 'فشل تقديم طلب التصحيح');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        zIndex: 110,
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <RotateCcw size={22} color="#fbbf24" />
            <h3 style={{ fontSize: '1.25rem' }}>طلب تعديل / تصحيح إنتاج مغلق</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: '#fbbf24',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <Info size={16} />
          <span>
            السجل معتمد ومغلق. التصحيح يضاف كقيد إضافي تراكمي (Additive Correction) بعد الاعتماد.
          </span>
        </div>

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
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

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
              fontSize: '0.85rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">نوع التصحيح المطلوب *</label>
              <select
                className="input-field"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="quantity_adjust">تعديل كمية (Quantity Adjustment)</option>
                <option value="annul">إلغاء السجل (Annul)</option>
                <option value="note">إضافة ملاحظة تصحيحية (Note)</option>
              </select>
            </div>

            {type === 'quantity_adjust' && (
              <div className="form-group animate-fade-in" style={{ margin: 0 }}>
                <label className="form-label">
                  فارق الكمية (Delta) *
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '0.4rem' }}>
                    (يمكن أن يكون موجب + أو سالب -)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="مثال: +15 أو -5.5"
                  className="input-field"
                  value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                />
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">سبب طلب التصحيح والمبرر الهندسي *</label>
              <textarea
                required
                rows={3}
                className="input-field"
                style={{ resize: 'vertical' }}
                placeholder="يرجى كتابة سبب التعديل وتفاصيل المعاينة الميدانية..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ gap: '0.4rem', background: '#d97706' }}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              <span>تقديم طلب التصحيح</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
