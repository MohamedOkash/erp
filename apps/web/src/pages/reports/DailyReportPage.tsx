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
      setError(err?.message || 'تعذر تحميل التقرير اليومي');
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
      'البند',
      'الكود',
      'المرحلة',
      'الوزن %',
      'الوحدة',
      'الكمية المنفذة',
      'المكافئ الموزون',
      'عدد العمال',
      'تكلفة العمالة (SAR)',
      'الإنتاجية القياسية',
      'نسبة الإنجاز %',
      'المشرف',
      'الحالة',
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
          <Download size={16} /> <span>تصدير ملف Excel / CSV</span>
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
            <FolderKanban size={14} /> <span>اختر المشروع</span>
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
            <Calendar size={14} /> <span>تاريخ العمل اليومي</span>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>إجمالي الكميات المنفذة</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>{totalActual.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>المكافئ الموزون النهائي</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{totalWeighted.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>إجمالي العمال المشتركين</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{totalWorkers} عامل</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>تكلفة عمالة اليوم</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f472b6' }}>{totalLaborCost.toLocaleString()} ريال</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto', color: '#34d399' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>جاري تجميع بيانات التقرير اليومي...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>{error}</div>
        ) : reportRows.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            لا توجد سجلات إنتاج مسجلة لهذا المشروع في تاريخ {selectedDate}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', background: 'rgba(15, 23, 42, 0.6)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>البند وكوده</th>
                <th style={{ padding: '0.75rem 1rem' }}>المرحلة المنفذة</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>الكمية المنفذة</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>المكافئ الموزون</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>عدد العمال</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>تكلفة العمالة</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>الإنتاجية vs القياسي</th>
                <th style={{ padding: '0.75rem 1rem' }}>المشرف</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={row.recordId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#ffffff' }}>
                    <div>{row.workItemName}</div>
                    {row.workItemCode && (
                      <span style={{ fontSize: '0.7rem', color: '#93c5fd' }}>{row.workItemCode}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ color: '#ffffff' }}>{row.stageName}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      وزن: {Math.round(row.stagePercentage * 100)}%
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#ffffff' }}>
                    {row.actualQuantity} {row.unit}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#34d399' }}>
                    {row.weightedDone} {row.unit}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#fbbf24', fontWeight: 600 }}>
                    {row.workersCount}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                    {row.dailyLaborCost} ريال
                  </td>
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
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderTop: '2px solid var(--border-subtle)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                <td colSpan={2} style={{ padding: '1rem', color: '#93c5fd' }}>
                  الإجمالي لليوم:
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#ffffff' }}>
                  {totalActual.toLocaleString()}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#34d399' }}>
                  {totalWeighted.toLocaleString()}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#fbbf24' }}>
                  {totalWorkers} عامل
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#f472b6' }}>
                  {totalLaborCost.toLocaleString()} ريال
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};
