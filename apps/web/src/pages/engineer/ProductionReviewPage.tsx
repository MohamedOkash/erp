import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { projectsApi, type Project } from '../../api/projects.api';
import { crewsApi, type Crew } from '../../api/crews.api';
import { productionApi, type ProductionRecord } from '../../api/production.api';
import { WheelDatePicker } from '../../components/WheelPicker';
import { Modal } from '../../components/Modal';
import { TableSkeleton } from '../../components/skeletons';
import {
  CheckCircle2,
  XCircle,
  FileCheck,
  Layers,
  Edit3,
  MessageSquare,
  TrendingUp,
  Clock,
} from 'lucide-react';

export const ProductionReviewPage: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();

  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [dateFilterPreset, setDateFilterPreset] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');
  const [customFromDate, setCustomFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customToDate, setCustomToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [activeModal, setActiveModal] = useState<'none' | 'approve' | 'edit' | 'notes'>('none');
  const [selectedRecord, setSelectedRecord] = useState<ProductionRecord | null>(null);
  const [engineerNotesInput, setEngineerNotesInput] = useState<string>('');
  const [editActualQty, setEditActualQty] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    if (dateFilterPreset === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return { calculatedFromDate: w.toISOString().split('T')[0], calculatedToDate: now.toISOString().split('T')[0] };
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

  // Fetch production records
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

  // Filter records by status and search
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status filter
      if (statusFilter === 'pending') {
        if (r.status === 'engineer_approved' || r.status === 'final_approved') return false;
      } else if (statusFilter === 'approved') {
        if (r.status !== 'engineer_approved' && r.status !== 'final_approved') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.workItemName?.toLowerCase().includes(q) ||
          r.workAreaName?.toLowerCase().includes(q) ||
          r.projectName?.toLowerCase().includes(q) ||
          r.crewCode?.toLowerCase().includes(q) ||
          r.teamCode?.toLowerCase().includes(q) ||
          r.engineerNotes?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [records, statusFilter, searchQuery]);

  // KPI Metrics Calculations
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let totalMeters = 0;
    let highPerformers = 0;

    for (const r of records) {
      const isApproved = r.status === 'engineer_approved' || r.status === 'final_approved' || Boolean(r.engineerApprovedAt);
      if (isApproved) {
        approvedCount++;
      } else {
        pendingCount++;
      }
      const actual = Number(r.actualQuantity || 0);
      const target = Number(r.targetQuantity || 0);
      totalMeters += actual;
      if (target > 0 && (actual / target) >= 1.0) {
        highPerformers++;
      }
    }

    return { pendingCount, approvedCount, totalMeters, highPerformers };
  }, [records]);

  // Action: Open Approve Modal
  const handleOpenApprove = (record: ProductionRecord) => {
    setSelectedRecord(record);
    setEngineerNotesInput(record.engineerNotes || '');
    setActiveModal('approve');
  };

  // Action: Open Edit Modal
  const handleOpenEdit = (record: ProductionRecord) => {
    setSelectedRecord(record);
    setEditActualQty(Number(record.actualQuantity || 0));
    setEngineerNotesInput(record.engineerNotes || '');
    setActiveModal('edit');
  };

  // Action: Open Notes Modal
  const handleOpenNotes = (record: ProductionRecord) => {
    setSelectedRecord(record);
    setEngineerNotesInput(record.engineerNotes || '');
    setActiveModal('notes');
  };

  // Execute Approval
  const executeApprove = async () => {
    if (!selectedRecord) return;
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      await productionApi.approveStep(selectedRecord.id, {
        step: 'engineer',
        notes: engineerNotesInput,
        engineerApprovedBy: user?.id,
      });
      setFeedbackMsg({ type: 'success', text: t('auto.تم_اعتماد_السجل_الهندسي_بنجاح_23f167') });
      setActiveModal('none');
      loadRecords();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || t('auto.فشل_اعتماد_السجل_155e0f') });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Edit & Update
  const executeUpdate = async () => {
    if (!selectedRecord) return;
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      await productionApi.update(selectedRecord.id, {
        actualQuantity: Number(editActualQty),
      });
      if (engineerNotesInput !== (selectedRecord.engineerNotes || '')) {
        await productionApi.approveStep(selectedRecord.id, {
          step: 'engineer',
          notes: engineerNotesInput,
          engineerApprovedBy: user?.id,
        });
      }
      setFeedbackMsg({ type: 'success', text: t('auto.تم_تعديل_كمية_الإنتاجية_وتحديث_62a974') });
      setActiveModal('none');
      loadRecords();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || t('auto.فشل_تحديث_السجل_26f9fe') });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Notes Only
  const executeSaveNotes = async () => {
    if (!selectedRecord) return;
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      await productionApi.approveStep(selectedRecord.id, {
        step: 'engineer',
        notes: engineerNotesInput,
        engineerApprovedBy: user?.id,
      });
      setFeedbackMsg({ type: 'success', text: t('auto.تم_حفظ_الملاحظات_الهندسية_3c30e0') });
      setActiveModal('none');
      loadRecords();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || t('auto.فشل_حفظ_الملاحظات_484506') });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-emerald-500)',
            }}
          >
            <FileCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-heading)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
              {t('auto.مراجعة_واعتماد_الإنتاجية_الميد_15964b')}</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
              {t('auto.منظومة_التدقيق_الهندسي_تقييم_م_2d38ad')}</p>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: feedbackMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            color: feedbackMsg.type === 'success' ? 'var(--color-emerald-500)' : 'var(--color-rose-500)',
          }}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{feedbackMsg.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {/* Pending Review */}
        <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--glass-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('auto.بانتظار_اعتماد_المهندس_29853d')}</span>
            <Clock size={18} color="var(--color-amber-500)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-amber-500)', marginTop: 'var(--space-2)' }}>
            {metrics.pendingCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t('auto.سجل_يومية_يحتاج_تدقيق_479120')}</div>
        </div>

        {/* Total Meters */}
        <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--glass-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('auto.إجمالي_الأمتار_المنجزة_24df9e')}</span>
            <Layers size={18} color="var(--color-sky-500)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-sky-500)', marginTop: 'var(--space-2)' }}>
            {metrics.totalMeters.toFixed(1)} <span style={{ fontSize: '14px' }}>{t('auto.م_c30d')}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t('auto.للفترة_المحددة_287844')}</div>
        </div>

        {/* High Performers (>=100%) */}
        <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--glass-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('auto.محققة_للمستهدف_100_6ed2ef')}</span>
            <TrendingUp size={18} color="var(--color-emerald-500)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-emerald-500)', marginTop: 'var(--space-2)' }}>
            {metrics.highPerformers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t('auto.أداء_قياسي_ممتاز_3683b5')}</div>
        </div>

        {/* Approved Records */}
        <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--glass-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('auto.السجلات_المعتمدة_3d6e33')}</span>
            <CheckCircle2 size={18} color="var(--color-teal-500)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-teal-500)', marginTop: 'var(--space-2)' }}>
            {metrics.approvedCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t('auto.معتمدة_نهائيا_4f7aa9')}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          {/* Status Segmented Buttons */}
          <div style={{ display: 'flex', background: 'var(--glass-light)', padding: '3px', borderRadius: 'var(--radius-md)', gap: '2px' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: statusFilter === 'pending' ? 'var(--color-amber-500)' : 'transparent',
                color: statusFilter === 'pending' ? '#000' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('auto.قيد_المراجعة_345943')}{metrics.pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: statusFilter === 'approved' ? 'var(--color-emerald-500)' : 'transparent',
                color: statusFilter === 'approved' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('auto.المعتمدة_4002dc')}{metrics.approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: statusFilter === 'all' ? 'var(--color-slate-800)' : 'transparent',
                color: statusFilter === 'all' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('auto.جميع_السجلات_69f12a')}</button>
          </div>

          {/* Date Presets */}
          <div style={{ display: 'flex', background: 'var(--glass-light)', padding: '3px', borderRadius: 'var(--radius-md)', gap: '2px' }}>
            <button
              type="button"
              onClick={() => setDateFilterPreset('today')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dateFilterPreset === 'today' ? 'var(--color-slate-800)' : 'transparent',
                color: dateFilterPreset === 'today' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {t('auto.اليوم_59a422')}</button>
            <button
              type="button"
              onClick={() => setDateFilterPreset('yesterday')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dateFilterPreset === 'yesterday' ? 'var(--color-slate-800)' : 'transparent',
                color: dateFilterPreset === 'yesterday' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {t('auto.أمس_17d1f1')}</button>
            <button
              type="button"
              onClick={() => setDateFilterPreset('week')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dateFilterPreset === 'week' ? 'var(--color-slate-800)' : 'transparent',
                color: dateFilterPreset === 'week' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {t('auto.آخر_7_أيام_6e4410')}</button>
            <button
              type="button"
              onClick={() => setDateFilterPreset('custom')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: dateFilterPreset === 'custom' ? 'var(--color-slate-800)' : 'transparent',
                color: dateFilterPreset === 'custom' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {t('auto.مخصص_2f190e')}</button>
          </div>

          {/* Custom Date Pickers */}
          {dateFilterPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ width: '130px' }}>
                <WheelDatePicker value={customFromDate} onChange={setCustomFromDate} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('auto.إلى_17d96a')}</span>
              <div style={{ width: '130px' }}>
                <WheelDatePicker value={customToDate} onChange={setCustomToDate} />
              </div>
            </div>
          )}

          {/* Project Dropdown */}
          <div style={{ width: '190px' }}>
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
          <div style={{ width: '160px' }}>
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
          <div style={{ minWidth: '200px', flex: 1 }}>
            <input
              type="text"
              placeholder={t('auto.بحث_في_البنود_والملاحظات_5cfd91')}
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Review Table with Visual Performance Indicators */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileCheck size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.4 }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{t('auto.لا_توجد_سجلات_مطابقة_للشروط_ال_669d47')}</div>
            <p style={{ fontSize: '13px', margin: '4px 0 0' }}>{t('auto.تم_اعتماد_كافة_السجلات_أو_يمكن_7c7236')}</p>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--glass-medium)', borderBottom: 'var(--border-glass)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.التاريخ_7f54ad')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.المشروع_الموقع_72663f')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.الطاقم_2528e6')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.البند_والمرحلة_6d447a')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.الكمية_المنجزة_1fde98')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.المستهدف_القياسي_276f6e')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 700 }}>{t('auto.نسبة_الإنجاز_التقييم_2a04fc')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{t('auto.ملاحظات_المهندس_3c9bd0')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 700 }}>{t('auto.الإجراءات_3259ef')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec) => {
                const isApproved = rec.status === 'engineer_approved' || rec.status === 'final_approved' || Boolean(rec.engineerApprovedAt);
                const actual = Number(rec.actualQuantity || 0);
                const target = Number(rec.targetQuantity || 0);
                const ratio = target > 0 ? (actual / target) * 100 : 100;

                // Color code logic
                let badgeBg = 'rgba(239, 68, 68, 0.15)';
                let badgeBorder = 'rgba(239, 68, 68, 0.3)';
                let badgeColor = 'var(--color-rose-500)';
                let performanceLabel = t('auto.دون_المستهدف_80_66a31c');

                if (ratio >= 100) {
                  badgeBg = 'rgba(16, 185, 129, 0.15)';
                  badgeBorder = 'rgba(16, 185, 129, 0.3)';
                  badgeColor = 'var(--color-emerald-500)';
                  performanceLabel = t('auto.محقق_للإنتاجية_100_3fa80e');
                } else if (ratio >= 80) {
                  badgeBg = 'rgba(245, 158, 11, 0.15)';
                  badgeBorder = 'rgba(245, 158, 11, 0.3)';
                  badgeColor = 'var(--color-amber-500)';
                  performanceLabel = t('auto.مقبول_80_99_7bab3b');
                }

                return (
                  <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{rec.date}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600 }}>{rec.projectName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rec.workAreaName || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>
                      <span className="badge" style={{ background: 'var(--glass-medium)' }}>
                        {rec.crewCode || rec.teamCode || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{rec.workItemName}</div>
                      {rec.stageName && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('auto.مرحلة_cf895b')}{rec.stageName} ({rec.stagePercentage || 100}%)</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 800 }}>
                      {actual.toFixed(2)} {t('auto.م_c30d')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {target > 0 ? `${target.toFixed(2)} م²` : '—'}
                    </td>
                    {/* Performance Rating Badge */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-md)',
                          background: badgeBg,
                          border: `1px solid ${badgeBorder}`,
                          color: badgeColor,
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 800 }}>
                          {target > 0 ? `${ratio.toFixed(0)}%` : '—'}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.9 }}>
                          {target > 0 ? performanceLabel : t('auto.غير_محدد_1567b8')}
                        </span>
                      </div>
                    </td>
                    {/* Engineering Notes Preview */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '180px' }}>
                      {rec.engineerNotes ? (
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.engineerNotes}>
                          💬 {rec.engineerNotes}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5 }}>{t('auto.لا_توجد_ملاحظات_4ef080')}</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {!isApproved && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleOpenApprove(rec)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: 'var(--color-emerald-600)',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={t('auto.اعتماد_اليومية_هندسيا_3f2804')}
                          >
                            <CheckCircle2 size={14} /> {t('auto.اعتماد_25c964')}</button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOpenEdit(rec)}
                          style={{
                            padding: '5px 8px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title={t('auto.تعديل_الكمية_4f27d6')}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOpenNotes(rec)}
                          style={{
                            padding: '5px 8px',
                            fontSize: '12px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title={t('auto.الملاحظات_الهندسية_724c19')}
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Approve Modal */}
      {activeModal === 'approve' && selectedRecord && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal('none')}
          title={t('auto.اعتماد_اليومية_الهندسية_69da70')}
        >
          <div style={{ padding: 'var(--space-4)' }}>
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'var(--glass-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>
                {selectedRecord.workItemName}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {t('auto.المشروع_65f4ee')}{selectedRecord.projectName} {t('auto.الكمية_المنفذة_689855')}{Number(selectedRecord.actualQuantity || 0).toFixed(2)} {t('auto.م_c30d')}</div>
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">{t('auto.ملاحظات_المهندس_وتوجيهات_الاعت_7a889c')}</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder={t('auto.أدخل_توجيهات_الجودة_الملاحظات__37aa24')}
                value={engineerNotesInput}
                onChange={(e) => setEngineerNotesInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('none')} disabled={isProcessing}>
                {t('auto.إلغاء_5987b3')}</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={executeApprove}
                disabled={isProcessing}
                style={{ background: 'var(--color-emerald-600)', border: 'none', color: '#fff', fontWeight: 700 }}
              >
                {isProcessing ? t('auto.جاري_الاعتماد_32811a') : t('auto.تأكيد_الاعتماد_الهندسي_4ac2d9')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Actual Quantity Modal */}
      {activeModal === 'edit' && selectedRecord && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal('none')}
          title={t('auto.تعديل_كمية_الإنتاجية_الفعلية_65d480')}
        >
          <div style={{ padding: 'var(--space-4)' }}>
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'var(--glass-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)' }}>
                {selectedRecord.workItemName}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {t('auto.الموقع_7f1f9f')}{selectedRecord.workAreaName || '-'} {t('auto.الطاقم_4d5779')}{selectedRecord.crewCode || selectedRecord.teamCode || '-'}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">{t('auto.الكمية_الفعلية_المنفذة_م_2ac2ca')}</label>
              <input
                type="number"
                step="0.1"
                className="input-field"
                value={editActualQty}
                onChange={(e) => setEditActualQty(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">{t('auto.ملاحظات_التعديل_الهندسي_696021')}</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder={t('auto.سبب_تعديل_الكمية_الميدانية_14a00b')}
                value={engineerNotesInput}
                onChange={(e) => setEngineerNotesInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('none')} disabled={isProcessing}>
                {t('auto.إلغاء_5987b3')}</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={executeUpdate}
                disabled={isProcessing}
                style={{ fontWeight: 700 }}
              >
                {isProcessing ? t('auto.جاري_الحفظ_6d43e6') : t('auto.حفظ_التعديلات_4ff313')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Notes Only Modal */}
      {activeModal === 'notes' && selectedRecord && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal('none')}
          title={t('auto.الملاحظات_الهندسية_الفنية_7ccb8e')}
        >
          <div style={{ padding: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">{t('auto.الملاحظات_والتوجيهات_152867')}</label>
              <textarea
                className="input-field"
                rows={4}
                placeholder={t('auto.أدخل_الملاحظات_الفنية_الخاصة_ب_5f02e3')}
                value={engineerNotesInput}
                onChange={(e) => setEngineerNotesInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('none')} disabled={isProcessing}>
                {t('auto.إلغاء_5987b3')}</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={executeSaveNotes}
                disabled={isProcessing}
                style={{ fontWeight: 700 }}
              >
                {isProcessing ? t('auto.جاري_الحفظ_6d43e6') : t('auto.حفظ_الملاحظات_569c63')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
