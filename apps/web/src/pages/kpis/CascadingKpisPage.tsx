import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { kpisApi } from '../../api/kpis.api';
import type { CascadeKpiResponse, EvaluatedWorkerKpi } from '../../api/kpis.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">🎯</span>
            {t('kpis.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('kpis.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/30"
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
            className="px-3 py-2 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/30"
          />

          <button
            onClick={fetchKpis}
            className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-xl text-sm hover:bg-amber-400 transition-all shadow-sm flex items-center gap-2"
          >
            🔄 {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Operational Protocol Banner */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
        <span className="text-xl">💡</span>
        <div className="text-xs text-amber-500 font-medium">
          <strong>{t('kpis.protocol_rule_title')}</strong>{' '}
          {t('kpis.protocol_rule_desc')}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card/70 backdrop-blur-md p-5 rounded-2xl border border-border/60 shadow-sm">
            <div className="text-xs text-muted-foreground font-medium">
              {t('kpis.summary.avg_efficiency')}
            </div>
            <div className="text-3xl font-extrabold text-foreground mt-2 flex items-baseline gap-1">
              {data.summary.avgKpi}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.summary.totalEvaluatedWorkers} {t('kpis.summary.workers_count')}
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl shadow-sm">
            <div className="text-xs text-emerald-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {t('kpis.summary.excellent')}
            </div>
            <div className="text-3xl font-extrabold text-emerald-500 mt-2">{data.summary.greenCount}</div>
            <div className="text-xs text-emerald-500/70 mt-1">
              {t('kpis.summary.on_or_above_target')}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl shadow-sm">
            <div className="text-xs text-amber-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {t('kpis.summary.good')}
            </div>
            <div className="text-3xl font-extrabold text-amber-500 mt-2">{data.summary.yellowCount}</div>
            <div className="text-xs text-amber-500/70 mt-1">
              {t('kpis.summary.near_target')}
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl shadow-sm">
            <div className="text-xs text-red-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {t('kpis.summary.poor')}
            </div>
            <div className="text-3xl font-extrabold text-red-500 mt-2">{data.summary.redCount}</div>
            <div className="text-xs text-red-500/70 mt-1">
              {t('kpis.summary.needs_support')}
            </div>
          </div>

          <div className="bg-card/70 backdrop-blur-md p-5 rounded-2xl border border-border/60 shadow-sm col-span-2 md:col-span-1">
            <div className="text-xs text-muted-foreground font-medium">
              {t('kpis.summary.crews_summary')}
            </div>
            <div className="text-lg font-bold text-foreground mt-2 flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('kpis.summary.engineers')}</span>
                <span className="font-semibold text-foreground">{data.summary.engineersCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('kpis.summary.foremen')}</span>
                <span className="font-semibold text-foreground">{data.summary.foremenCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('kpis.summary.crews')}</span>
                <span className="font-semibold text-foreground">{data.summary.crewsCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchical Supervisor & Crew Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Engineers */}
        <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border/50 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>👷‍♂️</span> {t('kpis.engineers_kpis')}
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {data?.engineers && data.engineers.length > 0 ? (
              data.engineers.map((eng) => (
                <div
                  key={eng.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/50 text-xs"
                >
                  <span className="font-medium text-foreground">{eng.name}</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-lg ${
                      eng.efficiencyPct >= 100
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : eng.efficiencyPct >= 80
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {eng.efficiencyPct}%
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                {t('common.no_data')}
              </div>
            )}
          </div>
        </div>

        {/* Foremen */}
        <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border/50 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>📋</span> {t('kpis.foremen_kpis')}
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {data?.foremen && data.foremen.length > 0 ? (
              data.foremen.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/50 text-xs"
                >
                  <div>
                    <div className="font-medium text-foreground">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground">{f.engineerName}</div>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-lg ${
                      f.efficiencyPct >= 100
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : f.efficiencyPct >= 80
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {f.efficiencyPct}%
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                {t('common.no_data')}
              </div>
            )}
          </div>
        </div>

        {/* Crews */}
        <div className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border/50 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>👥</span> {t('kpis.crews_kpis')}
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {data?.crews && data.crews.length > 0 ? (
              data.crews.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/50 text-xs"
                >
                  <div>
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.foremanName}</div>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-lg ${
                      c.efficiencyPct >= 100
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : c.efficiencyPct >= 80
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {c.efficiencyPct}%
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                {t('common.no_data')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Evaluation Table */}
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm overflow-hidden space-y-4 p-6">
        {/* Table Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-foreground">
              {t('kpis.workers_detail_title')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
              {filteredWorkers.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-amber-500/30"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-medium"
            >
              <option value="all">{t('common.all')}</option>
              <option value="skilled">{t('kpis.filter_skilled')}</option>
              <option value="helper">{t('kpis.filter_helper')}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-medium"
            >
              <option value="all">{t('common.all')}</option>
              <option value="excellent">{t('kpis.status_excellent')}</option>
              <option value="good">{t('kpis.status_good')}</option>
              <option value="poor">{t('kpis.status_poor')}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-start text-xs">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3 text-start">#</th>
                <th className="px-4 py-3 text-start">{t('employees.name')}</th>
                <th className="px-4 py-3 text-start">{t('employees.profession')}</th>
                <th className="px-4 py-3 text-start">{t('crews.code')}</th>
                <th className="px-4 py-3 text-start">{t('work_items.name')}</th>
                <th className="px-4 py-3 text-center">{t('kpis.actual_executed')}</th>
                <th className="px-4 py-3 text-center">{t('kpis.standard_target')}</th>
                <th className="px-4 py-3 text-center">{t('kpis.efficiency_pct')}</th>
                <th className="px-4 py-3 text-center">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-background/50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('common.no_data')}
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker, index) => (
                  <tr key={`${worker.id}-${index}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{worker.employeeName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {worker.roleLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {worker.profession || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{worker.crewCode}</div>
                      <div className="text-[10px] text-muted-foreground">{worker.foremanName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{worker.workItemName}</div>
                      <div className="text-[10px] text-muted-foreground">{worker.stageName} • {worker.roomName}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-foreground">
                      {worker.actualQuantity !== null ? `${worker.actualQuantity} ${worker.unit}` : (
                        <span className="text-muted-foreground italic text-[11px]">
                          {t('kpis.crew_average_label')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {worker.standardTarget} {worker.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="font-extrabold text-sm"
                          style={{ color: worker.color }}
                        >
                          {worker.efficiencyPct}%
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(worker.efficiencyPct, 100)}%`,
                              backgroundColor: worker.color,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          backgroundColor: `${worker.color}15`,
                          color: worker.color,
                          border: `1px solid ${worker.color}30`,
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
