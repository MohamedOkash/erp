import { useI18n } from '../../i18n/I18nContext';
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
  Briefcase,
  Clock,
  Hash,
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
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [identityType, setIdentityType] = useState<'national_id' | 'iqama' | 'passport'>('national_id');
  const [identityExpiryDate, setIdentityExpiryDate] = useState('');
  const [nationality, setNationality] = useState('SA');
  const [roleType, setRoleType] = useState('worker');
  const [profession, setProfession] = useState('Plasterer');
  const [hourlyRate, setHourlyRate] = useState<number>(28);
  const [dailyWage, setDailyWage] = useState<number>(224);
  const [primaryBranchId, setPrimaryBranchId] = useState('');
  const [code, setCode] = useState('');
  const [companyEmployeeId, setCompanyEmployeeId] = useState('');
  const [projectEmployeeId, setProjectEmployeeId] = useState('');
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
      setProfession(editingEmployee.profession || 'Plasterer');
      const wage = Number(editingEmployee.dailyWage) || 224;
      const rate = Number(editingEmployee.hourlyRate || editingEmployee.hourly_rate) || Math.round((wage / 8.0) * 100) / 100;
      setDailyWage(wage);
      setHourlyRate(rate);
      setPrimaryBranchId(editingEmployee.primaryBranchId || editingEmployee.branchId || '');
      setCode(editingEmployee.code || '');
      setCompanyEmployeeId(editingEmployee.companyEmployeeId || editingEmployee.code || '');
      setProjectEmployeeId(editingEmployee.projectEmployeeId || '');
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
      setProfession('Plasterer');
      setHourlyRate(28);
      setDailyWage(224);
      setPrimaryBranchId(branches[0]?.id || '');
      setCode('');
      setCompanyEmployeeId('');
      setProjectEmployeeId('');
      setDeviceCode('');
      setPhone('');
      setIsActive(true);
    }
  }, [editingEmployee, isOpen, branches]);

  const handleHourlyChange = (rateVal: number) => {
    setHourlyRate(rateVal);
    setDailyWage(Math.round(rateVal * 8.0 * 100) / 100);
  };

  const handleDailyWageChange = (wageVal: number) => {
    setDailyWage(wageVal);
    setHourlyRate(Math.round((wageVal / 8.0) * 100) / 100);
  };

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
      profession: profession.trim() || undefined,
      hourlyRate: Number(hourlyRate) || 0,
      dailyWage: Number(dailyWage) || 0,
      primaryBranchId: primaryBranchId || undefined,
      code: code.trim() || undefined,
      companyEmployeeId: companyEmployeeId.trim() || undefined,
      projectEmployeeId: projectEmployeeId.trim() || undefined,
      deviceCode: deviceCode.trim() || undefined,
      phone: phone.trim() || undefined,
      isActive,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEmployee ? t('auto.تعديل_بيانات_الموظف_العامل_601c59') : t('auto.إضافة_موظف_عامل_جديد_1dfc46')}
      icon={<User size={22} color="#f59e0b" />}
      maxWidth="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="employee-form" className="btn btn-primary" style={{ background: '#f59e0b', color: '#000' }} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
            <span>{editingEmployee ? t('common.save') : t('common.add')}</span>
          </button>
        </div>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <User size={14} />
              <span>{t('employees.name')}</span>
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder={t('employees.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Briefcase size={14} color="#f59e0b" />
              <span>{t('employees.profession')}</span>
            </label>
            <input
              type="text"
              list="professionsList"
              required
              className="input-field"
              placeholder={t('employees.profession')}
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            />
            <datalist id="professionsList">
              <option value="Plasterer" />
              <option value="Tiler" />
              <option value="Painter" />
              <option value="Gypsum Board" />
              <option value="Carpenter" />
              <option value="Steel Fixer" />
              <option value="Plumber" />
              <option value="Electrician" />
              <option value="Helper" />
              <option value="Finishing Foreman" />
            </datalist>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <CreditCard size={14} />
              <span>{t('auto.نوع_وثيقة_الهوية_4c8565')}</span>
            </label>
            <select
              className="input-field"
              value={identityType}
              onChange={(e) => setIdentityType(e.target.value as any)}
            >
              <option value="national_id">{t('auto.هوية_وطنية_سعودية_National_ID_7990a3')}</option>
              <option value="iqama">{t('auto.إقامة_مقيم_Iqama_6a04c9')}</option>
              <option value="passport">{t('auto.جواز_سفر_Passport_7be31c')}</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <CreditCard size={14} />
              <span>{t('auto.رقم_الهوية_الإقامة_الجواز_4b5ad3')}</span>
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder={t('auto.مثال_10xxxxxxxx_23xxxxxxxx_5264b3')}
              value={identityNumber}
              onChange={(e) => setIdentityNumber(e.target.value)}
            />
          </div>

          {identityType !== 'national_id' && (
            <div className="form-group animate-fade-in" style={{ margin: 0 }}>
              <label className="form-label">
                <Calendar size={14} />
                <span>{t('auto.تاريخ_انتهاء_الإقامة_الجواز_7d7790')}</span>
              </label>
              <WheelDatePicker
                placeholder={t('auto.تاريخ_الانتهاء_6170be')}
                value={identityExpiryDate}
                onChange={(val) => setIdentityExpiryDate(val)}
              />
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Globe size={14} />
              <span>{t('auto.الجنسية_7f7efb')}</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Nationality"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Building size={14} />
              <span>{t('auto.الفرع_الأساسي_5b1823')}</span>
            </label>
            <select
              className="input-field"
              value={primaryBranchId}
              onChange={(e) => setPrimaryBranchId(e.target.value)}
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
              <HardHat size={14} />
              <span>{t('auto.الدور_الوظيفي_160693')}</span>
            </label>
            <select
              className="input-field"
              value={roleType}
              onChange={(e) => setRoleType(e.target.value)}
            >
              <option value="worker">{t('auto.عامل_مهني_Worker_7cf52e')}</option>
              <option value="supervisor">{t('auto.مشرف_تنفيذ_Supervisor_25caa4')}</option>
              <option value="engineer">{t('auto.مهندس_موقع_Engineer_1676d9')}</option>
              <option value="project_manager">{t('auto.مدير_مشروع_Project_Manager_6425fc')}</option>
            </select>
          </div>

          {/* Wage calculation pair */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Clock size={14} color="#f59e0b" />
              <span>{t('employees.hourly_rate')}</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              required
              className="input-field font-bold text-amber-500"
              value={hourlyRate}
              onChange={(e) => handleHourlyChange(Number(e.target.value))}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Banknote size={14} />
              <span>{t('auto.الأجر_اليومي_SAR_2bef7a')}</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              className="input-field font-semibold"
              value={dailyWage}
              onChange={(e) => handleDailyWageChange(Number(e.target.value))}
            />
          </div>

          {/* Company ID & Project ID */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Hash size={14} />
              <span>{t('employees.company_id')}</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="EMP-2026-001"
              value={companyEmployeeId || code}
              onChange={(e) => {
                setCompanyEmployeeId(e.target.value);
                setCode(e.target.value);
              }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Hash size={14} />
              <span>{t('employees.project_employee_id')}</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="PRJ-01-EMP-10"
              value={projectEmployeeId}
              onChange={(e) => setProjectEmployeeId(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Fingerprint size={14} color="#f59e0b" />
              <span>{t('auto.كود_جهاز_البصمة_Device_Code_701937')}</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="DEV-101"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <Phone size={14} />
              <span>{t('auto.رقم_الجوال_d4c518')}</span>
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
            <label htmlFor="empActiveCheck" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-heading)' }}>
              {t('auto.الموظف_العامل_على_رأس_العمل_ون_5f861f')}
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};
