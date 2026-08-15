import React, { useEffect, useState, useCallback } from 'react';
import { boqApi } from '../../api/boq.api';
import type { BoqItemProgress } from '../../api/boq.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import {
  FileSpreadsheet,
  TrendingUp,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PieChart,
} from 'lucide-react';

export const BoqProgressPage: React.FC = () => {
  const [boqItems, setBoqItems] = useState<BoqItemProgress[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState('');

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
      setError(err.message || 'فشل تحميل بيانات المقايسة');
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#10b981';
    if (percentage >= 70) return '#3b82f6';
    if (percentage >= 40) return '#f59e0b';
    return '#ef4444';
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
            <FileSpreadsheet size={28} color="#60a5fa" />
            <span>المقايسة وتقدم التنفيذ (BOQ Progress)</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            متابعة نسب الإنجاز التراكمية الحية لبنود المقايسة المحسوبة تلقائيًا من سجلات الإنتاج المعتمدة نهائيًا.
          </p>
        </div>
      </div>

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

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>إجمالي بنود المقايسة</span>
            <PieChart size={18} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{total} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>بند</span></div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>متوسط الإنجاز الكلي</span>
            <TrendingUp size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{overallProgress}%</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>مصدر الاحتساب</span>
            <CheckCircle2 size={18} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#60a5fa' }}>
            سجلات final_approved فقط
          </div>
        </div>
      </div>

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
          <label className="form-label">
            <Filter size={14} />
            <span>تصفية بحسب المشروع</span>
          </label>
          <select
            className="input-field"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كافة المشاريع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code || 'بدون كود'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BOQ Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>رقم البند / التوصيف</th>
                <th style={{ padding: '1rem' }}>المشروع</th>
                <th style={{ padding: '1rem' }}>الوحدة</th>
                <th style={{ padding: '1rem' }}>الكمية التعاقدية</th>
                <th style={{ padding: '1rem' }}>الكمية المنفذة</th>
                <th style={{ padding: '1rem' }}>الكمية المتبقية</th>
                <th style={{ padding: '1rem', minWidth: '180px' }}>نسبة الإنجاز</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري احتساب تقدم المقايسة...</p>
                  </td>
                </tr>
              ) : boqItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    لا توجد بنود مقايسة مسجلة لهذا الاختيار
                  </td>
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
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>
                          {item.itemNumber ? `${item.itemNumber} - ` : ''}
                          {item.workItemName || item.description || 'بند مقايسة'}
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
                        <span className="badge badge-secondary">{item.unitSymbol || item.unitName || 'وحدة'}</span>
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
          <span>إجمالي البنود: {total}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              السابق
            </button>
            <span style={{ padding: '0.35rem 0.5rem' }}>صفحة {page}</span>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              disabled={page * limit >= total}
              onClick={() => setPage(page + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
