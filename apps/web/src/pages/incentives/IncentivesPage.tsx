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
      setError(err.message || 'فشل تحميل قواعد الحوافز');
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
      setError(err.message || 'فشل تحميل سجل استحقاقات الحوافز');
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
        setSuccessMsg('تم احتساب الحوافز: لا توجد سجلات مستحقة تطابق شروط القواعد في هذه الفترة.');
      } else {
        setSuccessMsg(`تم احتساب الحوافز بنجاح: تم العثور على ${res.calculations.length} استحقاق بقيمة إجمالية ${res.totalAmount} SAR.`);
      }
    } catch (err: any) {
      setError(err.message || 'فشل احتساب الحوافز');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApproveCalculations = async () => {
    if (selectedCalcIndices.length === 0) {
      setError('يرجى تحديد بند واحد على الأقل للاعتماد');
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
      setError(err.message || 'فشل اعتماد الحوافز');
    } finally {
      setIsApproving(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setMarkingPaidId(id);
    setError(null);
    try {
      await incentivesApi.markPaid(id);
      setSuccessMsg('تم تحديث حالة الاستحقاق إلى "مدفوع" بنجاح.');
      loadLedger();
    } catch (err: any) {
      setError(err.message || 'فشل تحديث حالة الاستحقاق');
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
      setError('اسم القاعدة مطلوب');
      return;
    }

    setIsSavingRule(true);
    setError(null);
    try {
      if (editingRule) {
        await incentivesApi.updateRule(editingRule.id, ruleFormData);
        setSuccessMsg('تم تحديث قاعدة الحوافز بنجاح.');
      } else {
        await incentivesApi.createRule(ruleFormData);
        setSuccessMsg('تم إنشاء قاعدة الحوافز الجديدة بنجاح.');
      }
      setShowRuleModal(false);
      loadRules();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ قاعدة الحوافز');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    setIsSavingRule(true);
    try {
      await incentivesApi.deleteRule(deletingRule.id);
      setSuccessMsg('تم حذف قاعدة الحوافز بنجاح.');
      setDeletingRule(null);
      loadRules();
    } catch (err: any) {
      setError(err.message || 'فشل حذف قاعدة الحوافز');
    } finally {
      setIsSavingRule(false);
    }
  };

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'production_bonus':
        return <span className="badge badge-primary">حافز تجاوز الإنتاجية</span>;
      case 'quality_bonus':
        return <span className="badge badge-accent">مكافأة جودة وأداء</span>;
      case 'attendance_bonus':
        return <span className="badge badge-success">حافز انتظام الحضور</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  const getLedgerStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge badge-success">تم الصرف (مدفوع)</span>;
      case 'approved':
        return <span className="badge badge-primary">معتمد ومستحق</span>;
      default:
        return <span className="badge badge-accent">قيد المعالجة (معلق)</span>;
    }
  };

  const activeRulesCount = rules.filter((r) => r.is_active).length;

  const statsItems = [
    {
      label: 'إجمالي الحوافز المرصودة',
      value: `${Number(ledgerSummary.grandTotal || 0).toLocaleString()} SAR`,
      helper: `${ledgerTotal} استحقاق مسجل`,
      icon: <DollarSign size={22} />,
      color: '#60a5fa',
    },
    {
      label: 'مستحقات بانتظار الصرف',
      value: `${Number(ledgerSummary.totalPending || 0).toLocaleString()} SAR`,
      helper: 'معتمدة وجاهزة للتحويل',
      icon: <Clock size={22} />,
      color: '#f59e0b',
    },
    {
      label: 'المصروف والمسدد للعمالة',
      value: `${Number(ledgerSummary.totalPaid || 0).toLocaleString()} SAR`,
      helper: 'تم تحويله لحسابات المستفيدين',
      icon: <CheckCircle2 size={22} />,
      color: '#34d399',
    },
    {
      label: 'قواعد الحوافز النشطة',
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
            <span>احتساب الحوافز من الإنتاجية</span>
          </button>

          <button
            onClick={handleOpenCreateRule}
            className="btn btn-primary"
            style={{ gap: '0.4rem' }}
          >
            <Plus size={17} />
            <span>إضافة قاعدة حوافز</span>
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
          <span>سجل الاستحقاقات والصرف ({ledgerTotal})</span>
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
          <span>محرك الاحتساب والاعتماد</span>
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
          <span>قواعد ومعادلات الحوافز ({rules.length})</span>
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
              <label className="form-label">تصفية بحسب حالة الصرف</label>
              <select
                className="input-field"
                value={ledgerStatusFilter}
                onChange={(e) => {
                  setLedgerStatusFilter(e.target.value);
                  setLedgerPage(1);
                }}
              >
                <option value="">كافة الحالات</option>
                <option value="approved">معتمد ومستحق (Approved)</option>
                <option value="paid">تم الصرف (Paid)</option>
                <option value="pending">قيد المعالجة (Pending)</option>
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
                    <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '1rem' }}>التاريخ</th>
                      <th style={{ padding: '1rem' }}>المستفيد / العامل</th>
                      <th style={{ padding: '1rem' }}>المشروع</th>
                      <th style={{ padding: '1rem' }}>القاعدة والمبرر</th>
                      <th style={{ padding: '1rem' }}>قيمة الحافز (SAR)</th>
                      <th style={{ padding: '1rem' }}>الحالة</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          لا توجد استحقاقات مسجلة بسجل الحوافز
                        </td>
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
                            <div style={{ fontWeight: 700, color: '#ffffff' }}>{item.employee_name || 'عامل'}</div>
                            {item.employee_code && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                كود: {item.employee_code}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            {item.project_name || 'عام / غير محدد'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600, color: '#60a5fa' }}>{item.rule_name || 'حافز تشغيلي'}</div>
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
                                <span>تسجيل كمدفوع</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>تم السداد ✓</span>
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
                  عرض {startRecord}–{endRecord} من إجمالي {ledgerTotal} استحقاق
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={ledgerPage <= 1}
                    onClick={() => setLedgerPage(ledgerPage - 1)}
                  >
                    السابق
                  </button>
                  <span style={{ padding: '0.35rem 0.5rem' }}>صفحة {ledgerPage}</span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={ledgerPage * ledgerLimit >= ledgerTotal}
                    onClick={() => setLedgerPage(ledgerPage + 1)}
                  >
                    التالي
                  </button>
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
              <span>فترة احتساب الأداء والإنتاجية</span>
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
                <label className="form-label">من تاريخ</label>
                <WheelDatePicker
                  placeholder="من تاريخ..."
                  value={calcFromDate}
                  onChange={(val) => setCalcFromDate(val)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">إلى تاريخ</label>
                <WheelDatePicker
                  placeholder="إلى تاريخ..."
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
                  <span>تشغيل احتساب الحوافز الآن</span>
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
                    نتائج الاحتساب: {calcResults.length} استحقاق بقيمة إجمالية{' '}
                    <span style={{ color: '#34d399' }}>{calcTotalAmount.toLocaleString()} SAR</span>
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    حدد البنود المراد اعتمادها ثم انقر زر الاعتماد والترحيل لسجل الحوافز
                  </p>
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
                    {selectedCalcIndices.length === calcResults.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>

                  <button
                    onClick={handleApproveCalculations}
                    disabled={isApproving || selectedCalcIndices.length === 0}
                    className="btn btn-primary"
                    style={{ gap: '0.4rem', background: '#10b981' }}
                  >
                    {isApproving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>اعتماد وصرف الحوافز المحددة ({selectedCalcIndices.length})</span>
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
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
                      <th style={{ padding: '1rem' }}>المستفيد / العامل</th>
                      <th style={{ padding: '1rem' }}>القاعدة المطبقة</th>
                      <th style={{ padding: '1rem' }}>المبرر ونسبة الإنجاز</th>
                      <th style={{ padding: '1rem' }}>المكافأة المستحقة (SAR)</th>
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
                            <div style={{ fontWeight: 700, color: '#ffffff' }}>{item.employeeName}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span className="badge badge-primary">{item.ruleName}</span>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            <div>{item.reason}</div>
                            {item.percentage && (
                              <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.2rem' }}>
                                نسبة الإنجاز المحققة: {item.percentage}%
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
                    <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '1rem' }}>اسم القاعدة</th>
                      <th style={{ padding: '1rem' }}>النوع والمسار</th>
                      <th style={{ padding: '1rem' }}>الحد المستهدف (% أو أيام)</th>
                      <th style={{ padding: '1rem' }}>مبلغ المكافأة (SAR)</th>
                      <th style={{ padding: '1rem' }}>الحالة</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          لا توجد قواعد حوافز معرفة بعد. انقر "إضافة قاعدة حوافز" للبدء.
                        </td>
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
                            <div style={{ fontWeight: 700, color: '#ffffff' }}>{rule.name}</div>
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
                              <span className="badge badge-success">نشطة ومطبقة</span>
                            ) : (
                              <span className="badge badge-accent">معطلة مؤقتًا</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditRule(rule)}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                                title="تعديل القاعدة"
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
                                title="حذف القاعدة"
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
        title={editingRule ? 'تعديل قاعدة الحوافز' : 'إضافة قاعدة حوافز جديدة'}
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
              إلغاء
            </button>
            <button type="submit" form="incentive-rule-form" className="btn btn-primary" disabled={isSavingRule}>
              {isSavingRule ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingRule ? 'حفظ التعديلات' : 'إنشاء القاعدة'}</span>
            </button>
          </div>
        }
      >
        <form id="incentive-rule-form" onSubmit={handleSaveRule}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <span>اسم القاعدة</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: حافز إنجاز صب الخرسانة 120%"
                value={ruleFormData.name}
                onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>نوع الحافز</span>
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="input-field"
                value={ruleFormData.type}
                onChange={(e) => setRuleFormData({ ...ruleFormData, type: e.target.value })}
              >
                <option value="production_bonus">حافز تجاوز الإنتاجية (Production Bonus)</option>
                <option value="quality_bonus">مكافأة جودة وأداء (Quality Bonus)</option>
                <option value="attendance_bonus">حافز انتظام الحضور (Attendance Bonus)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>الحد الأدنى المستهدف (%)</span>
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
                  <span>مبلغ المكافأة (SAR)</span>
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
                تفعيل القاعدة في محرك الاحتساب التلقائي
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE RULE MODAL */}
      <Modal
        isOpen={!!deletingRule}
        onClose={() => setDeletingRule(null)}
        title="تأكيد حذف قاعدة الحوافز"
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
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDeleteRule}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isSavingRule}
            >
              {isSavingRule ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>تأكيد الحذف</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          هل أنت متأكد من رغبتك في حذف القاعدة <strong style={{ color: '#ffffff' }}>"{deletingRule?.name}"</strong>؟
        </p>
      </Modal>
    </div>
  );
};
