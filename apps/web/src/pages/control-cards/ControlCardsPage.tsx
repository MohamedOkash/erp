import React, { useState, useEffect, useCallback } from 'react';
import { controlCardsApi } from '../../api/control-cards.api';
import type { ControlCardSummary } from '../../api/control-cards.api';
import { workCategoriesApi } from '../../api/work-categories.api';
import type { WorkCategory } from '../../api/work-categories.api';
import { projectsApi } from '../../api/projects.api';
import type { Project } from '../../api/projects.api';
import { ControlCardDetailModal } from './ControlCardDetailModal';
import { useI18n } from '../../i18n/I18nContext';
import {
  FileSpreadsheet,
  Search,
  FolderKanban,
  FolderTree,
  Loader2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export const ControlCardsPage: React.FC = () => {
  const { t } = useI18n();
  const [cards, setCards] = useState<ControlCardSummary[]>([]);
  const [categories, setCategories] = useState<WorkCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Active Detail Modal
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const [catsRes, projsRes] = await Promise.all([
        workCategoriesApi.list(),
        projectsApi.list(),
      ]);
      setCategories(catsRes);
      setProjects(projsRes.data || []);
    } catch {
      // ignore
    }
  };

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await controlCardsApi.list({
        categoryId: selectedCategory || undefined,
        projectId: selectedProject || undefined,
        search: search.trim() || undefined,
      });
      setCards(data);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل بطاقات التحكم');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedProject, search]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1440px', margin: '0 auto' }} dir="rtl">
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
            <span>{t('finance_reports.control_cards_title')}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('nav.links.control_cards')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <Sparkles size={14} /> <span>{cards.length} بطاقة تحكم نشطة</span>
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setSelectedCategory('')}
            className={`btn ${selectedCategory === '' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            <FolderTree size={14} /> <span>كافة الأقسام ({categories.length})</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'end',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <Search size={14} /> <span>بحث باسم البند أو الكود</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="ابحث في بطاقات التحكم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            <FolderKanban size={14} /> <span>ربط بمشروع لمتابعة التقدم الحي</span>
          </label>
          <select
            className="input-field"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">(القيم القياسية العامة للبطاقات)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>جاري تحميل بطاقات التحكم الحية...</p>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
          {error}
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          لا توجد بطاقات تحكم مطابقة لبحثك
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {cards.map((c) => (
            <div
              key={c.workItemId}
              onClick={() => setSelectedWorkItemId(c.workItemId)}
              className="glass-card"
              style={{
                cursor: 'pointer',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease-in-out',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              {/* Card Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.4 }}>
                      {c.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                      {c.code && <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>{c.code}</span>}
                      {c.category && <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{c.category}</span>}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#60a5fa',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.unit}
                  </span>
                </div>

                {/* Rates & Productivity Block */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    marginBottom: '0.75rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', display: 'block' }}>مستهدف اليوم</span>
                    <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{c.totalPerDay} {c.unit}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', display: 'block' }}>تكلفة العمالة/{c.unit}</span>
                    <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>{c.laborCostPerUnit} ريال</strong>
                  </div>
                </div>

                {/* Financial Summary */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>سعر العقد: </span>
                    <strong style={{ color: '#34d399' }}>{c.contractPrice} ريال</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>الهامش: </span>
                    <strong style={{ color: '#10b981' }}>{c.marginPerUnit} ريال</strong>
                  </div>
                </div>
              </div>

              {/* Progress & Action Button */}
              <div>
                {selectedProject && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>التقدم في المشروع:</span>
                      <strong style={{ color: '#60a5fa' }}>{c.progressPct}%</strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, c.progressPct)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    padding: '0.45rem',
                    gap: '0.4rem',
                  }}
                >
                  <span>عرض بطاقة التحكم الحية</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Control Card Detail Modal */}
      <ControlCardDetailModal
        isOpen={!!selectedWorkItemId}
        onClose={() => setSelectedWorkItemId(null)}
        workItemId={selectedWorkItemId}
        projectId={selectedProject || undefined}
      />
    </div>
  );
};
