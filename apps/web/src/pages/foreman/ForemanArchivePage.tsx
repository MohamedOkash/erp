import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { projectsApi, type Project } from '../../api/projects.api';
import { crewsApi, type Crew } from '../../api/crews.api';
import { productionApi, type ProductionRecord } from '../../api/production.api';
import { WheelDatePicker } from '../../components/WheelPicker';
import { TableSkeleton } from '../../components/skeletons';
import {
  Archive,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';

export const ForemanArchivePage: React.FC = () => {
  const { t } = useI18n();

  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [dateFilterPreset, setDateFilterPreset] = useState<'today' | 'yesterday' | 'before_yesterday' | 'custom'>('today');
  const [customFromDate, setCustomFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customToDate, setCustomToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate dates based on preset
  const { calculatedFromDate, calculatedToDate } = useMemo(() => {
    const now = new Date();
    if (dateFilterPreset === 'today') {
      const d = now.toISOString().split('T')[0];
      return { calculatedFromDate: d, calculatedToDate: d };
    }
    if (dateFilterPreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = y.toISOString().split('T')[0];
      return { calculatedFromDate: d, calculatedToDate: d };
    }
    if (dateFilterPreset === 'before_yesterday') {
      const by = new Date(now);
      by.setDate(by.getDate() - 2);
      const d = by.toISOString().split('T')[0];
      return { calculatedFromDate: d, calculatedToDate: d };
    }
    return { calculatedFromDate: customFromDate, calculatedToDate: customToDate };
  }, [dateFilterPreset, customFromDate, customToDate]);

  // Load project & crews lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [projRes, crewsRes] = await Promise.all([
          projectsApi.getProjects({ limit: 100 }),
          crewsApi.getCrews({}),
        ]);
        setProjects(projRes.data || []);
        setCrews(crewsRes.data || []);
      } catch {
        // ignore
      }
    };
    loadLookups();
  }, []);

  // Fetch production records for foreman
  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productionApi.getProductionRecords({
        projectId: selectedProjectId || undefined,
        crewId: selectedCrewId || undefined,
        fromDate: calculatedFromDate,
        toDate: calculatedToDate,
      });
      setRecords(res.data || []);
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, selectedCrewId, calculatedFromDate, calculatedToDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Search filtered records
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.workItemName?.toLowerCase().includes(q) ||
        r.workAreaName?.toLowerCase().includes(q) ||
        r.projectName?.toLowerCase().includes(q) ||
        r.crewCode?.toLowerCase().includes(q) ||
        r.teamCode?.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  return (
    <div className="animate-fade-in" style={{ padding: 'var(--space-6)', maxWidth: '1350px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--glass-medium)',
              border: 'var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
            }}
          >
            <Archive size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
              {t('auto.سجل_وأرشيف_الإدخالات_الميدانية_79f23e')}</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
              {t('auto.أرشيف_اليوميات_الميدانية_والعم_7e144d')}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          {/* Date Presets Toggle */}
          <div style={{ display: 'flex', background: 'var(--glass-light)', padding: '3px', borderRadius: 'var(--radius-md)', gap: '2px' }}>
            <button
              type="button"
              onClick={() => setDateFilterPreset('today')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dateFilterPreset === 'today' ? 'var(--color-slate-800)' : 'transparent',
                color: dateFilterPreset === 'today' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('auto.اليوم_59a422')}</button>
            <button
              type="button"
              onClick={() => setDateFilterPreset('yesterday')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dateFilterPreset === 'yesterday' ? 'var(--color-slate-800)' : 'transparent',
                color: dateFilterPreset === 'yesterday' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('auto.أمس_17d1f1')}</button>
            <button
              type="button"
              onClick={() => setDateFilterPreset('before_yesterday')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dateFilterPreset === 'before_yesterday' ? 'var(--color-slate-800)' : 'transparent',
                color: dateFilterPreset === 'before_yesterday' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('auto.قبل_أمس_1d79fe')}</button>
            <button
              type="button"
              onClick={() => setDateFilterPreset('custom')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dateFilterPreset === 'custom' ? 'var(--color-slate-800)' : 'transparent',
                color: dateFilterPreset === 'custom' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('auto.فترة_مخصصة_466629')}</button>
          </div>

          {/* Custom Date Pickers */}
          {dateFilterPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ width: '140px' }}>
                <WheelDatePicker value={customFromDate} onChange={setCustomFromDate} />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('auto.إلى_17d96a')}</span>
              <div style={{ width: '140px' }}>
                <WheelDatePicker value={customToDate} onChange={setCustomToDate} />
              </div>
            </div>
          )}

          {/* Project Dropdown */}
          <div style={{ width: '200px' }}>
            <select className="input-field" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
              <option value="">{t('auto.جميع_المشاريع_f44a55')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Crew Dropdown */}
          <div style={{ width: '180px' }}>
            <select className="input-field" value={selectedCrewId} onChange={(e) => setSelectedCrewId(e.target.value)}>
              <option value="">{t('auto.جميع_الطواقم_41a8ec')}</option>
              {crews.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              placeholder={t('auto.بحث_في_البنود_والمواقع_fcf241')}
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Clean Monochrome Archive Table (No color ratings / no evaluation percentages) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.4 }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{t('auto.لا_توجد_سجلات_إنتاجية_مطابقة_ل_335a84')}</div>
            <p style={{ fontSize: '13px', margin: '4px 0 0' }}>{t('auto.يمكنك_تغيير_الفلاتر_بالأعلى_أو_536a8c')}</p>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--glass-medium)', borderBottom: 'var(--border-glass)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.التاريخ_7f54ad')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.المشروع_7f28ee')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.الموقع_الغرفة_5b76d7')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.الطاقم_2528e6')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.البند_والمرحلة_6d447a')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.الكمية_المنجزة_1fde98')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 700 }}>{t('auto.حالة_الاعتماد_6243e3')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec) => {
                const isApproved = rec.status === 'engineer_approved' || rec.status === 'final_approved' || Boolean(rec.engineerApprovedAt);
                return (
                  <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{rec.date}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{rec.projectName}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {rec.workAreaName || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>
                      {rec.crewCode || rec.teamCode || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{rec.workItemName}</div>
                      {rec.stageName && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('auto.مرحلة_cf895b')}{rec.stageName}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700 }}>
                      {Number(rec.actualQuantity || 0).toFixed(2)} {t('auto.م_c30d')}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {isApproved ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--glass-medium)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                          }}
                        >
                          <CheckCircle size={14} /> {t('auto.معتمد_5b456b')}</span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--glass-subtle)',
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Clock size={14} /> {t('auto.قيد_المراجعة_408549')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
