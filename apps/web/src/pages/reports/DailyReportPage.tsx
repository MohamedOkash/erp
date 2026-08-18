import React, { useState, useEffect, useCallback } from 'react';
import { controlCardsApi } from '../../api/control-cards.api';
import type { DailyReportRow } from '../../api/control-cards.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { WheelDatePicker } from '../../components/WheelPicker';
import { useI18n } from '../../i18n/I18nContext';
import {
  FolderKanban,
  Calendar,
  Download,
  Loader2,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';

export const DailyReportPage: React.FC = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [reportRows, setReportRows] = useState<DailyReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.list();
      const projs = res.data || [];
      setProjects(projs);
      if (projs.length > 0 && !selectedProject) {
        setSelectedProject(projs[0].id);
      }
    } catch {
      // ignore
    }
  };

  const loadReport = useCallback(async () => {
    if (!selectedProject || !selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await controlCardsApi.getDailyReport(selectedProject, selectedDate);
      setReportRows(data);
    } catch (err: any) {
      setError(err?.message || t('auto.تعذر_تحميل_التقرير_اليومي_7b0f98'));
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedDate]);

  useEffect(() => {
    if (selectedProject && selectedDate) {
      loadReport();
    }
  }, [selectedProject, selectedDate, loadReport]);

  // Calculations for totals
  const totalActual = reportRows.reduce((acc, r) => acc + r.actualQuantity, 0);
  const totalWeighted = reportRows.reduce((acc, r) => acc + r.weightedDone, 0);
  const totalWorkers = reportRows.reduce((acc, r) => acc + r.workersCount, 0);
  const totalLaborCost = reportRows.reduce((acc, r) => acc + r.dailyLaborCost, 0);

  const exportCSV = () => {
    if (reportRows.length === 0) return;
    const headers = [
      t('auto.البند_59a3a2'),
      t('auto.الكود_59a408'),
      t('auto.المرحلة_7f2a5b'),
      t('auto.الوزن_7f0007'),
      t('auto.الوحدة_252118'),
      t('auto.الكمية_المنفذة_1fde49'),
      t('auto.المكافئ_الموزون_7380c3'),
      t('auto.عدد_العمال_3ed060'),
      t('auto.تكلفة_العمالة_SAR_4f7c09'),
      t('auto.الإنتاجية_القياسية_4a2268'),
      t('auto.نسبة_الإنجاز_2fcd0c'),
      t('auto.المشرف_25225a'),
      t('auto.الحالة_252d72'),
    ];

    const rows = reportRows.map((r) => [
      `"${r.workItemName}"`,
      `"${r.workItemCode || ''}"`,
      `"${r.stageName}"`,
      `${Math.round(r.stagePercentage * 100)}%`,
      `"${r.unit}"`,
      r.actualQuantity,
      r.weightedDone,
      r.workersCount,
      r.dailyLaborCost,
      r.standardTarget,
      `${r.productivityPct}%`,
      `"${r.supervisorName}"`,
      `"${r.status}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Daily_Control_Report_${selectedDate}_${selectedProject}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1440px', margin: '0 auto' }}>
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
            <Activity size={28} color="#34d399" />
            <span>{t('finance_reports.reports_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('nav.links.daily_report')}
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          disabled={reportRows.length === 0}
          className="btn btn-secondary"
          style={{ gap: '0.5rem' }}
        >
          <Download size={16} /> <span>{t('auto.تصدير_ملف_Excel_CSV_56fbb1')}</span>
        </button>
      </div>

      {/* Filter Selectors */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <FolderKanban size={14} /> <span>{t('auto.اختر_المشروع_4763b4')}</span>
          </label>
          <select
            className="input-field"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Calendar size={14} /> <span>{t('auto.تاريخ_العمل_اليومي_7d3f93')}</span>
          </label>
          <WheelDatePicker
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('auto.إجمالي_الكميات_المنفذة_7c07f3')}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>{totalActual.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('auto.المكافئ_الموزون_النهائي_40f0ef')}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{totalWeighted.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('auto.إجمالي_العمال_المشتركين_38c697')}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{totalWorkers} {t('auto.عامل_2ec042')}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('auto.تكلفة_عمالة_اليوم_78efd5')}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f472b6' }}>{totalLaborCost.toLocaleString()} {t('auto.ريال_2e8e0f')}</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto', color: '#34d399' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{t('auto.جاري_تجميع_بيانات_التقرير_اليو_2e6a05')}</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>{error}</div>
        ) : reportRows.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {t('auto.لا_توجد_سجلات_إنتاج_مسجلة_لهذا_3c129d')}{selectedDate}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', background: 'var(--bg-surface-elevated)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>{t('auto.البند_وكوده_372c75')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('auto.المرحلة_المنفذة_84025')}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.الكمية_المنفذة_1fde49')}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.المكافئ_الموزون_7380c3')}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.عدد_العمال_3ed060')}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.تكلفة_العمالة_20d3fe')}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.الإنتاجية_vs_القياسي_6f728f')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('auto.المشرف_25225a')}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.الحالة_252d72')}</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={row.recordId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                    <div>{row.workItemName}</div>
                    {row.workItemCode && (
                      <span style={{ fontSize: '0.7rem', color: '#93c5fd' }}>{row.workItemCode}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ color: 'var(--text-heading)' }}>{row.stageName}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {t('auto.وزن_2f2f91')}{Math.round(row.stagePercentage * 100)}%
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {row.actualQuantity} {row.unit}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#34d399' }}>
                    {row.weightedDone} {row.unit}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#fbbf24', fontWeight: 600 }}>
                    {row.workersCount}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                    {row.dailyLaborCost} {t('auto.ريال_2e8e0f')}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span
                      className={`badge ${
                        row.productivityPct >= 100
                          ? 'badge-success'
                          : row.productivityPct >= 80
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                      style={{ fontWeight: 700 }}
                    >
                      {row.productivityPct}%
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    {row.supervisorName}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: 'var(--bg-surface-elevated)',
                  borderTop: '2px solid var(--border-subtle)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                <td colSpan={2} style={{ padding: '1rem', color: '#93c5fd' }}>
                  {t('auto.الإجمالي_لليوم_6fc91e')}</td>
                <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-heading)' }}>
                  {totalActual.toLocaleString()}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#34d399' }}>
                  {totalWeighted.toLocaleString()}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#fbbf24' }}>
                  {totalWorkers} {t('auto.عامل_2ec042')}</td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#f472b6' }}>
                  {totalLaborCost.toLocaleString()} {t('auto.ريال_2e8e0f')}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};
