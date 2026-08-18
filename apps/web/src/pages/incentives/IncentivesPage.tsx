import React, { useEffect, useState, useCallback } from 'react';
import {
  incentivesApi,
  type IncentiveRule,
  type IncentiveCalculationItem,
  type IncentiveLedgerItem,
  type CreateIncentiveRulePayload,
} from '../../api/incentives.api';
import { Modal } from '../../components/Modal';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { WheelDatePicker } from '../../components/WheelPicker';
import { useI18n } from '../../i18n/I18nContext';
import {
  Award,
  Plus,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export const IncentivesPage: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'ledger' | 'calculate' | 'rules'>('ledger');

  // Rules State
  const [rules, setRules] = useState<IncentiveRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<IncentiveRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState<CreateIncentiveRulePayload>({
    name: '',
    type: 'production_bonus',
    thresholdPercentage: 100,
    rewardAmount: 50,
    enabled: true,
  });
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [deletingRule, setDeletingRule] = useState<IncentiveRule | null>(null);

  // Calculation State
  const [calcFromDate, setCalcFromDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [calcToDate, setCalcToDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResults, setCalcResults] = useState<IncentiveCalculationItem[]>([]);
  const [calcTotalAmount, setCalcTotalAmount] = useState(0);
  const [isApproving, setIsApproving] = useState(false);
  const [selectedCalcIndices, setSelectedCalcIndices] = useState<number[]>([]);

  // Ledger State
  const [ledger, setLedger] = useState<IncentiveLedgerItem[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit] = useState(15);
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('');
  const [ledgerSummary, setLedgerSummary] = useState({ totalPending: 0, totalPaid: 0, grandTotal: 0 });
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  // Feedback Alerts
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Rules
  const loadRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const res = await incentivesApi.listRules({ limit: 100 });
      setRules(res.data || []);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_قواعد_الحوافز_f4c4bc'));
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  // Load Ledger
  const loadLedger = useCallback(async () => {
    setIsLoadingLedger(true);
    try {
      const res = await incentivesApi.listLedger({
        page: ledgerPage,
        limit: ledgerLimit,
        status: ledgerStatusFilter || undefined,
      });
      setLedger(res.data || []);
      setLedgerTotal(res.total || 0);
      if (res.summary) {
        setLedgerSummary(res.summary);
      }
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_سجل_استحقاقات_الحواف_3f548f'));
    } finally {
      setIsLoadingLedger(false);
    }
  }, [ledgerPage, ledgerLimit, ledgerStatusFilter]);

  useEffect(() => {
    loadRules();
    loadLedger();
  }, [loadRules, loadLedger]);

  const handleRunCalculation = async () => {
    setIsCalculating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await incentivesApi.calculate({
        fromDate: calcFromDate || undefined,
        toDate: calcToDate || undefined,
      });
      setCalcResults(res.calculations || []);
      setCalcTotalAmount(res.totalAmount || 0);
      // Select all by default
      setSelectedCalcIndices((res.calculations || []).map((_, i) => i));
      if (res.calculations?.length === 0) {
        setSuccessMsg(t('auto.تم_احتساب_الحوافز_لا_توجد_سجلا_1b44db'));
      } else {
        setSuccessMsg(`تم احتساب الحوافز بنجاح: تم العثور على ${res.calculations.length} استحقاق بقيمة إجمالية ${res.totalAmount} SAR.`);
      }
    } catch (err: any) {
      setError(err.message || t('auto.فشل_احتساب_الحوافز_7e4674'));
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApproveCalculations = async () => {
    if (selectedCalcIndices.length === 0) {
      setError(t('auto.يرجى_تحديد_بند_واحد_على_الأقل__23e77d'));
      return;
    }

    setIsApproving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const itemsToApprove = selectedCalcIndices.map((idx) => {
        const item = calcResults[idx];
        return {
          employeeId: item.employeeId,
          ruleId: item.ruleId,
          amount: item.amount,
          projectId: item.projectId,
          reason: item.reason,
          date: calcToDate,
        };
      });

      const res = await incentivesApi.approve({ calculations: itemsToApprove });
      setSuccessMsg(`تم اعتماد ${res.approvedCount || itemsToApprove.length} حافز وترحيلها إلى سجل الاستحقاقات بنجاح.`);
      setCalcResults([]);
      setSelectedCalcIndices([]);
      loadLedger();
      setActiveTab('ledger');
    } catch (err: any) {
      setError(err.message || t('auto.فشل_اعتماد_الحوافز_35d173'));
    } finally {
      setIsApproving(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setMarkingPaidId(id);
    setError(null);
    try {
      await incentivesApi.markPaid(id);
      setSuccessMsg(t('auto.تم_تحديث_حالة_الاستحقاق_إلى_مد_7ae1cf'));
      loadLedger();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحديث_حالة_الاستحقاق_502194'));
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleOpenCreateRule = () => {
    setEditingRule(null);
    setRuleFormData({
      name: '',
      type: 'production_bonus',
      thresholdPercentage: 100,
      rewardAmount: 50,
      enabled: true,
    });
    setShowRuleModal(true);
  };

  const handleOpenEditRule = (rule: IncentiveRule) => {
    setEditingRule(rule);
    setRuleFormData({
      name: rule.name,
      type: rule.rule_type,
      thresholdPercentage: Number(rule.threshold_percentage),
      rewardAmount: Number(rule.reward_amount),
      enabled: rule.is_active,
    });
    setShowRuleModal(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.name.trim()) {
      setError(t('auto.اسم_القاعدة_مطلوب_13c570'));
      return;
    }

    setIsSavingRule(true);
    setError(null);
    try {
      if (editingRule) {
        await incentivesApi.updateRule(editingRule.id, ruleFormData);
        setSuccessMsg(t('auto.تم_تحديث_قاعدة_الحوافز_بنجاح_35078a'));
      } else {
        await incentivesApi.createRule(ruleFormData);
        setSuccessMsg(t('auto.تم_إنشاء_قاعدة_الحوافز_الجديدة_148c72'));
      }
      setShowRuleModal(false);
      loadRules();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_قاعدة_الحوافز_7ad662'));
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    setIsSavingRule(true);
    try {
      await incentivesApi.deleteRule(deletingRule.id);
      setSuccessMsg(t('auto.تم_حذف_قاعدة_الحوافز_بنجاح_4bb82e'));
      setDeletingRule(null);
      loadRules();
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حذف_قاعدة_الحوافز_4ccf62'));
    } finally {
      setIsSavingRule(false);
    }
  };

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'production_bonus':
        return <span className="badge badge-primary">{t('auto.حافز_تجاوز_الإنتاجية_212ad6')}</span>;
      case 'quality_bonus':
        return <span className="badge badge-accent">{t('auto.مكافأة_جودة_وأداء_b14794')}</span>;
      case 'attendance_bonus':
        return <span className="badge badge-success">{t('auto.حافز_انتظام_الحضور_6ab194')}</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  const getLedgerStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge badge-success">{t('auto.تم_الصرف_مدفوع_26194b')}</span>;
      case 'approved':
        return <span className="badge badge-primary">{t('auto.معتمد_ومستحق_26fc8d')}</span>;
      default:
        return <span className="badge badge-accent">{t('auto.قيد_المعالجة_معلق_64bd38')}</span>;
    }
  };

  const activeRulesCount = rules.filter((r) => r.is_active).length;

  const statsItems = [
    {
      label: t('auto.إجمالي_الحوافز_المرصودة_109256'),
      value: `${Number(ledgerSummary.grandTotal || 0).toLocaleString()} SAR`,
      helper: `${ledgerTotal} استحقاق مسجل`,
      icon: <DollarSign size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.مستحقات_بانتظار_الصرف_13aee1'),
      value: `${Number(ledgerSummary.totalPending || 0).toLocaleString()} SAR`,
      helper: t('auto.معتمدة_وجاهزة_للتحويل_16bdfd'),
      icon: <Clock size={22} />,
      color: '#f59e0b',
    },
    {
      label: t('auto.المصروف_والمسدد_للعمالة_5d44f3'),
      value: `${Number(ledgerSummary.totalPaid || 0).toLocaleString()} SAR`,
      helper: t('auto.تم_تحويله_لحسابات_المستفيدين_35c68b'),
      icon: <CheckCircle2 size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.قواعد_الحوافز_النشطة_4681a9'),
      value: activeRulesCount,
      helper: `من إجمالي ${rules.length} قاعدة معرفة`,
      icon: <Award size={22} />,
      color: '#a78bfa',
    },
  ];

  const startRecord = ledger.length === 0 ? 0 : (ledgerPage - 1) * ledgerLimit + 1;
  const endRecord = Math.min(ledgerPage * ledgerLimit, ledgerTotal);

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
            <Award size={26} color="#f59e0b" />
            <span>{t('finance_reports.incentives_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.incentives')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setActiveTab('calculate');
            }}
            className={`btn ${activeTab === 'calculate' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ gap: '0.4rem' }}
          >
            <Calculator size={17} />
            <span>{t('auto.احتساب_الحوافز_من_الإنتاجية_7a7dc8')}</span>
          </button>

          <button
            onClick={handleOpenCreateRule}
            className="btn btn-primary"
            style={{ gap: '0.4rem' }}
          >
            <Plus size={17} />
            <span>{t('auto.إضافة_قاعدة_حوافز_55165a')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoadingLedger && ledger.length === 0} />

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
          onClick={() => setActiveTab('ledger')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'ledger' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'ledger' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: activeTab === 'ledger' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <DollarSign size={16} />
          <span>{t('auto.سجل_الاستحقاقات_والصرف_6f1736')}{ledgerTotal})</span>
        </button>

        <button
          onClick={() => setActiveTab('calculate')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'calculate' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'calculate' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: activeTab === 'calculate' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Sparkles size={16} />
          <span>{t('auto.محرك_الاحتساب_والاعتماد_66bf5d')}</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'rules' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'rules' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: activeTab === 'rules' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Layers size={16} />
          <span>{t('auto.قواعد_ومعادلات_الحوافز_70a6eb')}{rules.length})</span>
        </button>
      </div>

      {/* TAB 1: LEDGER */}
      {activeTab === 'ledger' && (
        <div>
          {/* Filters Bar */}
          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'end',
              flexWrap: 'wrap',
            }}
          >
            <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
              <label className="form-label">{t('auto.تصفية_بحسب_حالة_الصرف_3f09b9')}</label>
              <select
                className="input-field"
                value={ledgerStatusFilter}
                onChange={(e) => {
                  setLedgerStatusFilter(e.target.value);
                  setLedgerPage(1);
                }}
              >
                <option value="">{t('auto.كافة_الحالات_3318a9')}</option>
                <option value="approved">{t('auto.معتمد_ومستحق_Approved_6c6240')}</option>
                <option value="paid">{t('auto.تم_الصرف_Paid_265a6b')}</option>
                <option value="pending">{t('auto.قيد_المعالجة_Pending_464375')}</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          {isLoadingLedger && ledger.length === 0 ? (
            <TableSkeleton rows={6} columns={7} />
          ) : (
            <div
              className={`glass-card table-loading-overlay ${isLoadingLedger ? 'loading-soft' : ''}`}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '1rem' }}>{t('auto.التاريخ_7f54ad')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.المستفيد_العامل_79da69')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.المشروع_7f28ee')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.القاعدة_والمبرر_786300')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.قيمة_الحافز_SAR_59613a')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.الحالة_252d72')}</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          {t('auto.لا_توجد_استحقاقات_مسجلة_بسجل_ا_5c83a6')}</td>
                      </tr>
                    ) : (
                      ledger.map((item) => (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={14} color="#60a5fa" />
                              <span>{item.date ? item.date.split('T')[0] : '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{item.employee_name || t('auto.عامل_2ec042')}</div>
                            {item.employee_code && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                {t('auto.كود_2f1031')}{item.employee_code}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            {item.project_name || t('auto.عام_غير_محدد_360223')}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600, color: '#60a5fa' }}>{item.rule_name || t('auto.حافز_تشغيلي_3ae571')}</div>
                            {item.notes && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>
                            {Number(item.amount).toLocaleString()}{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                          </td>
                          <td style={{ padding: '1rem' }}>{getLedgerStatusBadge(item.status)}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {item.status !== 'paid' ? (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(item.id)}
                                disabled={markingPaidId === item.id}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  gap: '0.3rem',
                                  borderColor: 'rgba(52, 211, 153, 0.4)',
                                  color: '#34d399',
                                }}
                              >
                                {markingPaidId === item.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                                <span>{t('auto.تسجيل_كمدفوع_24bbf4')}</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('auto.تم_السداد_5dbdd2')}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                style={{
                  padding: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{ledgerTotal} {t('auto.استحقاق_625541')}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={ledgerPage <= 1}
                    onClick={() => setLedgerPage(ledgerPage - 1)}
                  >
                    {t('auto.السابق_252abb')}</button>
                  <span style={{ padding: '0.35rem 0.5rem' }}>{t('auto.صفحة_2ea914')}{ledgerPage}</span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={ledgerPage * ledgerLimit >= ledgerTotal}
                    onClick={() => setLedgerPage(ledgerPage + 1)}
                  >
                    {t('auto.التالي_252ecf')}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CALCULATE */}
      {activeTab === 'calculate' && (
        <div>
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calculator size={18} color="#60a5fa" />
              <span>{t('auto.فترة_احتساب_الأداء_والإنتاجية_46594a')}</span>
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                alignItems: 'end',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('auto.من_تاريخ_4c8e03')}</label>
                <WheelDatePicker
                  placeholder={t('auto.من_تاريخ_3db437')}
                  value={calcFromDate}
                  onChange={(val) => setCalcFromDate(val)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('auto.إلى_تاريخ_d3e6d7')}</label>
                <WheelDatePicker
                  placeholder={t('auto.إلى_تاريخ_33c707')}
                  value={calcToDate}
                  onChange={(val) => setCalcToDate(val)}
                />
              </div>

              <div>
                <button
                  onClick={handleRunCalculation}
                  disabled={isCalculating}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '42px', gap: '0.5rem' }}
                >
                  {isCalculating ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                  <span>{t('auto.تشغيل_احتساب_الحوافز_الآن_576581')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results Area */}
          {calcResults.length > 0 && (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  padding: '1.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    {t('auto.نتائج_الاحتساب_6d5ee0')}{calcResults.length} {t('auto.استحقاق_بقيمة_إجمالية_878d04')}{' '}
                    <span style={{ color: '#34d399' }}>{calcTotalAmount.toLocaleString()} SAR</span>
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {t('auto.حدد_البنود_المراد_اعتمادها_ثم__381afb')}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      if (selectedCalcIndices.length === calcResults.length) {
                        setSelectedCalcIndices([]);
                      } else {
                        setSelectedCalcIndices(calcResults.map((_, i) => i));
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem' }}
                  >
                    {selectedCalcIndices.length === calcResults.length ? t('auto.إلغاء_تحديد_الكل_59e605') : t('auto.تحديد_الكل_1298a1')}
                  </button>

                  <button
                    onClick={handleApproveCalculations}
                    disabled={isApproving || selectedCalcIndices.length === 0}
                    className="btn btn-primary"
                    style={{ gap: '0.4rem', background: '#10b981' }}
                  >
                    {isApproving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>{t('auto.اعتماد_وصرف_الحوافز_المحددة_1fc9b3')}{selectedCalcIndices.length})</span>
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '1rem', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedCalcIndices.length === calcResults.length && calcResults.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCalcIndices(calcResults.map((_, i) => i));
                            } else {
                              setSelectedCalcIndices([]);
                            }
                          }}
                        />
                      </th>
                      <th style={{ padding: '1rem' }}>{t('auto.المستفيد_العامل_79da69')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.القاعدة_المطبقة_27c65c')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.المبرر_ونسبة_الإنجاز_612fba')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.المكافأة_المستحقة_SAR_140ae5')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcResults.map((item, idx) => {
                      const isSelected = selectedCalcIndices.includes(idx);
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '1rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCalcIndices([...selectedCalcIndices, idx]);
                                } else {
                                  setSelectedCalcIndices(selectedCalcIndices.filter((i) => i !== idx));
                                }
                              }}
                            />
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{item.employeeName}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span className="badge badge-primary">{item.ruleName}</span>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            <div>{item.reason}</div>
                            {item.percentage && (
                              <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.2rem' }}>
                                {t('auto.نسبة_الإنجاز_المحققة_1a492e')}{item.percentage}%
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>
                            {Number(item.amount).toLocaleString()}{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RULES */}
      {activeTab === 'rules' && (
        <div>
          {isLoadingRules && rules.length === 0 ? (
            <TableSkeleton rows={5} columns={6} />
          ) : (
            <div
              className={`glass-card table-loading-overlay ${isLoadingRules ? 'loading-soft' : ''}`}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '1rem' }}>{t('auto.اسم_القاعدة_7c288e')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.النوع_والمسار_27ccb9')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.الحد_المستهدف_أو_أيام_2ea2d1')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.مبلغ_المكافأة_SAR_147403')}</th>
                      <th style={{ padding: '1rem' }}>{t('auto.الحالة_252d72')}</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>{t('auto.الإجراءات_3259ef')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          {t('auto.لا_توجد_قواعد_حوافز_معرفة_بعد__7efcbc')}</td>
                      </tr>
                    ) : (
                      rules.map((rule) => (
                        <tr
                          key={rule.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{rule.name}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>{getRuleTypeBadge(rule.rule_type)}</td>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>
                            {rule.threshold_percentage}%
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 700, color: '#34d399' }}>
                            {Number(rule.reward_amount).toLocaleString()}{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SAR</span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {rule.is_active ? (
                              <span className="badge badge-success">{t('auto.نشطة_ومطبقة_79b2ed')}</span>
                            ) : (
                              <span className="badge badge-accent">{t('auto.معطلة_مؤقت_ا_7bbcec')}</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditRule(rule)}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                                title={t('auto.تعديل_القاعدة_6a48fd')}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingRule(rule)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                  color: '#f87171',
                                  borderColor: 'rgba(239, 68, 68, 0.25)',
                                }}
                                title={t('auto.حذف_القاعدة_346950')}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
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

      {/* CREATE / EDIT RULE MODAL */}
      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title={editingRule ? t('auto.تعديل_قاعدة_الحوافز_64a7e1') : t('auto.إضافة_قاعدة_حوافز_جديدة_495482')}
        icon={<Award size={22} color="#f59e0b" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowRuleModal(false)}
              className="btn btn-secondary"
              disabled={isSavingRule}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="incentive-rule-form" className="btn btn-primary" disabled={isSavingRule}>
              {isSavingRule ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingRule ? t('auto.حفظ_التعديلات_4ff313') : t('auto.إنشاء_القاعدة_71c0de')}</span>
            </button>
          </div>
        }
      >
        <form id="incentive-rule-form" onSubmit={handleSaveRule}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>{t('auto.اسم_القاعدة_7c288e')}</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={t('auto.مثال_حافز_إنجاز_صب_الخرسانة_12_50aa9e')}
                value={ruleFormData.name}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>{t('auto.نوع_الحافز_4da0eb')}</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="input-field"
                value={ruleFormData.type}
                onChange={(e) => setRuleFormData({ ...ruleFormData, type: e.target.value })}
              >
                <option value="production_bonus">{t('auto.حافز_تجاوز_الإنتاجية_Productio_6ab11b')}</option>
                <option value="quality_bonus">{t('auto.مكافأة_جودة_وأداء_Quality_Bonu_45e586')}</option>
                <option value="attendance_bonus">{t('auto.حافز_انتظام_الحضور_Attendance__18bbca')}</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>{t('auto.الحد_الأدنى_المستهدف_1919c3')}</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={ruleFormData.thresholdPercentage}
                  onChange={(e) =>
                    setRuleFormData({ ...ruleFormData, thresholdPercentage: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>{t('auto.مبلغ_المكافأة_SAR_147403')}</span>
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={ruleFormData.rewardAmount}
                  onChange={(e) =>
                    setRuleFormData({ ...ruleFormData, rewardAmount: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="checkbox"
                id="ruleEnabledCheck"
                checked={ruleFormData.enabled}
                onChange={(e) => setRuleFormData({ ...ruleFormData, enabled: e.target.checked })}
              />
              <label htmlFor="ruleEnabledCheck" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
                {t('auto.تفعيل_القاعدة_في_محرك_الاحتساب_342da0')}</label>
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE RULE MODAL */}
      <Modal
        isOpen={!!deletingRule}
        onClose={() => setDeletingRule(null)}
        title={t('auto.تأكيد_حذف_قاعدة_الحوافز_4e4c27')}
        icon={<Trash2 size={22} color="#f87171" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeletingRule(null)}
              className="btn btn-secondary"
              disabled={isSavingRule}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button
              type="button"
              onClick={handleDeleteRule}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isSavingRule}
            >
              {isSavingRule ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.تأكيد_الحذف_4af57e')}</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {t('auto.هل_أنت_متأكد_من_رغبتك_في_حذف_ا_47c717')}<strong style={{ color: 'var(--text-heading)' }}>"{deletingRule?.name}"</strong>{t('auto.k_61f')}</p>
      </Modal>
    </div>
  );
};
