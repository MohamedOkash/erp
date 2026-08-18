import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect } from 'react';
import type { ProductionRecord, CorrectionPayload } from '../../api/production.api';
import { productionApi } from '../../api/production.api';
import { Modal } from '../../components/Modal';
import {
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
  const { t } = useI18n();
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
      setError(t('auto.يرجى_كتابة_سبب_طلب_التصحيح_2d1364'));
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
      setSuccessMsg(t('auto.تم_تقديم_طلب_التصحيح_بنجاح_بان_9f2711'));
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      if (err.code === 'RECORD_NOT_LOCKED') {
        setError(t('auto.خطأ_لا_يمكن_تقديم_طلب_تصحيح_إل_5da6f8'));
      } else {
        setError(err.message || t('auto.فشل_تقديم_طلب_التصحيح_44b6e8'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('auto.طلب_تعديل_تصحيح_إنتاج_مغلق_4b35d6')}
      icon={<RotateCcw size={22} color="#fbbf24" />}
      maxWidth="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
            {t('auto.إلغاء_5987b3')}</button>
          <button
            type="submit"
            form="correction-form"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ gap: '0.4rem', background: '#d97706' }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            <span>{t('auto.تقديم_طلب_التصحيح_727105')}</span>
          </button>
        </div>
      }
    >
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
          {t('auto.السجل_معتمد_ومغلق_التصحيح_يضاف_5637e0')}</span>
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

      <form id="correction-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{t('auto.نوع_التصحيح_المطلوب_17c5e0')}</label>
            <select
              className="input-field"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="quantity_adjust">{t('auto.تعديل_كمية_Quantity_Adjustment_27d5d9')}</option>
              <option value="annul">{t('auto.إلغاء_السجل_Annul_63d9ee')}</option>
              <option value="note">{t('auto.إضافة_ملاحظة_تصحيحية_Note_60fa29')}</option>
            </select>
          </div>

          {type === 'quantity_adjust' && (
            <div className="form-group animate-fade-in" style={{ margin: 0 }}>
              <label className="form-label">
                {t('auto.فارق_الكمية_Delta_5f2b01')}<span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '0.4rem' }}>
                  {t('auto.يمكن_أن_يكون_موجب_أو_سالب_1d146b')}</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder={t('auto.مثال_15_أو_5_5_246dc5')}
                className="input-field"
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
              />
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{t('auto.سبب_طلب_التصحيح_والمبرر_الهندس_7d1712')}</label>
            <textarea
              required
              rows={3}
              className="input-field"
              style={{ resize: 'vertical' }}
              placeholder={t('auto.يرجى_كتابة_سبب_التعديل_وتفاصيل_213e21')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

