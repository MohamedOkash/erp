import React, { useEffect, useState, useCallback } from 'react';
import { alertsApi } from '../../api/alerts.api';
import type { AlertRule, NotificationItem } from '../../api/alerts.api';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/I18nContext';
import {
  BellRing,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Clock,
  Check,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { t } = useI18n();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ruleType: 'low_productivity',
    thresholdValue: 70,
    thresholdUnit: '%',
    isActive: true,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rulesRes, notifRes] = await Promise.all([
        alertsApi.getAlertRules(),
        alertsApi.getNotifications({ limit: 50 }),
      ]);
      setRules(rulesRes.data);
      setNotifications(notifRes.data);
      setUnreadCount(notifRes.unreadCount);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_بيانات_التنبيهات_495a5b'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    try {
      const res = await alertsApi.evaluateRules();
      setSuccessMsg(`تم فحص القواعد بنجاح: تم تقييم ${res.evaluatedRulesCount} قاعدة وتوليد ${res.triggeredAlertsCount} إشعار جديد.`);
      loadData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تشغيل_محرك_التقييم_497a49'));
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setSuccessMsg(t('auto.تم_تحديد_كافة_الإشعارات_كمقروء_4cf5e1'));
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحديث_حالة_الإشعارات_489733'));
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await alertsApi.markRead(id);
      loadData();
    } catch {
      // ignore
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await alertsApi.createAlertRule({
        ...formData,
        thresholdValue: Number(formData.thresholdValue),
      });
      setSuccessMsg(t('auto.تم_إنشاء_قاعدة_التنبيه_بنجاح_41bf65'));
      setShowCreateModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_إنشاء_قاعدة_التنبيه_2747dd'));
    } finally {
      setIsSaving(false);
    }
  };

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'low_productivity':
        return <span className="badge badge-accent">{t('auto.انخفاض_الإنتاجية_4ab50f')}</span>;
      case 'iqama_expiry':
        return <span className="badge badge-primary">{t('auto.اقتراب_انتهاء_الإقامة_الهوية_6fc450')}</span>;
      case 'attendance_irregularity':
        return <span className="badge badge-secondary">{t('auto.غياب_غير_مبرر_c2e34d')}</span>;
      case 'cost_overrun':
        return <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>{t('auto.تجاوز_الميزانية_6a347c')}</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BellRing size={28} color="#60a5fa" />
            <span>{t('finance_reports.alerts_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('nav.links.alerts')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleEvaluate}
            className="btn btn-secondary"
            style={{ gap: '0.5rem', borderColor: 'rgba(59, 130, 246, 0.4)' }}
            disabled={isEvaluating}
          >
            {isEvaluating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} color="#60a5fa" />}
            <span>{t('auto.تشغيل_الفحص_الآن_1748ad')}</span>
          </button>

          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <Plus size={18} />
            <span>{t('auto.إضافة_قاعدة_تنبيه_54eb30')}</span>
          </button>
        </div>
      </div>

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

      {/* Layout Grid: Rules on Right, Notifications on Left */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Active Alert Rules */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} color="#60a5fa" />
              <span>{t('auto.قواعد_التنبيه_النشطة_1e6524')}{rules.length})</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isLoading ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
              </div>
            ) : rules.length === 0 ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {t('auto.لا_توجد_قواعد_تنبيه_مسجلة_1cdc82')}</div>
            ) : (
              rules.map((r) => (
                <div key={r.id} className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1rem' }}>{r.name}</h4>
                    {r.isActive ? (
                      <span className="badge badge-success">{t('auto.نشطة_2f21c0')}</span>
                    ) : (
                      <span className="badge badge-secondary">{t('auto.معطلة_5b459b')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {getRuleTypeBadge(r.ruleType)}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {t('auto.الحد_الحرج_22d09a')}<strong style={{ color: 'var(--text-heading)' }}>{r.thresholdValue} {r.thresholdUnit || ''}</strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications Center */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>{t('auto.مركز_الإشعارات_e975eb')}</h3>
              {unreadCount > 0 && (
                <span className="badge badge-accent" style={{ background: '#ef4444', color: '#fff' }}>
                  {unreadCount} {t('auto.غير_مقروء_686712')}</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem' }}
              >
                <Check size={12} />
                <span>{t('auto.تحديد_الكل_كمقروء_2e0635')}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.length === 0 ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {t('auto.لا_توجد_إشعارات_حالية_6feaa4')}</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    background: n.isRead ? 'rgba(15, 23, 42, 0.4)' : 'rgba(37, 99, 235, 0.12)',
                    borderColor: n.isRead ? 'var(--border-subtle)' : 'rgba(59, 130, 246, 0.3)',
                    cursor: n.isRead ? 'default' : 'pointer',
                  }}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{n.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      <Clock size={12} />
                      <span>{new Date(n.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Rule Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('auto.إنشاء_قاعدة_تنبيه_جديدة_462650')}
        icon={<BellRing size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
              {t('auto.إلغاء_5987b3')}</button>
            <button type="submit" form="create-alert-rule-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.إنشاء_القاعدة_71c0de')}</span>
            </button>
          </div>
        }
      >
        <form id="create-alert-rule-form" onSubmit={handleCreateRule}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.اسم_القاعدة_143e9f')}</label>
              <input
                type="text"
                required
                placeholder={t('auto.مثال_تنبيه_انخفاض_الإنتاجية_عن_78de1a')}
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.نوع_القاعدة_630966')}</label>
              <select
                className="input-field"
                value={formData.ruleType}
                onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
              >
                <option value="low_productivity">{t('auto.انخفاض_الإنتاجية_Low_Productiv_196d61')}</option>
                <option value="iqama_expiry">{t('auto.اقتراب_انتهاء_الإقامة_الهوية_I_32238b')}</option>
                <option value="attendance_irregularity">{t('auto.غياب_غير_مبرر_Attendance_Irreg_194b55')}</option>
                <option value="cost_overrun">{t('auto.تجاوز_ميزانية_التكاليف_Cost_Ov_4ac508')}</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('auto.قيمة_الحد_الحرج_Threshold_3ce2ca')}</label>
                <input
                  type="number"
                  required
                  className="input-field"
                  value={formData.thresholdValue}
                  onChange={(e) => setFormData({ ...formData, thresholdValue: Number(e.target.value) })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('auto.الوحدة_252118')}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('auto.يوم_SAR_53d17c')}
                  value={formData.thresholdUnit}
                  onChange={(e) => setFormData({ ...formData, thresholdUnit: e.target.value })}
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
