import React, { useEffect, useState, useCallback } from 'react';
import {
  laborRatesApi,
  type LaborRateItem,
  type CreateLaborRatePayload,
} from '../../api/labor-rates.api';
import {
  companySettingsApi,
} from '../../api/company-settings.api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { WheelDatePicker } from '../../components/WheelPicker';
import {
  Settings,
  Building,
  DollarSign,
  Users,
  Shield,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Globe,
  Clock,
  Briefcase,
  Check,
  X,
  Calculator,
  Sliders,
  HardHat,
  Activity,
  Info,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'rates' | 'roles' | 'calculations'>('company');

  // Company Settings Form State
  const [companyName, setCompanyName] = useState('شركة ساكوديكو للمقاولات العامة (SACODECO)');
  const [crNumber, setCrNumber] = useState('1010894210');
  const [vatNumber, setVatNumber] = useState('310459821000003');
  const [currency, setCurrency] = useState('SAR - ريال سعودي');
  const [timezone, setTimezone] = useState('Asia/Riyadh (GMT+3)');
  const [country, setCountry] = useState('المملكة العربية السعودية (KSA)');
  const [address, setAddress] = useState('الرياض - حي الملز - طريق صلاح الدين الأيوبي');
  const [phone, setPhone] = useState('+966 11 478 9900');
  const [email, setEmail] = useState('info@sacodeco-erp.sa');
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Labor Rates State
  const [rates, setRates] = useState<LaborRateItem[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingRate, setEditingRate] = useState<LaborRateItem | null>(null);
  const [rateFormData, setRateFormData] = useState<CreateLaborRatePayload>({
    rateType: 'normal',
    hourlyRate: 25,
    dailyRate: 200,
    effectiveFrom: new Date().toISOString().split('T')[0],
  });
  const [isSavingRate, setIsSavingRate] = useState(false);

  // Calculation & Operational Settings State
  const [calcSettings, setCalcSettings] = useState<Record<string, any>>({
    hours_per_work_day: 8,
    overtime_multiplier: 1.5,
    rounding_decimals: 2,
    default_crew_skilled: 1,
    default_crew_unskilled: 1,
    default_daily_productivity: 20,
    default_skilled_daily_wage: 224,
    default_unskilled_daily_wage: 208,
  });
  const [isLoadingCalc, setIsLoadingCalc] = useState(false);
  const [isSavingCalc, setIsSavingCalc] = useState(false);

  // Alerts State
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Labor Rates
  const loadRates = useCallback(async () => {
    setIsLoadingRates(true);
    setError(null);
    try {
      const data = await laborRatesApi.list();
      setRates(data || []);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل معدلات أجور العمالة');
    } finally {
      setIsLoadingRates(false);
    }
  }, []);

  // Load Calculation Settings
  const loadCalculationSettings = useCallback(async () => {
    setIsLoadingCalc(true);
    try {
      const res = await companySettingsApi.getSettings();
      if (res && res.settings) {
        setCalcSettings(res.settings);
      }
    } catch (err: any) {
      console.error('Failed to load calculation settings:', err);
    } finally {
      setIsLoadingCalc(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
    loadCalculationSettings();
  }, [loadRates, loadCalculationSettings]);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    setTimeout(() => {
      setIsSavingCompany(false);
      setSuccessMsg('تم حفظ وتحديث بيانات الشركة والإعدادات العامة بنجاح.');
    }, 400);
  };

  const handleSaveCalculationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCalc(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await companySettingsApi.updateSettings(calcSettings);
      if (res && res.settings) {
        setCalcSettings(res.settings);
      }
      setSuccessMsg('تم حفظ وتحديث جميع معاملات المعادلات الرياضية والتشغيلية بنجاح!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل حفظ معاملات الحساب');
    } finally {
      setIsSavingCalc(false);
    }
  };

  const handleOpenCreateRate = () => {
    setEditingRate(null);
    setRateFormData({
      rateType: 'normal',
      hourlyRate: 25,
      dailyRate: 200,
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
    setShowRateModal(true);
  };

  const handleOpenEditRate = (rate: LaborRateItem) => {
    setEditingRate(rate);
    setRateFormData({
      rateType: rate.rate_type,
      hourlyRate: Number(rate.hourly_rate),
      dailyRate: Number(rate.daily_rate),
      effectiveFrom: rate.effective_from ? rate.effective_from.split('T')[0] : '',
    });
    setShowRateModal(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRate(true);
    setError(null);
    try {
      if (editingRate) {
        await laborRatesApi.update(editingRate.id, rateFormData);
        setSuccessMsg('تم تحديث معدل الأجر بنجاح.');
      } else {
        await laborRatesApi.create(rateFormData);
        setSuccessMsg('تم إضافة معدل الأجر الجديد بنجاح.');
      }
      setShowRateModal(false);
      loadRates();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ معدل الأجر');
    } finally {
      setIsSavingRate(false);
    }
  };

  const getRateTypeLabel = (type: string) => {
    switch (type) {
      case 'normal':
        return <span className="badge badge-primary">ساعات العمل العادية (Normal)</span>;
      case 'overtime':
        return <span className="badge badge-accent">ساعات العمل الإضافية (Overtime)</span>;
      case 'weekend':
        return <span className="badge badge-secondary">عطلات ونهاية الأسبوع (Weekend)</span>;
      case 'supervisor':
        return <span className="badge badge-success">أجر الإشراف الميداني (Supervisor)</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  // Static Permissions Matrix definitions
  const permissionsMatrix = [
    {
      module: 'بطاقات التحكم والربحية (Control Cards)',
      admin: true,
      pm: true,
      engineer: true,
      supervisor: false,
      accountant: true,
    },
    {
      module: 'الإنتاجية اليومية والمراحل (Production)',
      admin: true,
      pm: true,
      engineer: true,
      supervisor: true,
      accountant: false,
    },
    {
      module: 'الحضور والانصراف والإضافي (Attendance)',
      admin: true,
      pm: true,
      engineer: true,
      supervisor: true,
      accountant: true,
    },
    {
      module: 'التكاليف والمصروفات (Costs & Expenses)',
      admin: true,
      pm: true,
      engineer: false,
      supervisor: false,
      accountant: true,
    },
    {
      module: 'الحوافز والمكافآت (Incentives Engine)',
      admin: true,
      pm: true,
      engineer: false,
      supervisor: false,
      accountant: true,
    },
    {
      module: 'المقايسة وتقدم التنفيذ (BOQ Progress)',
      admin: true,
      pm: true,
      engineer: true,
      supervisor: false,
      accountant: true,
    },
    {
      module: 'الأرشيف والمستندات (Documents Archive)',
      admin: true,
      pm: true,
      engineer: true,
      supervisor: true,
      accountant: true,
    },
    {
      module: 'إعدادات المنظومة والأسعار (Settings & Rates)',
      admin: true,
      pm: false,
      engineer: false,
      supervisor: false,
      accountant: false,
    },
  ];

  const statsItems = [
    {
      label: 'المنشأة والمقر',
      value: 'SACODECO',
      helper: 'المملكة العربية السعودية',
      icon: <Building size={22} />,
      color: '#60a5fa',
    },
    {
      label: 'العملة المحاسبية المعتمدة',
      value: 'SAR',
      helper: 'ريال سعودي',
      icon: <DollarSign size={22} />,
      color: '#34d399',
    },
    {
      label: 'فئات معدلات الأجور',
      value: `${rates.length} فئات`,
      helper: 'تُطبق آليًا على الحضور',
      icon: <Briefcase size={22} />,
      color: '#f59e0b',
    },
    {
      label: 'المستخدم الحالي',
      value: user?.fullName || user?.username || 'مدير النظام',
      helper: `الأدوار: ${(user?.roles || []).map((r) => r.roleName || r.roleCode).join(', ') || 'admin'}`,
      icon: <Shield size={22} />,
      color: '#a78bfa',
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Top Header & Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={26} color="#60a5fa" />
            <span>إعدادات النظام والمنشأة</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            بيانات الشركة، تسعير ومعدلات أجور العمالة، وإدارة المستخدمين ومصفوفة الصلاحيات
          </p>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} />

      {/* Alerts */}
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
          }}
        >
          <CheckCircle2 size={18} />
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
            marginBottom: '1.25rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={() => setActiveTab('company')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'company' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'company' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: activeTab === 'company' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Building size={16} />
          <span>بيانات الشركة والمنظومة</span>
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'rates' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'rates' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: activeTab === 'rates' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <DollarSign size={16} />
          <span>معدلات وتسعير أجور العمالة ({rates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'roles' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'roles' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: activeTab === 'roles' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Users size={16} />
          <span>المستخدمون ومصفوفة الصلاحيات (RBAC)</span>
        </button>

        <button
          onClick={() => setActiveTab('calculations')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'calculations' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'calculations' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: activeTab === 'calculations' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Calculator size={16} color="#60a5fa" />
          <span>معادلات الحساب والتشغيل (Calculation Settings)</span>
        </button>
      </div>

      {/* TAB 1: COMPANY INFO */}
      {activeTab === 'company' && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSaveCompany}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <Building size={14} />
                  <span>اسم الشركة الرسمي</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم السجل التجاري (CR Number)</label>
                <input
                  type="text"
                  className="input-field"
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">الرقم الضريبي (VAT / Tax ID)</label>
                <input
                  type="text"
                  className="input-field"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <DollarSign size={14} />
                  <span>العملة المحاسبية الرئيسية</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Globe size={14} />
                  <span>الدولة والمنطقة</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Clock size={14} />
                  <span>النطاق الزمني والتوقيت</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">العنوان والمقر الرئيسي</label>
                <input
                  type="text"
                  className="input-field"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">هاتف التواصل</label>
                <input
                  type="text"
                  className="input-field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">البريد الإلكتروني الرسمي</label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1.25rem',
              }}
            >
              <button type="submit" className="btn btn-primary" disabled={isSavingCompany} style={{ gap: '0.5rem' }}>
                {isSavingCompany ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>حفظ التعديلات العامة</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: LABOR RATES */}
      {activeTab === 'rates' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>جدول تسعير ومعدلات ساعات وأيام العمل</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                تُستخدم هذه المعدلات لاحتساب تكاليف الأجور تلقائيًا من واقع سجلات الحضور الميداني
              </p>
            </div>

            <button onClick={handleOpenCreateRate} className="btn btn-primary" style={{ gap: '0.4rem' }}>
              <Plus size={16} />
              <span>إضافة معدل أجر</span>
            </button>
          </div>

          {isLoadingRates && rates.length === 0 ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <div
              className={`glass-card table-loading-overlay ${isLoadingRates ? 'loading-soft' : ''}`}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '1rem' }}>فئة ونوع الأجر</th>
                      <th style={{ padding: '1rem' }}>الأجر بالساعة (SAR/Hour)</th>
                      <th style={{ padding: '1rem' }}>الأجر اليومي (SAR/Day)</th>
                      <th style={{ padding: '1rem' }}>تاريخ بدء السريان</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          لا توجد معدلات أجور مسجلة
                        </td>
                      </tr>
                    ) : (
                      rates.map((r) => (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <td style={{ padding: '1rem' }}>{getRateTypeLabel(r.rate_type)}</td>
                          <td style={{ padding: '1rem', fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>
                            {Number(r.hourly_rate).toFixed(2)}{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 700, color: '#60a5fa', fontSize: '1.05rem' }}>
                            {Number(r.daily_rate).toFixed(2)}{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {r.effective_from ? r.effective_from.split('T')[0] : '—'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRate(r)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                              title="تعديل المعدل"
                            >
                              <Edit2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USERS & ROLES MATRIX */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Current User Card */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}
              >
                {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.1rem' }}>
                  {user?.fullName || user?.username}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  اسم المستخدم: {user?.username} • معرف النظام: {user?.id}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(user?.roles || []).map((r, idx) => (
                <span key={idx} className="badge badge-primary" style={{ fontSize: '0.85rem' }}>
                  <Shield size={13} />
                  <span>{r.roleName || r.roleCode}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>مصفوفة صلاحيات الأدوار القياسية (RBAC Matrix)</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                توزيع صلاحيات الوصول والتعديل عبر وحدات النظام بحسب المسمى الوظيفي
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>الوحدة / الشاشة</th>
                    <th style={{ padding: '1rem' }}>مدير النظام (Admin)</th>
                    <th style={{ padding: '1rem' }}>مدير المشروع (PM)</th>
                    <th style={{ padding: '1rem' }}>مهندس الموقع (Engineer)</th>
                    <th style={{ padding: '1rem' }}>المشرف الميداني (Supervisor)</th>
                    <th style={{ padding: '1rem' }}>المحاسب المالي (Accountant)</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsMatrix.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#ffffff' }}>
                        {row.module}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {row.admin ? (
                          <Check size={18} color="#34d399" style={{ margin: '0 auto' }} />
                        ) : (
                          <X size={18} color="#f87171" style={{ margin: '0 auto' }} />
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {row.pm ? (
                          <Check size={18} color="#34d399" style={{ margin: '0 auto' }} />
                        ) : (
                          <X size={18} color="#f87171" style={{ margin: '0 auto' }} />
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {row.engineer ? (
                          <Check size={18} color="#34d399" style={{ margin: '0 auto' }} />
                        ) : (
                          <X size={18} color="#f87171" style={{ margin: '0 auto' }} />
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {row.supervisor ? (
                          <Check size={18} color="#34d399" style={{ margin: '0 auto' }} />
                        ) : (
                          <X size={18} color="#f87171" style={{ margin: '0 auto' }} />
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {row.accountant ? (
                          <Check size={18} color="#34d399" style={{ margin: '0 auto' }} />
                        ) : (
                          <X size={18} color="#f87171" style={{ margin: '0 auto' }} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CALCULATION & OPERATIONAL SETTINGS */}
      {activeTab === 'calculations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Banner */}
          <div
            className="glass-card"
            style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                }}
              >
                <Calculator size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  معاملات المعادلات الحسابية والتشغيلية (Dynamic Calculation Parameters)
                </h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  جميع الأرقام والمعادلات في النظام هي قيم ابتدائية قابلة للتعديل والتحكم الكامل في أي لحظة. لا توجد ثوابت مقدسة.
                </p>
              </div>
            </div>
            {isLoadingCalc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري تحميل الإعدادات...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveCalculationSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Parameters Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Card 1: Work Hours & Overtime */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Clock size={18} color="#60a5fa" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    معايير أوقات وساعات العمل
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>ساعات العمل اليومية القياسية *</span>
                      <span style={{ color: '#60a5fa', fontWeight: 700 }}>ساعة / يوم</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      required
                      className="input-field"
                      value={calcSettings.hours_per_work_day ?? 8}
                      onChange={(e) => setCalcSettings({ ...calcSettings, hours_per_work_day: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      تُستخدم لحساب إنتاجية الساعة الفردية (Daily Target ÷ Crew Hours) وتكلفة أجر الساعة للعمالة.
                    </span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>معامل احتساب الوقت الإضافي (Overtime Multiplier) *</span>
                      <span style={{ color: '#60a5fa', fontWeight: 700 }}>مضاعف (Multiplier)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      required
                      className="input-field"
                      value={calcSettings.overtime_multiplier ?? 1.5}
                      onChange={(e) => setCalcSettings({ ...calcSettings, overtime_multiplier: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      مضاعف أجر الساعة لساعات العمل الإضافية (مثال: 1.5 يعني أجر ساعة ونصف لكل ساعة إضافية).
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Rounding Decimals */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Sliders size={18} color="#34d399" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    دقة الحسابات والتقريب العشري
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>دقة التقريب العشري (Rounding Decimals) *</span>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>خانات عشرية</span>
                    </label>
                    <select
                      className="input-field"
                      value={calcSettings.rounding_decimals ?? 2}
                      onChange={(e) => setCalcSettings({ ...calcSettings, rounding_decimals: Number(e.target.value) })}
                    >
                      <option value="0">0 خانات (أرقام صحيحة فقط)</option>
                      <option value="1">1 خانة عشرية (مثال: 21.5)</option>
                      <option value="2">2 خانات عشرية (مثال: 21.60) - قياسي معتمد</option>
                      <option value="3">3 خانات عشرية (مثال: 21.605)</option>
                      <option value="4">4 خانات عشرية (مثال: 21.6052)</option>
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      تُحدد دقة تقريب تكاليف الوحدة، هوامش الربح، والكميات ونسب الإنجاز في بطاقات التحكم والتقارير.
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Default Crew Composition */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <HardHat size={18} color="#fbbf24" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    تكوين طاقم العمل الافتراضي (Default Crew)
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">عدد الفنيين (المعلمين) *</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      required
                      className="input-field"
                      value={calcSettings.default_crew_skilled ?? 1}
                      onChange={(e) => setCalcSettings({ ...calcSettings, default_crew_skilled: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">عدد المساعدين (العمال) *</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      required
                      className="input-field"
                      value={calcSettings.default_crew_unskilled ?? 1}
                      onChange={(e) => setCalcSettings({ ...calcSettings, default_crew_unskilled: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'block' }}>
                  التركيبة الافتراضية لطاقم العمل في بطاقات التحكم في حال عدم تحديد تكوين مخصص للمرحلة التنفيذية.
                </span>
              </div>

              {/* Card 4: Default Wage & Productivity Rates */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Activity size={18} color="#a78bfa" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    الإنتاجيات واليوميات القياسية المرجعية
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>معدل الإنتاج القياسي اليومي للبند *</span>
                      <span style={{ color: '#a78bfa', fontWeight: 700 }}>وحدة / يوم</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      required
                      className="input-field"
                      value={calcSettings.default_daily_productivity ?? 20}
                      onChange={(e) => setCalcSettings({ ...calcSettings, default_daily_productivity: Number(e.target.value) })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">يومية الفني الافتراضية *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        className="input-field"
                        value={calcSettings.default_skilled_daily_wage ?? 224}
                        onChange={(e) => setCalcSettings({ ...calcSettings, default_skilled_daily_wage: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">يومية المساعد الافتراضية *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        className="input-field"
                        value={calcSettings.default_unskilled_daily_wage ?? 208}
                        onChange={(e) => setCalcSettings({ ...calcSettings, default_unskilled_daily_wage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Equations Impact Summary */}
            <div
              className="glass-card"
              style={{
                padding: '1.5rem',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <Info size={18} color="#60a5fa" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  معاينة حية لتطبيق هذه المعاملات على معادلات المنظومة الحالية
                </h4>
              </div>

              {(() => {
                const hours = Number(calcSettings.hours_per_work_day) || 8;
                const overtime = Number(calcSettings.overtime_multiplier) || 1.5;
                const skilledCrew = Number(calcSettings.default_crew_skilled) || 1;
                const unskilledCrew = Number(calcSettings.default_crew_unskilled) || 1;
                const totalCrew = skilledCrew + unskilledCrew;
                const perDay = Number(calcSettings.default_daily_productivity) || 20;
                const skilledWage = Number(calcSettings.default_skilled_daily_wage) || 224;
                const unskilledWage = Number(calcSettings.default_unskilled_daily_wage) || 208;
                const decimals = Number(calcSettings.rounding_decimals) !== undefined ? Number(calcSettings.rounding_decimals) : 2;

                const crewDailyCost = skilledCrew * skilledWage + unskilledCrew * unskilledWage;
                const laborCostPerUnit = perDay > 0 ? (crewDailyCost / perDay).toFixed(decimals) : '0';
                const hourlyPerWorker = totalCrew > 0 ? (perDay / (totalCrew * hours)).toFixed(decimals) : '0';
                const overtimeHourlySkilled = (skilledWage / hours * overtime).toFixed(decimals);

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تكلفة طاقم العمل اليومي</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>
                        {crewDailyCost} ريال / يوم
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        ({skilledCrew} × {skilledWage}) + ({unskilledCrew} × {unskilledWage})
                      </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>تكلفة أجر العمالة للوحدة القياسية</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
                        {laborCostPerUnit} ريال / م²
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {crewDailyCost} ÷ {perDay} م²
                      </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إنتاجية ساعة العمل للفرد الواحد</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>
                        {hourlyPerWorker} م² / (ساعة · فرد)
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {perDay} ÷ ({totalCrew} أفراد × {hours} ساعات)
                      </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>أجر ساعة الإضافي للفني</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a78bfa', marginTop: '0.25rem' }}>
                        {overtimeHourlySkilled} ريال / ساعة
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        ({skilledWage} ÷ {hours}) × {overtime}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Submit Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={isSavingCalc}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                }}
              >
                {isSavingCalc ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري حفظ المعاملات...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>حفظ وتطبيق جميع المعاملات الحسابية</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE / EDIT LABOR RATE MODAL */}
      <Modal
        isOpen={showRateModal}
        onClose={() => setShowRateModal(false)}
        title={editingRate ? 'تعديل معدل الأجر' : 'إضافة معدل أجر جديد'}
        icon={<DollarSign size={22} color="#34d399" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowRateModal(false)}
              className="btn btn-secondary"
              disabled={isSavingRate}
            >
              إلغاء
            </button>
            <button type="submit" form="labor-rate-form" className="btn btn-primary" disabled={isSavingRate}>
              {isSavingRate ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingRate ? 'حفظ التعديل' : 'إضافة المعدل'}</span>
            </button>
          </div>
        }
      >
        <form id="labor-rate-form" onSubmit={handleSaveRate}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>فئة / نوع الأجر</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="input-field"
                value={rateFormData.rateType}
                onChange={(e) => setRateFormData({ ...rateFormData, rateType: e.target.value })}
              >
                <option value="normal">ساعات العمل العادية (Normal)</option>
                <option value="overtime">ساعات العمل الإضافية (Overtime)</option>
                <option value="weekend">عطلات ونهاية الأسبوع (Weekend)</option>
                <option value="supervisor">أجر الإشراف الميداني (Supervisor)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>الأجر بالساعة (SAR)</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={rateFormData.hourlyRate}
                  onChange={(e) =>
                    setRateFormData({ ...rateFormData, hourlyRate: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>الأجر اليومي (SAR)</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={rateFormData.dailyRate}
                  onChange={(e) =>
                    setRateFormData({ ...rateFormData, dailyRate: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">تاريخ بدء السريان</label>
              <WheelDatePicker
                value={rateFormData.effectiveFrom || ''}
                onChange={(val) => setRateFormData({ ...rateFormData, effectiveFrom: val })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
