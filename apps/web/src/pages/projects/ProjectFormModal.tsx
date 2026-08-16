import React, { useState, useEffect } from 'react';
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '../../api/projects.api';
import type { Branch } from '../../api/branches.api';
import { X, Loader2, FolderKanban, Building, Hash, Calendar, Banknote, CheckSquare } from 'lucide-react';

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
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractValue, setContractValue] = useState<number>(0);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name || '');
      setCode(editingProject.code || '');
      setBranchId(editingProject.branchId || '');
      setStatus(editingProject.status || 'in_progress');
      setStartDate(editingProject.startDate ? editingProject.startDate.split('T')[0] : '');
      setEndDate(editingProject.endDate ? editingProject.endDate.split('T')[0] : '');
      setContractValue(Number(editingProject.contractValue) || 0);
      setDescription(editingProject.description || '');
    } else {
      setName('');
      setCode('');
      setBranchId(branches[0]?.id || '');
      setStatus('in_progress');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setContractValue(100000);
      setDescription('');
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
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      contractValue: Number(contractValue) || 0,
      description: description.trim() || undefined,
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
          maxWidth: '580px',
          padding: '2rem',
          maxHeight: '90vh',
          overflowY: 'auto',
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
            <FolderKanban size={22} color="#60a5fa" />
            <h3 style={{ fontSize: '1.25rem' }}>
              {editingProject ? 'تعديل بيانات المشروع' : 'إنشاء مشروع جديد'}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
              <label className="form-label">
                <FolderKanban size={14} />
                <span>اسم المشروع *</span>
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="مثال: تشطيبات برج الرياض التجاري"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Building size={14} />
                <span>الفرع التابع *</span>
              </label>
              <select
                required
                className="input-field"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">اختر الفرع...</option>
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
                <span>كود المشروع</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: PRJ-RYD-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">حالة المشروع</label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="in_progress">قيد التنفيذ (In Progress)</option>
                <option value="planned">مخطط له (Planned)</option>
                <option value="completed">مكتمل (Completed)</option>
                <option value="on_hold">معلق (On Hold)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Banknote size={14} />
                <span>قيمة العقد (SAR)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                className="input-field"
                value={contractValue}
                onChange={(e) => setContractValue(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Calendar size={14} />
                <span>تاريخ البدء</span>
              </label>
              <input
                type="date"
                className="input-field"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Calendar size={14} />
                <span>تاريخ الانتهاء المتوقع</span>
              </label>
              <input
                type="date"
                className="input-field"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
              <label className="form-label">وصف المشروع وملاحظات التعاقد</label>
              <textarea
                rows={3}
                className="input-field"
                style={{ resize: 'vertical' }}
                placeholder="تفاصيل العقد والموقع..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
              <span>{editingProject ? 'حفظ التعديلات' : 'إنشاء المشروع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
