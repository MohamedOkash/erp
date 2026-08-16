import React, { useState, useEffect } from 'react';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '../../api/branches.api';
import { X, Loader2, Building, MapPin, Hash, Phone, CheckSquare } from 'lucide-react';

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

  if (!isOpen) return null;

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
        zIndex: 100,
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
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building size={22} color="#60a5fa" />
            <h3 style={{ fontSize: '1.25rem' }}>
              {editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Building size={14} />
                <span>اسم الفرع *</span>
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="مثال: فرع الرياض الرئيسي"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Hash size={14} />
                <span>كود الفرع *</span>
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="مثال: BR-RUH-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <MapPin size={14} />
                <span>الموقع / العنوان</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: الرياض - طريق الملك فهد"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Phone size={14} />
                <span>رقم هاتف الفرع</span>
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
              <label htmlFor="isActiveCheck" style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#ffffff' }}>
                فرع نشط ومتاح للعمليات
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
              <span>{editingBranch ? 'حفظ التعديلات' : 'إنشاء الفرع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
