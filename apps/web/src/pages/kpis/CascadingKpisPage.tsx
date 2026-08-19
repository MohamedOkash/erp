import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { kpisApi } from '../../api/kpis.api';
import type { CascadeKpiResponse, EvaluatedWorkerKpi } from '../../api/kpis.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { StatsStrip } from '../../components/StatsStrip';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  HardHat,
  ClipboardList,
  RotateCw,
  Search,
  Target,
} from 'lucide-react';

export const CascadingKpisPage: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState<CascadeKpiResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'skilled' | 'helper'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'excellent' | 'good' | 'poor'>('all');

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.list({ limit: 100 });
      setProjects(res.data || []);
    } catch {
      // Ignored
    }
  };

  const fetchKpis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await kpisApi.getCascadeKpis({
        projectId: selectedProject || undefined,
        date: selectedDate || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error loading KPIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [selectedProject, selectedDate]);

  const filteredWorkers = (data?.workers || []).filter((w: EvaluatedWorkerKpi) => {
    if (roleFilter !== 'all' && w.roleInCrew !== roleFilter) return false;
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = w.employeeName.toLowerCase().includes(q);
      const matchProf = (w.profession || '').toLowerCase().includes(q);
      const matchCrew = (w.crewCode || '').toLowerCase().includes(q);
      const matchForeman = (w.foremanName || '').toLowerCase().includes(q);
      if (!matchName && !matchProf && !matchCrew && !matchForeman) return false;
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-heading)' }}>
            <Target size={26} color="#f59e0b" />
            <span>{t('kpis.title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {t('kpis.subtitle')}
          </p>
        </div>

        {/* Global Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input-field"
            style={{ width: 'auto', minWidth: '180px' }}
          >
            <option value="">{t('common.all_projects')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field"
            style={{ width: 'auto' }}
          />

          <button
            type="button"
            onClick={fetchKpis}
            className="btn btn-primary"
            style={{ gap: '0.5rem', background: '#f59e0b', color: '#000' }}
          >
            <RotateCw size={15} />
            <span>{t('common.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
        </div>
      )}

      {/* Operational Protocol Banner */}
      <div
        style={{
          padding: '1rem 1.25rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: 'var(--text-heading)',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>💡</span>
        <div>
          <strong style={{ color: '#f59e0b' }}>{t('kpis.protocol_rule_title')}</strong>{' '}
          <span style={{ color: 'var(--text-muted)' }}>{t('kpis.protocol_rule_desc')}</span>
        </div>
      </div>

      {/* Stats Summary Strip */}
      {data?.summary && (
        <StatsStrip
          items={[
            {
              label: t('kpis.summary.avg_efficiency'),
              value: `${data.summary.avgKpi}%`,
              helper: `${data.summary.totalEvaluatedWorkers} ${t('kpis.summary.workers_count')}`,
              icon: <TrendingUp size={18} color="#f59e0b" />,
            },
            {
              label: t('kpis.summary.excellent'),
              value: data.summary.greenCount,
              helper: t('kpis.summary.on_or_above_target'),
              icon: <CheckCircle2 size={18} color="#10b981" />,
              color: 'success',
            },
            {
              label: t('kpis.summary.good'),
              value: data.summary.yellowCount,
              helper: t('kpis.summary.near_target'),
              icon: <AlertTriangle size={18} color="#f59e0b" />,
            },
            {
              label: t('kpis.summary.poor'),
              value: data.summary.redCount,
              helper: t('kpis.summary.needs_support'),
              icon: <XCircle size={18} color="#ef4444" />,
            },
            {
              label: t('kpis.summary.crews_summary'),
              value: `${data.summary.crewsCount} ${t('kpis.summary.crews')}`,
              helper: `${data.summary.engineersCount} ${t('kpis.summary.engineers')} • ${data.summary.foremenCount} ${t('kpis.summary.foremen')}`,
              icon: <Users size={18} color="#3b82f6" />,
            },
          ]}
        />
      )}

      {/* Hierarchical Supervisor & Crew Summaries (3-Column Grid, Stacks on Mobile) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Engineers */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <HardHat size={18} color="#f59e0b" />
            <span>{t('kpis.engineers_kpis')}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
            {data?.engineers && data.engineers.length > 0 ? (
              data.engineers.map((eng) => (
                <div
                  key={eng.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{eng.name}</span>
                  <span
                    className="badge"
                    style={{
                      fontWeight: 700,
                      background: eng.efficiencyPct >= 100 ? 'rgba(16, 185, 129, 0.15)' : eng.efficiencyPct >= 80 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: eng.efficiencyPct >= 100 ? '#10b981' : eng.efficiencyPct >= 80 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {eng.efficiencyPct}%
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                {t('common.no_data')}
              </div>
            )}
          </div>
        </div>

        {/* Foremen */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ClipboardList size={18} color="#f59e0b" />
            <span>{t('kpis.foremen_kpis')}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
            {data?.foremen && data.foremen.length > 0 ? (
              data.foremen.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{f.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{f.engineerName}</div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      fontWeight: 700,
                      background: f.efficiencyPct >= 100 ? 'rgba(16, 185, 129, 0.15)' : f.efficiencyPct >= 80 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: f.efficiencyPct >= 100 ? '#10b981' : f.efficiencyPct >= 80 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {f.efficiencyPct}%
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                {t('common.no_data')}
              </div>
            )}
          </div>
        </div>

        {/* Crews */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Users size={18} color="#f59e0b" />
            <span>{t('kpis.crews_kpis')}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
            {data?.crews && data.crews.length > 0 ? (
              data.crews.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{c.foremanName}</div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      fontWeight: 700,
                      background: c.efficiencyPct >= 100 ? 'rgba(16, 185, 129, 0.15)' : c.efficiencyPct >= 80 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: c.efficiencyPct >= 100 ? '#10b981' : c.efficiencyPct >= 80 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {c.efficiencyPct}%
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                {t('common.no_data')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Evaluation Table Card */}
      <div className="card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
        {/* Table Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
              {t('kpis.workers_detail_title')}
            </h2>
            <span className="badge badge-secondary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              {filteredWorkers.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingInlineStart: '2rem', width: '180px', height: '34px', fontSize: '0.8rem' }}
              />
              <Search size={14} style={{ position: 'absolute', top: '10px', insetInlineStart: '8px', color: 'var(--text-dim)' }} />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="input-field"
              style={{ width: 'auto', height: '34px', fontSize: '0.8rem' }}
            >
              <option value="all">{t('common.all')}</option>
              <option value="skilled">{t('kpis.filter_skilled')}</option>
              <option value="helper">{t('kpis.filter_helper')}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field"
              style={{ width: 'auto', height: '34px', fontSize: '0.8rem' }}
            >
              <option value="all">{t('common.all')}</option>
              <option value="excellent">{t('kpis.status_excellent')}</option>
              <option value="good">{t('kpis.status_good')}</option>
              <option value="poor">{t('kpis.status_poor')}</option>
            </select>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>#</th>
                <th style={{ padding: '0.85rem 1rem' }}>{t('employees.name')}</th>
                <th style={{ padding: '0.85rem 1rem' }}>{t('employees.profession')}</th>
                <th style={{ padding: '0.85rem 1rem' }}>{t('crews.code')}</th>
                <th style={{ padding: '0.85rem 1rem' }}>{t('work_items.name')}</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{t('kpis.actual_executed')}</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{t('kpis.standard_target')}</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{t('kpis.efficiency_pct')}</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    {t('common.no_data')}
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker, index) => (
                  <tr
                    key={`${worker.id}-${index}`}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-dim)' }}>{index + 1}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{worker.employeeName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {worker.roleLabel}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-heading)', fontWeight: 500 }}>
                      {worker.profession || '-'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{worker.crewCode}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{worker.foremanName}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{worker.workItemName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{worker.stageName} • {worker.roomName}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-heading)' }}>
                      {worker.actualQuantity !== null ? `${worker.actualQuantity} ${worker.unit}` : (
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                          {t('kpis.crew_average_label')}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {worker.standardTarget} {worker.unit}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: worker.color,
                          }}
                        >
                          {worker.efficiencyPct}%
                        </span>
                        <div style={{ width: '64px', height: '5px', background: 'var(--bg-surface-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              borderRadius: '999px',
                              width: `${Math.min(worker.efficiencyPct, 100)}%`,
                              backgroundColor: worker.color,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${worker.color}18`,
                          color: worker.color,
                          border: `1px solid ${worker.color}35`,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {worker.status === 'excellent'
                          ? t('kpis.excellent_badge')
                          : worker.status === 'good'
                          ? t('kpis.good_badge')
                          : t('kpis.poor_badge')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
