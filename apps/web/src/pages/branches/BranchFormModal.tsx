import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect } from 'react';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '../../api/branches.api';
import { Modal } from '../../components/Modal';
import { Loader2, Building, MapPin, Hash, Phone, CheckSquare } from 'lucide-react';

interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateBranchPayload | UpdateBranchPayload) => Promise<void>;
  editingBranch?: Branch | null;
  isSaving: boolean;
}

export const BranchFormModal: React.FC<BranchFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingBranch,
  isSaving,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editingBranch) {
      setName(editingBranch.name || '');
      setCode(editingBranch.code || '');
      setLocation(editingBranch.location || editingBranch.address || '');
      setPhone(editingBranch.phone || '');
      setIsActive(editingBranch.isActive ?? true);
    } else {
      setName('');
      setCode('');
      setLocation('');
      setPhone('');
      setIsActive(true);
    }
  }, [editingBranch, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    await onSubmit({
      name: name.trim(),
      code: code.trim(),
      location: location.trim() || undefined,
      phone: phone.trim() || undefined,
      isActive,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBranch ? t('auto.تعديل_بيانات_الفرع_28048b') : t('auto.إضافة_فرع_جديد_159414')}
      icon={<Building size={22} color="#60a5fa" />}
      maxWidth="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
            {t('auto.إلغاء_5987b3')}</button>
          <button type="submit" form="branch-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
            <span>{editingBranch ? t('auto.حفظ_التعديلات_4ff313') : t('auto.إنشاء_الفرع_25e1d9')}</span>
          </button>
        </div>
      }
    >
      <form id="branch-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Building size={14} />
              <span>{t('auto.اسم_الفرع_الإقليم_6a9f27')}</span>
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder={t('auto.مثال_فرع_الرياض_أو_فرع_جدة_26e36f')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Hash size={14} />
              <span>{t('auto.كود_الفرع_الفريد_2c11c8')}</span>
            </label>
            <input
              type="text"
              required
              disabled={!!editingBranch}
              className="input-field"
              placeholder={t('auto.مثال_RUH_أو_JED_15bfb8')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <MapPin size={14} />
              <span>{t('auto.موقع_عنوان_الفرع_5ca11a')}</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={t('auto.المدينة_الحي_12b1b4')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Phone size={14} />
              <span>{t('auto.رقم_هاتف_الفرع_37966c')}</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="011xxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.5rem 0',
              cursor: 'pointer',
            }}
            onClick={() => setIsActive(!isActive)}
          >
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="isActiveCheck" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-heading)' }}>
              {t('auto.فرع_نشط_ومتاح_للعمليات_c5c33b')}</label>
          </div>
        </div>
      </form>
    </Modal>
  );
};
