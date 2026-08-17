import React, { useState, useEffect } from 'react';
import type { Employee, CreateEmployeePayload, UpdateEmployeePayload } from '../../api/employees.api';
import type { Branch } from '../../api/branches.api';
import { Modal } from '../../components/Modal';
import { WheelDatePicker } from '../../components/WheelPicker';
import {
  Loader2,
  User,
  CreditCard,
  Building,
  HardHat,
  Banknote,
  Phone,
  Calendar,
  Globe,
  CheckSquare,
  Fingerprint,
} from 'lucide-react';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateEmployeePayload | UpdateEmployeePayload) => Promise<void>;
  editingEmployee?: Employee | null;
  branches: Branch[];
  isSaving: boolean;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingEmployee,
  branches,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [identityType, setIdentityType] = useState<'national_id' | 'iqama' | 'passport'>('national_id');
  const [identityExpiryDate, setIdentityExpiryDate] = useState('');
  const [nationality, setNationality] = useState('SA');
  const [roleType, setRoleType] = useState('worker');
  const [dailyWage, setDailyWage] = useState<number>(150);
  const [primaryBranchId, setPrimaryBranchId] = useState('');
  const [code, setCode] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editingEmployee) {
      setName(editingEmployee.name || '');
      setIdentityNumber(editingEmployee.identityNumber || (editingEmployee as any).nationalId || '');
      setIdentityType(editingEmployee.identityType || 'national_id');
      setIdentityExpiryDate(
        editingEmployee.identityExpiryDate ? editingEmployee.identityExpiryDate.split('T')[0] : '',
      );
      setNationality(editingEmployee.nationality || 'SA');
      setRoleType(editingEmployee.roleType || editingEmployee.role || 'worker');
      setDailyWage(Number(editingEmployee.dailyWage) || 150);
      setPrimaryBranchId(editingEmployee.primaryBranchId || editingEmployee.branchId || '');
      setCode(editingEmployee.code || '');
      setDeviceCode(editingEmployee.deviceCode || '');
      setPhone(editingEmployee.phone || '');
      setIsActive(editingEmployee.isActive ?? true);
    } else {
      setName('');
      setIdentityNumber('');
      setIdentityType('national_id');
      setIdentityExpiryDate('');
      setNationality('SA');
      setRoleType('worker');
      setDailyWage(150);
      setPrimaryBranchId(branches[0]?.id || '');
      setCode('');
      setDeviceCode('');
      setPhone('');
      setIsActive(true);
    }
  }, [editingEmployee, isOpen, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !identityNumber.trim()) return;

    await onSubmit({
      name: name.trim(),
      identityNumber: identityNumber.trim(),
      identityType,
      identityExpiryDate: identityType !== 'national_id' && identityExpiryDate ? identityExpiryDate : undefined,
      nationality: nationality.trim() || undefined,
      roleType,
      dailyWage: Number(dailyWage) || 0,
      primaryBranchId: primaryBranchId || undefined,
      code: code.trim() || undefined,
      deviceCode: deviceCode.trim() || undefined,
      phone: phone.trim() || undefined,
      isActive,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEmployee ? 'تعديل بيانات الموظف / العامل' : 'إضافة موظف / عامل جديد'}
      icon={<User size={22} color="#60a5fa" />}
      maxWidth="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
            إلغاء
          </button>
          <button type="submit" form="employee-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
            <span>{editingEmployee ? 'حفظ التعديلات' : 'إضافة الموظف'}</span>
          </button>
        </div>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <User size={14} />
                <span>الاسم الكامل *</span>
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="الاسم الثلاثي..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <CreditCard size={14} />
                <span>نوع وثيقة الهوية *</span>
              </label>
              <select
                className="input-field"
                value={identityType}
                onChange={(e) => setIdentityType(e.target.value as any)}
              >
                <option value="national_id">هوية وطنية سعودية (National ID)</option>
                <option value="iqama">إقامة مقيم (Iqama)</option>
                <option value="passport">جواز سفر (Passport)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <CreditCard size={14} />
                <span>رقم الهوية / الإقامة / الجواز *</span>
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="10xxxxxxxx أو 23xxxxxxxx"
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
              />
            </div>

            {identityType !== 'national_id' && (
              <div className="form-group animate-fade-in" style={{ margin: 0 }}>
                <label className="form-label">
                  <Calendar size={14} />
                  <span>تاريخ انتهاء الإقامة / الجواز *</span>
                </label>
                <WheelDatePicker
                  placeholder="تاريخ الانتهاء..."
                  value={identityExpiryDate}
                  onChange={(val) => setIdentityExpiryDate(val)}
                />
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Globe size={14} />
                <span>الجنسية</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="سعودي، مصري، هندي..."
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Building size={14} />
                <span>الفرع الأساسي</span>
              </label>
              <select
                className="input-field"
                value={primaryBranchId}
                onChange={(e) => setPrimaryBranchId(e.target.value)}
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
                <HardHat size={14} />
                <span>الدور الوظيفي *</span>
              </label>
              <select
                className="input-field"
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
              >
                <option value="worker">عامل مهني (Worker)</option>
                <option value="supervisor">مشرف تنفيذ (Supervisor)</option>
                <option value="engineer">مهندس موقع (Engineer)</option>
                <option value="project_manager">مدير مشروع (Project Manager)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Banknote size={14} />
                <span>الأجر اليومي (SAR) *</span>
              </label>
              <input
                type="number"
                min="0"
                step="5"
                required
                className="input-field"
                value={dailyWage}
                onChange={(e) => setDailyWage(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">كود العامل / الرقم الوظيفي</label>
              <input
                type="text"
                className="input-field"
                placeholder="EMP-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Fingerprint size={14} color="#60a5fa" />
                <span>كود جهاز البصمة (Device Code)</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="DEV-101 أو رقم Enroll"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Phone size={14} />
                <span>رقم الجوال</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="05xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div
              style={{
                gridColumn: 'span 2',
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
                id="empActiveCheck"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="empActiveCheck" style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#ffffff' }}>
                الموظف / العامل على رأس العمل ونشط
              </label>
            </div>
          </div>
        </form>
      </Modal>
    );
  };
