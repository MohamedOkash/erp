import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { projectsApi, type Project } from '../api/projects.api';
import { controlCardsApi, type ControlCardSummary } from '../api/control-cards.api';
import { alertsApi, type NotificationItem } from '../api/alerts.api';
import { transfersApi } from '../api/transfers.api';
import { productionApi, type ProductionRecord } from '../api/production.api';
import { StatsStrip } from '../components/StatsStrip';
import { CardsSkeleton, TableSkeleton } from '../components/skeletons';
import {
  TrendingUp,
  Building2,
  AlertTriangle,
  ArrowRightLeft,
  DollarSign,
  Plus,
  ArrowUpRight,
  Shield,
  Clock,
  Sparkles,
  Layers,
  Award,
  Upload,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const [projects, setProjects] = useState<Project[]>([]);
  const [controlCards, setControlCards] = useState<ControlCardSummary[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState<NotificationItem[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);
  const [recentProduction, setRecentProduction] = useState<ProductionRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        projectsRes,
        cardsRes,
        alertsRes,
        transfersRes,
        prodRes,
      ] = await Promise.allSettled([
        projectsApi.getProjects({ limit: 6, status: 'in_progress' }),
        controlCardsApi.list(),
        alertsApi.getNotifications({ isRead: false, limit: 5 }),
        transfersApi.list({ status: 'pending', limit: 1 }),
        productionApi.list(),
      ]);

      if (projectsRes.status === 'fulfilled') {
        setProjects(projectsRes.value.data || []);
      }
      if (cardsRes.status === 'fulfilled') {
        setControlCards(cardsRes.value || []);
      }
      if (alertsRes.status === 'fulfilled') {
        setUnreadAlerts(alertsRes.value.data || []);
        setUnreadAlertsCount(alertsRes.value.unreadCount || alertsRes.value.total || 0);
      }
      if (transfersRes.status === 'fulfilled') {
        setPendingTransfersCount(transfersRes.value.total || 0);
      }
      if (prodRes.status === 'fulfilled') {
        setRecentProduction(prodRes.value.data || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Compute key KPIs
  const totalMarginSum = controlCards.reduce(
    (acc, c) => acc + (Number(c.marginPerUnit || 0) * (Number(c.progressPct || 0) / 100) * (Number(c.contractPrice || 0) > 0 ? 10 : 1)),
    0,
  );

  const avgProgress =
    controlCards.length > 0
      ? Math.round(controlCards.reduce((acc, c) => acc + Number(c.progressPct || 0), 0) / controlCards.length)
      : 0;

  const statsItems = [
    {
      label: t('dashboard.avg_progress'),
      value: `${avgProgress}%`,
      helper: `${t('dashboard.profit_margin')}: ${Math.round(totalMarginSum).toLocaleString()} SAR`,
      icon: <TrendingUp size={22} />,
      color: '#34d399',
    },
    {
      label: t('dashboard.total_projects'),
      value: projects.length,
      helper: `${projects.length} ${t('common.active')}`,
      icon: <Building2 size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('dashboard.unread_alerts'),
      value: unreadAlertsCount,
      helper: unreadAlertsCount > 0 ? t('common.required') : t('common.all'),
      icon: <AlertTriangle size={22} />,
      color: unreadAlertsCount > 0 ? '#f87171' : '#34d399',
    },
    {
      label: t('dashboard.pending_transfers'),
      value: pendingTransfersCount,
      helper: `${pendingTransfersCount} ${t('common.status')}`,
      icon: <ArrowRightLeft size={22} />,
      color: '#f59e0b',
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2.5rem' }}>
      {/* Welcome Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.75rem', gap: '0.3rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
              <span>Live API</span>
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-heading)' }}>
            {t('dashboard.welcome', { name: user?.fullName || user?.username || '' })} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {t('dashboard.overview_subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/production" className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>{t('dashboard.new_production')}</span>
          </Link>
          <Link to="/control-cards" className="btn btn-secondary" style={{ gap: '0.4rem' }}>
            <Layers size={16} />
            <span>{t('dashboard.open_control_card')}</span>
          </Link>
        </div>
      </div>

      {/* Real KPI Stats Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading} />

      {/* Main Grid: Left (Projects & Control Cards) + Right (Alerts & Activity) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column (2fr if wide screen) */}
        <div style={{ display: 'grid', gap: '1.5rem', gridColumn: 'span 2' }}>
          {/* Active Projects Cards */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={20} color="#60a5fa" />
                  <span>{t('auto.مشاريع_التنفيذ_الميدانية_الجار_137bca')}</span>
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t('auto.متابعة_حالة_التقدم_الفعلي_والم_16f675')}</p>
              </div>

              <Link to="/projects" className="btn btn-secondary" style={{ fontSize: '0.8rem', gap: '0.3rem' }}>
                <span>{t('auto.عرض_الكل_747a4d')}</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {isLoading && projects.length === 0 ? (
              <CardsSkeleton count={2} />
            ) : projects.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                {t('auto.لا_توجد_مشاريع_جارية_حاليا_7c4559')}</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'border-color var(--transition-fast)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>
                          {proj.name}
                        </div>
                        <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                          {proj.status === 'in_progress' ? t('auto.قيد_التنفيذ_63bb0d') : proj.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {t('auto.الفرع_25243c')}{proj.branchName || t('auto.المركز_الرئيسي_2b1b66')} {proj.code ? `• كود: ${proj.code}` : ''}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('auto.قيمة_العقد_7d12b2')}</span>
                        <strong style={{ color: '#34d399' }}>
                          {proj.contractValue ? `${Number(proj.contractValue).toLocaleString()} SAR` : t('auto.غير_محددة_6870a9')}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Control Cards Margin & Performance */}
          <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={20} color="#34d399" />
                  <span>{t('auto.تحليل_ربحية_بنود_بطاقات_التحكم_185f9f')}</span>
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t('auto.سعر_العقد_تكلفة_الوحدة_وهامش_ا_3822a4')}</p>
              </div>

              <Link to="/control-cards" className="btn btn-secondary" style={{ fontSize: '0.8rem', gap: '0.3rem' }}>
                <span>{t('auto.كافة_البطاقات_37b009')}</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {isLoading && controlCards.length === 0 ? (
              <TableSkeleton rows={4} columns={5} />
            ) : controlCards.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                {t('auto.لا_توجد_بنود_بطاقات_تحكم_معرفة_6317c4')}</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.85rem' }}>{t('auto.اسم_البند_61a04e')}</th>
                      <th style={{ padding: '0.85rem' }}>{t('auto.التصنيف_7f5b59')}</th>
                      <th style={{ padding: '0.85rem' }}>{t('auto.سعر_العقد_SAR_1f80cf')}</th>
                      <th style={{ padding: '0.85rem' }}>{t('auto.هامش_الوحدة_SAR_2af2bb')}</th>
                      <th style={{ padding: '0.85rem' }}>{t('auto.نسبة_الإنجاز_3259d2')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {controlCards.slice(0, 5).map((card) => (
                      <tr key={card.workItemId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                          {card.name}
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <span className="badge badge-secondary">{card.category || card.unit}</span>
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 600, color: '#60a5fa' }}>
                          {Number(card.contractPrice || 0).toLocaleString()} SAR
                        </td>
                        <td
                          style={{
                            padding: '0.85rem',
                            fontWeight: 700,
                            color: Number(card.marginPerUnit || 0) >= 0 ? '#34d399' : '#f87171',
                          }}
                        >
                          {Number(card.marginPerUnit || 0).toLocaleString()} SAR
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(0, Number(card.progressPct || 0)))}%`,
                                  height: '100%',
                                  background: '#3b82f6',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '32px' }}>
                              {card.progressPct || 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1fr) */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Unread Critical Alerts */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <span>{t('auto.تنبيهات_الموقع_النشطة_5c2667')}</span>
              </h3>
              <Link to="/alerts" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                <span>{t('auto.عرض_الكل_3f1b81')}{unreadAlertsCount})</span>
              </Link>
            </div>

            {unreadAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '0.5rem', color: '#34d399', fontSize: '1.5rem' }}>✓</div>
                {t('auto.لا_توجد_تنبيهات_غير_مقروءة_حال_ce9bd0')}</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {unreadAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ color: '#ffffff' }}>{alt.title}</strong>
                      <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                        {alt.type === 'alert' ? t('auto.تنبيه_عاجل_20e4b3') : alt.type === 'warning' ? t('auto.تحذير_59c393') : t('auto.إشعار_598069')}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {alt.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Daily Production */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="#60a5fa" />
                <span>{t('auto.أحدث_مخرجات_الإنتاجية_174e25')}</span>
              </h3>
              <Link to="/production" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                <span>{t('auto.السجلات_7fd60a')}</span>
              </Link>
            </div>

            {recentProduction.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                {t('auto.لا_توجد_سجلات_إنتاجية_حديثة_618d7a')}</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {recentProduction.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <strong style={{ color: '#ffffff' }}>{rec.workItemName || t('auto.بند_عمل_4ad23b')}</strong>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>
                        {rec.actualQuantity || 0} {t('auto.وحدة_2f2e97')}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('auto.المشروع_65f4ee')}{rec.projectName || t('auto.عام_1820f7')}</span>
                      <span>{rec.date ? rec.date.split('T')[0] : t('auto.اليوم_59a422')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Hub Shortcuts */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#f59e0b" />
              <span>{t('auto.الوصول_السريع_للمنظومة_c38ea1')}</span>
            </h3>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <Link
                to="/incentives"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}
              >
                <Award size={16} color="#f59e0b" />
                <span>{t('auto.محرك_احتساب_وصرف_الحوافز_62f97f')}</span>
              </Link>

              <Link
                to="/documents"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}
              >
                <Upload size={16} color="#60a5fa" />
                <span>{t('auto.أرشيف_المخططات_والمستندات_367338')}</span>
              </Link>

              <Link
                to="/reports"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}
              >
                <DollarSign size={16} color="#34d399" />
                <span>{t('auto.التقارير_المحفوظة_والمخصصة_45943d')}</span>
              </Link>

              <Link
                to="/settings"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}
              >
                <Shield size={16} color="#a78bfa" />
                <span>{t('auto.إعدادات_النظام_وأجور_العمالة_4a5d8b')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
