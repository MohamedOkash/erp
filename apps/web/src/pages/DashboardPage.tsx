import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
      label: 'متوسط إنجاز بنود التحكم',
      value: `${avgProgress}%`,
      helper: `هامش ربحي: ${Math.round(totalMarginSum).toLocaleString()} SAR`,
      icon: <TrendingUp size={22} />,
      color: '#34d399',
    },
    {
      label: 'المشاريع الجارية في التنفيذ',
      value: projects.length,
      helper: 'مواقع عمل نشطة ميدانياً',
      icon: <Building2 size={22} />,
      color: '#60a5fa',
    },
    {
      label: 'تنبيهات وانحرافات الموقع',
      value: unreadAlertsCount,
      helper: unreadAlertsCount > 0 ? 'تتطلب مراجعة فورية' : 'كافة المؤشرات طبيعية',
      icon: <AlertTriangle size={22} />,
      color: unreadAlertsCount > 0 ? '#f87171' : '#34d399',
    },
    {
      label: 'طلبات نقل العمالة المعلقة',
      value: pendingTransfersCount,
      helper: 'بانتظار موافقة الإدارة',
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
              <span>المنظومة متصلة بالخادم الحي (Live API)</span>
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#ffffff' }}>
            مرحباً بك، {user?.fullName || user?.username} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            لوحة الإدارة والمتابعة التنفيذية — شركة ساكوديكو للمقاولات العامة (SACODECO)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/production" className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>تسجيل إنتاجية اليوم</span>
          </Link>
          <Link to="/control-cards" className="btn btn-secondary" style={{ gap: '0.4rem' }}>
            <Layers size={16} />
            <span>بطاقات التحكم</span>
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
                  <span>مشاريع التنفيذ الميدانية الجارية</span>
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  متابعة حالة التقدم الفعلي والميزانيات التقديرية
                </p>
              </div>

              <Link to="/projects" className="btn btn-secondary" style={{ fontSize: '0.8rem', gap: '0.3rem' }}>
                <span>عرض الكل</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {isLoading && projects.length === 0 ? (
              <CardsSkeleton count={2} />
            ) : projects.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                لا توجد مشاريع جارية حالياً
              </p>
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
                          {proj.status === 'in_progress' ? 'قيد التنفيذ' : proj.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        الفرع: {proj.branchName || 'المركز الرئيسي'} {proj.code ? `• كود: ${proj.code}` : ''}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>قيمة العقد:</span>
                        <strong style={{ color: '#34d399' }}>
                          {proj.contractValue ? `${Number(proj.contractValue).toLocaleString()} SAR` : 'غير محددة'}
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
                  <span>تحليل ربحية بنود بطاقات التحكم (Control Cards)</span>
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  سعر العقد، تكلفة الوحدة وهامش الربحية التقديري
                </p>
              </div>

              <Link to="/control-cards" className="btn btn-secondary" style={{ fontSize: '0.8rem', gap: '0.3rem' }}>
                <span>كافة البطاقات</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {isLoading && controlCards.length === 0 ? (
              <TableSkeleton rows={4} columns={5} />
            ) : controlCards.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                لا توجد بنود بطاقات تحكم معرفة
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.85rem' }}>اسم البند</th>
                      <th style={{ padding: '0.85rem' }}>التصنيف</th>
                      <th style={{ padding: '0.85rem' }}>سعر العقد (SAR)</th>
                      <th style={{ padding: '0.85rem' }}>هامش الوحدة (SAR)</th>
                      <th style={{ padding: '0.85rem' }}>نسبة الإنجاز</th>
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
                <span>تنبيهات الموقع النشطة</span>
              </h3>
              <Link to="/alerts" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                <span>عرض الكل ({unreadAlertsCount})</span>
              </Link>
            </div>

            {unreadAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '0.5rem', color: '#34d399', fontSize: '1.5rem' }}>✓</div>
                لا توجد تنبيهات غير مقروءة حالياً
              </div>
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
                        {alt.type === 'alert' ? 'تنبيه عاجل' : alt.type === 'warning' ? 'تحذير' : 'إشعار'}
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
                <span>أحدث مخرجات الإنتاجية</span>
              </h3>
              <Link to="/production" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                <span>السجلات</span>
              </Link>
            </div>

            {recentProduction.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                لا توجد سجلات إنتاجية حديثة
              </p>
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
                      <strong style={{ color: '#ffffff' }}>{rec.workItemName || 'بند عمل'}</strong>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>
                        {rec.actualQuantity || 0} وحدة
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>المشروع: {rec.projectName || 'عام'}</span>
                      <span>{rec.date ? rec.date.split('T')[0] : 'اليوم'}</span>
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
              <span>الوصول السريع للمنظومة</span>
            </h3>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <Link
                to="/incentives"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}
              >
                <Award size={16} color="#f59e0b" />
                <span>محرك احتساب وصرف الحوافز</span>
              </Link>

              <Link
                to="/documents"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}
              >
                <Upload size={16} color="#60a5fa" />
                <span>أرشيف المخططات والمستندات</span>
              </Link>

              <Link
                to="/reports"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}
              >
                <DollarSign size={16} color="#34d399" />
                <span>التقارير المحفوظة والمخصصة</span>
              </Link>

              <Link
                to="/settings"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.85rem' }}
              >
                <Shield size={16} color="#a78bfa" />
                <span>إعدادات النظام وأجور العمالة</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
