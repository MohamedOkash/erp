import React, { useState, useEffect, useId } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Target,
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { projectsApi, type Project } from '../../api/projects.api';
import { financialReportsApi, type ProjectFinancialReport } from '../../api/financial-reports.api';

export const FinancialReportsPage: React.FC = () => {
  const { t } = useI18n();
  const projectSelectId = useId();
  const searchInputId = useId();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [report, setReport] = useState<ProjectFinancialReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadReport(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.list();
      const projectList = res.data || [];
      setProjects(projectList);
      if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].id);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (projId: string) => {
    try {
      setRefreshing(true);
      const data = await financialReportsApi.getProjectReport(projId);
      setReport(data);
    } catch {
      // Handled gracefully
    } finally {
      setRefreshing(false);
    }
  };

  const filteredItems = report?.workItems.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header & Project Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{t('fin.title')}</h1>
            <p className="text-sm text-slate-400">{t('fin.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <label htmlFor={projectSelectId} className="sr-only">
              {t('fin.select_project')}
            </label>
            <select
              id={projectSelectId}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.name} ({p.code || t('fin.active')})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => selectedProjectId && loadReport(selectedProjectId)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-all border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t('fin.refresh')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">{t('fin.loading')}</div>
      ) : !report ? (
        <div className="p-12 text-center text-slate-500">{t('fin.no_data')}</div>
      ) : (
        <>
          {/* KPI Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('fin.total_revenue')}</span>
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-100">
                {report.financialSummary.revenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">SAR</span>
              </div>
              <div className="mt-1 text-xs text-blue-400">
                {t('fin.executed_revenue')}: {report.financialSummary.totalExecutedRevenue.toLocaleString()} SAR
              </div>
            </div>

            {/* Total Cost */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('fin.total_costs')}</span>
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <PieChart className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-100">
                {report.financialSummary.totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">SAR</span>
              </div>
              <div className="mt-1 text-xs text-amber-400">
                {t('fin.direct_cost')}: {report.financialSummary.directCosts.totalDirect.toLocaleString()} SAR
              </div>
            </div>

            {/* Gross Profit Margin */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('fin.gross_profit')}</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold text-emerald-400">
                {report.financialSummary.grossProfit.toLocaleString()} <span className="text-xs font-normal text-slate-400">SAR</span>
              </div>
              <div className="mt-1 text-xs text-emerald-400/80">
                {t('fin.margin')}: {report.financialSummary.grossMarginPct}%
              </div>
            </div>

            {/* Net Profit & Margin */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t('fin.net_profit')}</span>
                <span className={`p-2 rounded-lg ${report.financialSummary.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  <Target className="w-4 h-4" />
                </span>
              </div>
              <div className={`mt-3 text-2xl font-bold ${report.financialSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {report.financialSummary.netProfit.toLocaleString()} <span className="text-xs font-normal text-slate-400">SAR</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {t('fin.net_margin_pct')}: <span className="font-semibold text-slate-200">{report.financialSummary.netProfitMarginPct}%</span>
              </div>
            </div>
          </div>

          {/* Cost Breakdown & Structure */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">{t('fin.cost_structure')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">{t('fin.material_cost')}</div>
                <div className="text-lg font-bold text-blue-400 mt-1">{report.financialSummary.directCosts.material.toLocaleString()} SAR</div>
                <div className="text-xs text-slate-500 mt-1">{report.costStructurePercentages.materialPct}% {t('fin.of_total')}</div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">{t('fin.labor_cost')}</div>
                <div className="text-lg font-bold text-amber-400 mt-1">{report.financialSummary.directCosts.labor.toLocaleString()} SAR</div>
                <div className="text-xs text-slate-500 mt-1">{report.costStructurePercentages.laborPct}% {t('fin.of_total')}</div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">{t('fin.equipment_cost')}</div>
                <div className="text-lg font-bold text-purple-400 mt-1">{report.financialSummary.directCosts.equipment.toLocaleString()} SAR</div>
                <div className="text-xs text-slate-500 mt-1">{report.costStructurePercentages.equipmentPct}% {t('fin.of_total')}</div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">{t('fin.overhead_cost')}</div>
                <div className="text-lg font-bold text-rose-400 mt-1">{report.financialSummary.overheadExpenses.toLocaleString()} SAR</div>
                <div className="text-xs text-slate-500 mt-1">{report.costStructurePercentages.overheadPct}% {t('fin.of_total')}</div>
              </div>
            </div>

            {/* Combined progress bar */}
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex">
              <div style={{ width: `${report.costStructurePercentages.materialPct}%` }} className="bg-blue-500" title={t('fin.material_title')} />
              <div style={{ width: `${report.costStructurePercentages.laborPct}%` }} className="bg-amber-500" title={t('fin.labor_title')} />
              <div style={{ width: `${report.costStructurePercentages.equipmentPct}%` }} className="bg-purple-500" title={t('fin.equipment_title')} />
              <div style={{ width: `${report.costStructurePercentages.overheadPct}%` }} className="bg-rose-500" title={t('fin.overhead_title')} />
            </div>
          </div>

          {/* Break-even Analysis Table per Work Item */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">{t('fin.break_even_table')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t('fin.formula_desc')}</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500" />
                <label htmlFor={searchInputId} className="sr-only">
                  {t('fin.search_item')}
                </label>
                <input
                  id={searchInputId}
                  type="text"
                  placeholder={t('fin.search_item')}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">{t('fin.work_item')}</th>
                    <th className="p-3">{t('fin.unit_price')}</th>
                    <th className="p-3">{t('fin.var_cost')}</th>
                    <th className="p-3">{t('fin.margin_unit')}</th>
                    <th className="p-3">{t('fin.boq_qty')}</th>
                    <th className="p-3">{t('fin.break_even_qty')}</th>
                    <th className="p-3">{t('fin.executed_qty')}</th>
                    <th className="p-3">{t('fin.be_progress')}</th>
                    <th className="p-3">{t('fin.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredItems.map((item, idx) => (
                    <tr key={item.workItemId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-slate-500">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.code} • {item.category}</div>
                      </td>
                      <td className="p-3 font-mono">{item.contractUnitPrice} SAR</td>
                      <td className="p-3 font-mono text-amber-400/90">{item.variableUnitCost} SAR</td>
                      <td className="p-3 font-mono text-emerald-400">
                        {item.unitContributionMargin} SAR <span className="text-[10px] text-slate-500">({item.marginPct}%)</span>
                      </td>
                      <td className="p-3 font-mono">{item.boqQuantity} {item.unit}</td>
                      <td className="p-3 font-mono font-bold text-purple-400">{item.breakEvenUnits} {item.unit}</td>
                      <td className="p-3 font-mono">{item.executedQuantity} {item.unit}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, item.breakEvenProgressPct)}%` }}
                              className={`h-full ${item.isBreakEvenReached ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{item.breakEvenProgressPct}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {item.isBreakEvenReached ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('fin.breakeven_reached')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertCircle className="w-3 h-3" />
                            {t('fin.remaining')} {item.remainingToBreakEven} {item.unit}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-500">
                        {t('fin.no_items_found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialReportsPage;
