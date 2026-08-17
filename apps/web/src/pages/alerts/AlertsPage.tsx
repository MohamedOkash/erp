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
      setError(err.message || 'فشل تحميل بيانات التنبيهات');
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
      setError(err.message || 'فشل تشغيل محرك التقييم');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setSuccessMsg('تم تحديد كافة الإشعارات كمقروءة');
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تحديث حالة الإشعارات');
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
      setSuccessMsg('تم إنشاء قاعدة التنبيه بنجاح');
      setShowCreateModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء قاعدة التنبيه');
    } finally {
      setIsSaving(false);
    }
  };

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'low_productivity':
        return <span className="badge badge-accent">انخفاض الإنتاجية</span>;
      case 'iqama_expiry':
        return <span className="badge badge-primary">اقتراب انتهاء الإقامة/الهوية</span>;
      case 'attendance_irregularity':
        return <span className="badge badge-secondary">غياب غير مبرر</span>;
      case 'cost_overrun':
        return <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>تجاوز الميزانية</span>;
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
            <span>تشغيل الفحص الآن</span>
          </button>

          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <Plus size={18} />
            <span>إضافة قاعدة تنبيه</span>
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
              <span>قواعد التنبيه النشطة ({rules.length})</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isLoading ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
              </div>
            ) : rules.length === 0 ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                لا توجد قواعد تنبيه مسجلة
              </div>
            ) : (
              rules.map((r) => (
                <div key={r.id} className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1rem' }}>{r.name}</h4>
                    {r.isActive ? (
                      <span className="badge badge-success">نشطة</span>
                    ) : (
                      <span className="badge badge-secondary">معطلة</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {getRuleTypeBadge(r.ruleType)}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      الحد الحرج: <strong style={{ color: '#fff' }}>{r.thresholdValue} {r.thresholdUnit || ''}</strong>
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
              <h3 style={{ fontSize: '1.2rem' }}>مركز الإشعارات</h3>
              {unreadCount > 0 && (
                <span className="badge badge-accent" style={{ background: '#ef4444', color: '#fff' }}>
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.3rem' }}
              >
                <Check size={12} />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.length === 0 ? (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                لا توجد إشعارات حالية
              </div>
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
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>{n.title}</div>
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
        title="إنشاء قاعدة تنبيه جديدة"
        icon={<BellRing size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
              إلغاء
            </button>
            <button type="submit" form="create-alert-rule-form" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>إنشاء القاعدة</span>
            </button>
          </div>
        }
      >
        <form id="create-alert-rule-form" onSubmit={handleCreateRule}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">اسم القاعدة *</label>
              <input
                type="text"
                required
                placeholder="مثال: تنبيه انخفاض الإنتاجية عن 75%"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">نوع القاعدة *</label>
              <select
                className="input-field"
                value={formData.ruleType}
                onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
              >
                <option value="low_productivity">انخفاض الإنتاجية (Low Productivity)</option>
                <option value="iqama_expiry">اقتراب انتهاء الإقامة/الهوية (Iqama Expiry)</option>
                <option value="attendance_irregularity">غياب غير مبرر (Attendance Irregularity)</option>
                <option value="cost_overrun">تجاوز ميزانية التكاليف (Cost Overrun)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">قيمة الحد الحرج (Threshold) *</label>
                <input
                  type="number"
                  required
                  className="input-field"
                  value={formData.thresholdValue}
                  onChange={(e) => setFormData({ ...formData, thresholdValue: Number(e.target.value) })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">الوحدة</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="%, يوم, SAR"
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
