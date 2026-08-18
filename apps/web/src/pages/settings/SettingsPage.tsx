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
import { AccountSettingsModal } from '../../components/AccountSettingsModal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { WheelDatePicker } from '../../components/WheelPicker';
import { useI18n } from '../../i18n/I18nContext';
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
  const { t } = useI18n();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'rates' | 'roles' | 'calculations'>('company');

  // Company Settings Form State
  const [companyName, setCompanyName] = useState(t('auto.شركة_ساكوديكو_للمقاولات_العامة_4ba917'));
  const [crNumber, setCrNumber] = useState('1010894210');
  const [vatNumber, setVatNumber] = useState('310459821000003');
  const [currency, setCurrency] = useState(t('auto.SAR_ريال_سعودي_221dcf'));
  const [timezone, setTimezone] = useState('Asia/Riyadh (GMT+3)');
  const [country, setCountry] = useState(t('auto.المملكة_العربية_السعودية_KSA_7b4617'));
  const [address, setAddress] = useState(t('auto.الرياض_حي_الملز_طريق_صلاح_الدي_2288a3'));
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

  // Account Settings Modal
  const [showAccountModal, setShowAccountModal] = useState(false);

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
      setError(err.message || t('auto.فشل_تحميل_معدلات_أجور_العمالة_7414ec'));
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
      setSuccessMsg(t('auto.تم_حفظ_وتحديث_بيانات_الشركة_وا_7ef9d2'));
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
      setSuccessMsg(t('auto.تم_حفظ_وتحديث_جميع_معاملات_الم_23a71d'));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auto.فشل_حفظ_معاملات_الحساب_70579d'));
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
        setSuccessMsg(t('auto.تم_تحديث_معدل_الأجر_بنجاح_5e06a7'));
      } else {
        await laborRatesApi.create(rateFormData);
        setSuccessMsg(t('auto.تم_إضافة_معدل_الأجر_الجديد_بنج_598548'));
      }
      setShowRateModal(false);
      loadRates();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_معدل_الأجر_34a866'));
    } finally {
      setIsSavingRate(false);
    }
  };

  const getRateTypeLabel = (type: string) => {
    switch (type) {
      case 'normal':
        return <span className="badge badge-primary">{t('auto.ساعات_العمل_العادية_Normal_29f0bb')}</span>;
      case 'overtime':
        return <span className="badge badge-accent">{t('auto.ساعات_العمل_الإضافية_Overtime_5ebebf')}</span>;
      case 'weekend':
        return <span className="badge badge-secondary">{t('auto.عطلات_ونهاية_الأسبوع_Weekend_183249')}</span>;
      case 'supervisor':
        return <span className="badge badge-success">{t('auto.أجر_الإشراف_الميداني_Superviso_1fdfaf')}</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  // Static Permissions Matrix definitions
  const permissionsMatrix = [
    {
      module: t('auto.بطاقات_التحكم_والربحية_Control_568f9c'),
      admin: true,
      pm: true,
      engineer: true,
      supervisor: false,
      accountant: true,
    },
    {
      module: t('auto.الإنتاجية_اليومية_والمراحل_Pro_3383ca'),
      admin: true,
      pm: true,
      engineer: true,
      supervisor: true,
      accountant: false,
    },
    {
      module: t('auto.الحضور_والانصراف_والإضافي_Atte_572526'),
      admin: true,
      pm: true,
      engineer: true,
      supervisor: true,
      accountant: true,
    },
    {
      module: t('auto.التكاليف_والمصروفات_Costs_Expe_2bafa4'),
      admin: true,
      pm: true,
      engineer: false,
      supervisor: false,
      accountant: true,
    },
    {
      module: t('auto.الحوافز_والمكافآت_Incentives_E_12209c'),
      admin: true,
      pm: true,
      engineer: false,
      supervisor: false,
      accountant: true,
    },
    {
      module: t('auto.المقايسة_وتقدم_التنفيذ_BOQ_Pro_6739b1'),
      admin: true,
      pm: true,
      engineer: true,
      supervisor: false,
      accountant: true,
    },
    {
      module: t('auto.الأرشيف_والمستندات_Documents_A_639f4a'),
      admin: true,
      pm: true,
      engineer: true,
      supervisor: true,
      accountant: true,
    },
    {
      module: t('auto.إعدادات_المنظومة_والأسعار_Sett_68f789'),
      admin: true,
      pm: false,
      engineer: false,
      supervisor: false,
      accountant: false,
    },
  ];

  const statsItems = [
    {
      label: t('auto.المنشأة_والمقر_27f3d3'),
      value: 'SACODECO',
      helper: t('auto.المملكة_العربية_السعودية_6d9e78'),
      icon: <Building size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.العملة_المحاسبية_المعتمدة_47ffec'),
      value: 'SAR',
      helper: t('auto.ريال_سعودي_ee1167'),
      icon: <DollarSign size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.فئات_معدلات_الأجور_4bc4be'),
      value: `${rates.length} فئات`,
      helper: t('auto.ت_طبق_آلي_ا_على_الحضور_37fc3f'),
      icon: <Briefcase size={22} />,
      color: '#f59e0b',
    },
    {
      label: t('auto.المستخدم_الحالي_d5b879'),
      value: user?.fullName || user?.username || t('auto.مدير_النظام_2725af'),
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
            <span>{t('system.settings_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.settings')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAccountModal(true)}
          className="btn btn-secondary"
          style={{ gap: '0.5rem', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}
        >
          <Users size={16} />
          <span>{t('header.account_settings')}</span>
        </button>
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
          <span>{t('auto.بيانات_الشركة_والمنظومة_171de6')}</span>
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
          <span>{t('auto.معدلات_وتسعير_أجور_العمالة_136378')}{rates.length})</span>
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
          <span>{t('auto.المستخدمون_ومصفوفة_الصلاحيات_R_325e3e')}</span>
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
          <span>{t('auto.معادلات_الحساب_والتشغيل_Calcul_2528b9')}</span>
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
                  <span>{t('auto.اسم_الشركة_الرسمي_4a8a8a')}</span>
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
                <label className="form-label">{t('auto.رقم_السجل_التجاري_CR_Number_208a66')}</label>
                <input
                  type="text"
                  className="input-field"
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('auto.الرقم_الضريبي_VAT_Tax_ID_25a41b')}</label>
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
                  <span>{t('auto.العملة_المحاسبية_الرئيسية_6b1e4b')}</span>
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
                  <span>{t('auto.الدولة_والمنطقة_7fc2da')}</span>
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
                  <span>{t('auto.النطاق_الزمني_والتوقيت_f0b7e3')}</span>
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
                <label className="form-label">{t('auto.العنوان_والمقر_الرئيسي_75403e')}</label>
                <input
                  type="text"
                  className="input-field"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('auto.هاتف_التواصل_209c86')}</label>
                <input
                  type="text"
                  className="input-field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('auto.البريد_الإلكتروني_الرسمي_6d10e2')}</label>
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
                <span>{t('auto.حفظ_التعديلات_العامة_3b1bd8')}</span>
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
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t('auto.جدول_تسعير_ومعدلات_ساعات_وأيام_630f92')}</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('auto.ت_ستخدم_هذه_المعدلات_لاحتساب_ت_5817ed')}</p>
            </div>

            <button onClick={handleOpenCreateRate} className="btn btn-primary" style={{ gap: '0.4rem' }}>
              <Plus size={16} />
              <span>{t('auto.إضافة_معدل_أجر_73da77')}</span>
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
                    <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '1rem' }}>{t('auto.فئة_ونوع_الأجر_2a8bed')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.الأجر_بالساعة_SAR_Hour_1f9e77')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.الأجر_اليومي_SAR_Day_119f30')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.تاريخ_بدء_السريان_1d317f')}</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          {t('auto.لا_توجد_معدلات_أجور_مسجلة_5b48d4')}</td>
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
                              title={t('auto.تعديل_المعدل_4f288e')}
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
                <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1.1rem' }}>
                  {user?.fullName || user?.username}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {t('auto.اسم_المستخدم_396786')}{user?.username} {t('auto.معرف_النظام_7f5c68')}{user?.id}
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
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t('auto.مصفوفة_صلاحيات_الأدوار_القياسي_65feb0')}</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('auto.توزيع_صلاحيات_الوصول_والتعديل__31c24e')}</p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>{t('auto.الوحدة_الشاشة_4ec293')}</th>
                    <th style={{ padding: '1rem' }}>{t('auto.مدير_النظام_Admin_7feaa4')}</th>
                    <th style={{ padding: '1rem' }}>{t('auto.مدير_المشروع_PM_7e434e')}</th>
                    <th style={{ padding: '1rem' }}>{t('auto.مهندس_الموقع_Engineer_1a41e2')}</th>
                    <th style={{ padding: '1rem' }}>{t('auto.المشرف_الميداني_Supervisor_34fb30')}</th>
                    <th style={{ padding: '1rem' }}>{t('auto.المحاسب_المالي_Accountant_369374')}</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsMatrix.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-heading)' }}>
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
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  {t('auto.معاملات_المعادلات_الحسابية_وال_56ada9')}</h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {t('auto.جميع_الأرقام_والمعادلات_في_الن_c97c5c')}</p>
              </div>
            </div>
            {isLoadingCalc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('auto.جاري_تحميل_الإعدادات_3ca3f2')}</span>
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
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {t('auto.معايير_أوقات_وساعات_العمل_769179')}</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('auto.ساعات_العمل_اليومية_القياسية_3e4c16')}</span>
                      <span style={{ color: '#60a5fa', fontWeight: 700 }}>{t('auto.ساعة_يوم_141ac2')}</span>
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
                      {t('auto.ت_ستخدم_لحساب_إنتاجية_الساعة_ا_248e3c')}</span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('auto.معامل_احتساب_الوقت_الإضافي_Ove_7f8841')}</span>
                      <span style={{ color: '#60a5fa', fontWeight: 700 }}>{t('auto.مضاعف_Multiplier_698a30')}</span>
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
                      {t('auto.مضاعف_أجر_الساعة_لساعات_العمل__4c34ed')}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Rounding Decimals */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Sliders size={18} color="#34d399" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {t('auto.دقة_الحسابات_والتقريب_العشري_664eb3')}</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('auto.دقة_التقريب_العشري_Rounding_De_24886d')}</span>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>{t('auto.خانات_عشرية_ed67cb')}</span>
                    </label>
                    <select
                      className="input-field"
                      value={calcSettings.rounding_decimals ?? 2}
                      onChange={(e) => setCalcSettings({ ...calcSettings, rounding_decimals: Number(e.target.value) })}
                    >
                      <option value="0">{t('auto.0_خانات_أرقام_صحيحة_فقط_35008c')}</option>
                      <option value="1">{t('auto.1_خانة_عشرية_مثال_21_5_4743e1')}</option>
                      <option value="2">{t('auto.2_خانات_عشرية_مثال_21_60_قياسي_571d35')}</option>
                      <option value="3">{t('auto.3_خانات_عشرية_مثال_21_605_48a8dd')}</option>
                      <option value="4">{t('auto.4_خانات_عشرية_مثال_21_6052_a3d417')}</option>
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      {t('auto.ت_حدد_دقة_تقريب_تكاليف_الوحدة__990b84')}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Default Crew Composition */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <HardHat size={18} color="#fbbf24" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {t('auto.تكوين_طاقم_العمل_الافتراضي_Def_60f13b')}</h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{t('auto.عدد_الفنيين_المعلمين_40b645')}</label>
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
                    <label className="form-label">{t('auto.عدد_المساعدين_العمال_70fe42')}</label>
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
                  {t('auto.التركيبة_الافتراضية_لطاقم_العم_5d7d72')}</span>
              </div>

              {/* Card 4: Default Wage & Productivity Rates */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Activity size={18} color="#a78bfa" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {t('auto.الإنتاجيات_واليوميات_القياسية__37030c')}</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('auto.معدل_الإنتاج_القياسي_اليومي_لل_423e65')}</span>
                      <span style={{ color: '#a78bfa', fontWeight: 700 }}>{t('auto.وحدة_يوم_77101c')}</span>
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
                      <label className="form-label">{t('auto.يومية_الفني_الافتراضية_44002a')}</label>
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
                      <label className="form-label">{t('auto.يومية_المساعد_الافتراضية_747e1e')}</label>
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
                background: 'var(--bg-surface-elevated)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <Info size={18} color="#60a5fa" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  {t('auto.معاينة_حية_لتطبيق_هذه_المعاملا_a8e04a')}</h4>
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('auto.تكلفة_طاقم_العمل_اليومي_45ec2c')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>
                        {crewDailyCost} {t('auto.ريال_يوم_48a9da')}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        ({skilledCrew} × {skilledWage}) + ({unskilledCrew} × {unskilledWage})
                      </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('auto.تكلفة_أجر_العمالة_للوحدة_القيا_162ad5')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
                        {laborCostPerUnit} {t('auto.ريال_م_7144d1')}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {crewDailyCost} ÷ {perDay} {t('auto.م_c30d')}</div>
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('auto.إنتاجية_ساعة_العمل_للفرد_الواح_235ea6')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>
                        {hourlyPerWorker} {t('auto.م_ساعة_فرد_6102b6')}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {perDay} ÷ ({totalCrew} {t('auto.أفراد_5900f0')}{hours} {t('auto.ساعات_124688')}</div>
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('auto.أجر_ساعة_الإضافي_للفني_3812fd')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a78bfa', marginTop: '0.25rem' }}>
                        {overtimeHourlySkilled} {t('auto.ريال_ساعة_3363a4')}</div>
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
                    <span>{t('auto.جاري_حفظ_المعاملات_2f915f')}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{t('auto.حفظ_وتطبيق_جميع_المعاملات_الحس_7dd58b')}</span>
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
        title={editingRate ? t('auto.تعديل_معدل_الأجر_61efbc') : t('auto.إضافة_معدل_أجر_جديد_b6689a')}
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
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="labor-rate-form" className="btn btn-primary" disabled={isSavingRate}>
              {isSavingRate ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingRate ? t('auto.حفظ_التعديل_333adb') : t('auto.إضافة_المعدل_6370ef')}</span>
            </button>
          </div>
        }
      >
        <form id="labor-rate-form" onSubmit={handleSaveRate}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>{t('auto.فئة_نوع_الأجر_29f36b')}</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="input-field"
                value={rateFormData.rateType}
                onChange={(e) => setRateFormData({ ...rateFormData, rateType: e.target.value })}
              >
                <option value="normal">{t('auto.ساعات_العمل_العادية_Normal_29f0bb')}</option>
                <option value="overtime">{t('auto.ساعات_العمل_الإضافية_Overtime_5ebebf')}</option>
                <option value="weekend">{t('auto.عطلات_ونهاية_الأسبوع_Weekend_183249')}</option>
                <option value="supervisor">{t('auto.أجر_الإشراف_الميداني_Superviso_1fdfaf')}</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>{t('auto.الأجر_بالساعة_SAR_646d5e')}</span>
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
                  <span>{t('auto.الأجر_اليومي_SAR_1100d0')}</span>
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
              <label className="form-label">{t('auto.تاريخ_بدء_السريان_1d317f')}</label>
              <WheelDatePicker
                value={rateFormData.effectiveFrom || ''}
                onChange={(val) => setRateFormData({ ...rateFormData, effectiveFrom: val })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  );
};
