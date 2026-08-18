import React, { useEffect, useState, useCallback } from 'react';
import { boqApi } from '../../api/boq.api';
import type { BoqItemProgress } from '../../api/boq.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { StatsStrip } from '../../components/StatsStrip';
import { TableSkeleton } from '../../components/skeletons';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  FileSpreadsheet,
  TrendingUp,
  Filter,
  CheckCircle2,
  AlertCircle,
  Layers,
  CheckCheck,
  Lock,
} from 'lucide-react';

export const BoqProgressPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [boqItems, setBoqItems] = useState<BoqItemProgress[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState('');

  const isSingleScoped = Boolean(user?.scopes && user.scopes.length === 1);

  // Set default project if single scoped
  useEffect(() => {
    if (user?.scopes && user.scopes.length === 1 && !selectedProject) {
      setSelectedProject(user.scopes[0].projectId);
    }
  }, [user?.scopes]);

  // Scoped projects list
  const scopedProjects = React.useMemo(() => {
    let list = projects;
    if (user?.scopes && user.scopes.length > 0) {
      const allowedIds = new Set(user.scopes.map((s) => s.projectId));
      list = list.filter((p) => allowedIds.has(p.id));
    }
    return list;
  }, [projects, user?.scopes]);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getProjects({ limit: 100 });
      setProjects(res.data);
    } catch {
      // ignore
    }
  };

  const loadBoqProgress = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await boqApi.getBoqProgress({
        page,
        limit,
        projectId: selectedProject || undefined,
      });
      setBoqItems(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_بيانات_المقايسة_5d08a5'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedProject]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadBoqProgress();
  }, [loadBoqProgress]);

  // Quick statistics calculation
  const totalExecuted = boqItems.reduce((acc, item) => acc + (Number(item.executedQuantity) || 0), 0);
  const totalPlanned = boqItems.reduce((acc, item) => acc + (Number(item.totalQuantity) || 0), 0);
  const overallProgress = totalPlanned > 0 ? ((totalExecuted / totalPlanned) * 100).toFixed(1) : '0';
  const completedItemsCount = boqItems.filter((item) => Number(item.progressPercentage) >= 100).length;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#10b981';
    if (percentage >= 70) return '#3b82f6';
    if (percentage >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const statsItems = [
    {
      label: t('auto.إجمالي_بنود_المقايسة_7aa6d5'),
      value: total,
      helper: `${boqItems.length} بند معروض حالياً`,
      icon: <Layers size={22} />,
      color: '#60a5fa',
    },
    {
      label: t('auto.متوسط_الإنجاز_الكلي_4b83b1'),
      value: `${overallProgress}%`,
      helper: t('auto.محسوبة_تراكميا_من_الإنتاج_الفع_3e7e1b'),
      icon: <TrendingUp size={22} />,
      color: '#34d399',
    },
    {
      label: t('auto.بنود_مكتملة_بالكامل_100_7c9359'),
      value: completedItemsCount,
      helper: t('auto.وصلت_للكمية_التعاقدية_7f77a4'),
      icon: <CheckCheck size={22} />,
      color: '#10b981',
    },
    {
      label: t('auto.مصدر_الاحتساب_المعتمد_59aaeb'),
      value: t('auto.سجلات_معتمدة_6f211e'),
      helper: t('auto.final_approved_حصرا_4201a3'),
      icon: <CheckCircle2 size={22} />,
      color: '#a78bfa',
    },
  ];

  const startRecord = boqItems.length === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

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
            <FileSpreadsheet size={26} color="#60a5fa" />
            <span>{t('operations.boq_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {t('nav.links.boq')}
          </p>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <StatsStrip items={statsItems} isLoading={isLoading && boqItems.length === 0} />

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

      {/* Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0, flex: 1, maxWidth: '360px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} />
              <span>{t('auto.تصفية_بحسب_المشروع_1c083e')}</span>
            </div>
            {isSingleScoped && (
              <span style={{ fontSize: '10px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Lock size={11} /> {t('auto.نطاق_مخصص_1b6320')}</span>
            )}
          </label>
          <select
            className="input-field"
            value={selectedProject}
            disabled={isSingleScoped}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
            style={isSingleScoped ? { opacity: 0.85, cursor: 'not-allowed', borderColor: 'rgba(139, 92, 246, 0.4)' } : {}}
          >
            {!isSingleScoped && <option value="">{t('auto.كافة_المشاريع_65e01c')}</option>}
            {scopedProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code || t('auto.بدون_كود_519c6b')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BOQ Table */}
      {isLoading && boqItems.length === 0 ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <div
          className={`glass-card table-loading-overlay ${isLoading ? 'loading-soft' : ''}`}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem' }}>{t('auto.رقم_البند_التوصيف_ee0761')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.المشروع_7f28ee')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الوحدة_252118')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الكمية_التعاقدية_4d4f84')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الكمية_المنفذة_1fde49')}</th>
                  <th style={{ padding: '1rem' }}>{t('auto.الكمية_المتبقية_227f6f')}</th>
                  <th style={{ padding: '1rem', minWidth: '180px' }}>{t('auto.نسبة_الإنجاز_3259d2')}</th>
                </tr>
              </thead>
              <tbody>
                {boqItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {t('auto.لا_توجد_بنود_مقايسة_مسجلة_لهذا_7e8325')}</td>
                  </tr>
                ) : (
                  boqItems.map((item) => {
                    const pct = Number(item.progressPercentage) || 0;
                    const color = getProgressColor(pct);

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background var(--transition-fast)',
                        }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                            {item.itemNumber ? `${item.itemNumber} - ` : ''}
                            {item.workItemName || item.description || t('auto.بند_مقايسة_d822ee')}
                          </div>
                          {item.description && item.workItemName && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                          <div>{item.projectName || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.branchName}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="badge badge-secondary">{item.unitSymbol || item.unitName || t('auto.وحدة_2f2e97')}</span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>
                          {Number(item.totalQuantity).toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 700, color: '#34d399' }}>
                          {Number(item.executedQuantity).toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem', color: Number(item.remainingQuantity) > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
                          {Number(item.remainingQuantity).toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '8px',
                                background: 'rgba(148, 163, 184, 0.15)',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  height: '100%',
                                  background: color,
                                  borderRadius: '9999px',
                                  transition: 'width 0.5s ease',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '42px', color }}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
              {t('auto.عرض_18221e')}{startRecord}–{endRecord} {t('auto.من_إجمالي_4d6b95')}{total} {t('auto.بند_مقايسة_d822ee')}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('auto.السابق_252abb')}</button>
              <span style={{ padding: '0.35rem 0.5rem' }}>{t('auto.صفحة_2ea914')}{page}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
              >
                {t('auto.التالي_252ecf')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
