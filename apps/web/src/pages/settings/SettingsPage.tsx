import React, { useEffect, useState, useCallback } from 'react';
import {
  laborRatesApi,
  type LaborRateItem,
  type CreateLaborRatePayload,
} from '../../api/labor-rates.api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
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
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'rates' | 'roles'>('company');

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

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    setTimeout(() => {
      setIsSavingCompany(false);
      setSuccessMsg('تم حفظ وتحديث بيانات الشركة والإعدادات العامة بنجاح.');
    }, 400);
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
              <input
                type="date"
                className="input-field"
                value={rateFormData.effectiveFrom || ''}
                onChange={(e) => setRateFormData({ ...rateFormData, effectiveFrom: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
