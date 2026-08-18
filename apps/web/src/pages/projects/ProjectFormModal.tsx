import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect } from 'react';
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '../../api/projects.api';
import type { Branch } from '../../api/branches.api';
import { Modal } from '../../components/Modal';
import { WheelDatePicker } from '../../components/WheelPicker';
import { Loader2, FolderKanban, Building, Hash, Calendar, MapPin, User, CheckSquare } from 'lucide-react';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload | UpdateProjectPayload) => Promise<void>;
  editingProject?: Project | null;
  branches: Branch[];
  isSaving: boolean;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingProject,
  branches,
  isSaving,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('active');
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name || '');
      setCode(editingProject.code || '');
      setBranchId(editingProject.branchId || '');
      setStatus(editingProject.status || 'active');
      setClientName((editingProject as any).clientName || (editingProject as any).client_name || '');
      setLocation((editingProject as any).location || '');
      setStartDate(editingProject.startDate ? editingProject.startDate.split('T')[0] : '');
      setEndDate(editingProject.endDate ? editingProject.endDate.split('T')[0] : '');
    } else {
      setName('');
      setCode('');
      setBranchId(branches[0]?.id || '');
      setStatus('active');
      setClientName('');
      setLocation('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
    }
  }, [editingProject, isOpen, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !branchId) return;

    await onSubmit({
      name: name.trim(),
      code: code.trim() || undefined,
      branchId,
      status: status || 'active',
      clientName: clientName.trim() || undefined,
      location: location.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProject ? t('auto.تعديل_بيانات_المشروع_394a64') : t('auto.إنشاء_مشروع_جديد_57445e')}
      icon={<FolderKanban size={22} color="#60a5fa" />}
      maxWidth="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
            {t('auto.إلغاء_5987b3')}
          </button>
          <button type="submit" form="project-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
            <span>{editingProject ? t('auto.حفظ_التعديلات_4ff313') : t('auto.إنشاء_المشروع_7190ca')}</span>
          </button>
        </div>
      }
    >
      <form id="project-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
            <label className="form-label">
              <FolderKanban size={14} />
              <span>{t('auto.اسم_المشروع_3744d0')}</span>
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder={t('auto.مثال_تشطيبات_برج_الرياض_التجار_323cf1')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Building size={14} />
              <span>{t('auto.الفرع_التابع_1334ea')}</span>
            </label>
            <select
              required
              className="input-field"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">{t('auto.اختر_الفرع_53db78')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Hash size={14} />
              <span>{t('auto.كود_المشروع_1180ed')}</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={t('auto.مثال_PRJ_RYD_01_6f7427')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{t('auto.حالة_المشروع_1d74d7')}</label>
            <select
              className="input-field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">{t('auto.قيد_التنفيذ_In_Progress_dafbd2')}</option>
              <option value="completed">{t('auto.مكتمل_Completed_20d037')}</option>
              <option value="paused">{t('auto.معلق_On_Hold_12e520')}</option>
              <option value="archived">{t('auto.مؤرشف_Archived_14a22b')}</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <User size={14} />
              <span>{t('auto.اسم_العميل_أو_المالك_33a1e2')}</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={t('auto.مثال_شركة_التطوير_العقاري_31f0b2')}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Calendar size={14} />
              <span>{t('auto.تاريخ_البدء_7a6526')}</span>
            </label>
            <WheelDatePicker
              placeholder={t('auto.تاريخ_البدء_40f6fb')}
              value={startDate}
              onChange={(val) => setStartDate(val)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Calendar size={14} />
              <span>{t('auto.تاريخ_الانتهاء_المتوقع_43825f')}</span>
            </label>
            <WheelDatePicker
              placeholder={t('auto.تاريخ_الانتهاء_6170be')}
              value={endDate}
              onChange={(val) => setEndDate(val)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
            <label className="form-label">
              <MapPin size={14} />
              <span>{t('auto.موقع_المشروع_وملاحظات_الموقع_32e18d')}</span>
            </label>
            <textarea
              rows={2}
              className="input-field"
              style={{ resize: 'vertical' }}
              placeholder={t('auto.تفاصيل_العقد_والموقع_4960d7')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
