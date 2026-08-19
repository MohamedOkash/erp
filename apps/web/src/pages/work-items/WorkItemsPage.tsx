import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { workItemsApi } from '../../api/work-items.api';
import type { WorkItem, CreateWorkItemPayload, WorkItemStageItem } from '../../api/work-items.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import type { WorkCategory } from '../../api/work-categories.api';
import { workCategoriesApi } from '../../api/work-categories.api';
import { StagesManagementModal } from './StagesManagementModal';
import { PricesManagementModal } from './PricesManagementModal';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/I18nContext';
import { formatUnit, formatCurrency } from '../../lib/format';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Hash,
  Layers,
  DollarSign,
  FolderTree,
  ChevronDown,
  ChevronLeft,
  Target,
  Sparkles,
  Zap,
  Droplet,
  Wind,
  Shield,
  Box,
  LayoutGrid,
  Hammer,
  Palette,
  Compass,
} from 'lucide-react';

// Department icon helper
function getDepartmentIcon(code?: string, name?: string) {
  const c = (code || '').toUpperCase();
  const n = name || '';
  if (c.includes('PLASTER') || n.includes('محارة') || n.includes('لياسة')) return Hammer;
  if (c.includes('PAINT') || n.includes('دهان')) return Palette;
  if (c.includes('GYPSUM') || n.includes('جبس')) return LayoutGrid;
  if (c.includes('CERAMIC') || c.includes('PORCELAIN') || n.includes('سيراميك') || n.includes('بورسلين')) return Layers;
  if (c.includes('MARBLE') || n.includes('رخام')) return Box;
  if (c.includes('BLOCK') || n.includes('بلك') || n.includes('مباني')) return Box;
  if (c.includes('WOOD') || n.includes('نجار')) return Compass;
  if (c.includes('ALUM') || n.includes('ألمنيوم') || n.includes('المنيوم')) return LayoutGrid;
  if (c.includes('ELEC') || n.includes('كهرب')) return Zap;
  if (c.includes('PLUMB') || n.includes('صحي') || n.includes('سباك')) return Droplet;
  if (c.includes('HVAC') || n.includes('تكييف')) return Wind;
  if (c.includes('WATER') || c.includes('ISO') || n.includes('عزل')) return Shield;
  if (c.includes('EPOXY') || n.includes('إيبوكسي') || n.includes('ايبوكسي')) return Sparkles;
  return FolderTree;
}

export const WorkItemsPage: React.FC = () => {
  const { t, language } = useI18n();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<WorkCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Category (Master Sidebar)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Accordion Expandable Rows (Work Item IDs)
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stages & Prices Modal
  const [stagesItem, setStagesItem] = useState<WorkItem | null>(null);
  const [pricesItem, setPricesItem] = useState<WorkItem | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDefaultUnitRate, setFormDefaultUnitRate] = useState(0);
  const [formDefaultDailyTarget, setFormDefaultDailyTarget] = useState(0);
  const [formBranchId, setFormBranchId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<WorkItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Categories & Branches
  const loadInitialData = async () => {
    try {
      const [branchesRes, categoriesRes] = await Promise.all([
        branchesApi.list({ isActive: true }),
        workCategoriesApi.list(),
      ]);
      setBranches(branchesRes.data);
      setCategories(categoriesRes);
    } catch {
      // ignore
    }
  };

  // Load Work Items
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await workItemsApi.list({
        page,
        limit,
        search: search.trim() || undefined,
        categoryId: selectedCategoryId || undefined,
        branchId: selectedBranch || undefined,
      });
      setItems(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_تحميل_بنود_الأعمال_31d6dc'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedBranch, selectedCategoryId]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Active Category Object
  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Aggregate metrics for active selection
  const metrics = useMemo(() => {
    const totalItems = total;
    let avgTarget = 0;
    let avgRate = 0;
    let totalStages = 0;

    if (items.length > 0) {
      const validTargets = items.filter((i) => Number(i.defaultDailyTarget) > 0);
      const sumTarget = validTargets.reduce((acc, i) => acc + Number(i.defaultDailyTarget), 0);
      avgTarget = validTargets.length ? Math.round(sumTarget / validTargets.length) : 0;

      const validRates = items.filter((i) => Number(i.defaultUnitRate || (i as any).default_unit_rate) > 0);
      const sumRate = validRates.reduce((acc, i) => acc + Number(i.defaultUnitRate || (i as any).default_unit_rate), 0);
      avgRate = validRates.length ? Math.round(sumRate / validRates.length) : 0;

      totalStages = items.reduce((acc, i) => acc + (i.stages?.length || 0), 0);
    }

    return { totalItems, avgTarget, avgRate, totalStages };
  }, [items, total]);

  const toggleExpand = (id: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormCode('');
    setFormCategoryId(selectedCategoryId || (categories[0]?.id || ''));
    const cat = categories.find((c) => c.id === selectedCategoryId) || categories[0];
    setFormCategory(cat?.name || '');
    setFormDescription('');
    setFormDefaultUnitRate(0);
    setFormDefaultDailyTarget(100);
    setFormBranchId(branches[0]?.id || '');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEdit = (item: WorkItem) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormCode(item.code || '');
    setFormCategoryId(item.categoryId || (item as any).category_id || '');
    setFormCategory(item.category || '');
    setFormDescription((item as any).description || '');
    setFormDefaultUnitRate(Number(item.defaultUnitRate || (item as any).default_unit_rate) || 0);
    setFormDefaultDailyTarget(Number(item.defaultDailyTarget || (item as any).default_daily_target) || 0);
    setFormBranchId((item as any).branchId || '');
    setFormIsActive(item.isActive ?? true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload: CreateWorkItemPayload = {
        name: formName.trim(),
        code: formCode.trim() || undefined,
        categoryId: formCategoryId || undefined,
        category: formCategory.trim() || undefined,
        description: formDescription.trim() || undefined,
        defaultUnitRate: Number(formDefaultUnitRate) || 0,
        defaultDailyTarget: Number(formDefaultDailyTarget) || 0,
        isActive: formIsActive,
      };
      if (formBranchId) payload.branchId = formBranchId;

      if (editingItem) {
        await workItemsApi.update(editingItem.id, payload);
        setSuccessMsg(t('auto.تم_تحديث_بند_العمل_بنجاح_3e35e0'));
      } else {
        await workItemsApi.create(payload);
        setSuccessMsg(t('auto.تم_إنشاء_بند_العمل_بنجاح_1f5a96'));
      }
      setIsModalOpen(false);
      loadItems();
      loadInitialData(); // Refresh category counts
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حفظ_بند_العمل_59f4fc'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await workItemsApi.remove(deletingItem.id);
      setSuccessMsg(`تم حذف بند العمل "${deletingItem.name}" بنجاح`);
      setDeletingItem(null);
      loadItems();
      loadInitialData(); // Refresh category counts
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || t('auto.فشل_حذف_بند_العمل_5f4950'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem 2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(15, 23, 42, 0.75) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-heading)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              }}
            >
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                {t('resources.work_items_title')}
              </h1>
              <span style={{ fontSize: '0.85rem', color: '#93c5fd' }}>
                {t('nav.links.work_items')}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={openCreate}
            className="btn btn-primary"
            style={{
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
          >
            <Plus size={19} />
            <span>{t('resources.add_item')}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.25rem',
            fontSize: '0.92rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={20} /> <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.25rem',
            fontSize: '0.92rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={20} /> <span>{error}</span>
        </div>
      )}

      {/* MASTER-DETAIL LAYOUT: Vertical Category Sidebar + Main Work Items View */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '290px 1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Right Sidebar: 15 Finishing Departments */}
        <aside
          className="glass-card"
          style={{
            padding: '1.2rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            position: 'sticky',
            top: '1.5rem',
            maxHeight: 'calc(100vh - 4rem)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderTree size={18} color="#60a5fa" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9' }}>{t('auto.أقسام_التشطيبات_15_1045e2')}</span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#93c5fd',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 700,
              }}
            >
              {categories.length} {t('auto.قسم_184434')}</span>
          </div>

          {/* All Departments Option */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId('');
              setPage(1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: selectedCategoryId === '' ? '1px solid #3b82f6' : '1px solid transparent',
              background:
                selectedCategoryId === ''
                  ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(30, 58, 138, 0.4) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
              color: selectedCategoryId === '' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              textAlign: 'right',
              fontWeight: selectedCategoryId === '' ? 700 : 500,
              fontSize: '0.88rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <LayoutGrid size={17} color={selectedCategoryId === '' ? '#60a5fa' : '#94a3b8'} />
              <span>{t('auto.كافة_الأقسام_والبنود_575a75')}</span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: selectedCategoryId === '' ? '#2563eb' : 'rgba(255,255,255,0.08)',
                color: 'var(--text-heading)',
                fontWeight: 700,
              }}
            >
              {categories.reduce((sum, c) => sum + (c.items_count || 0), 0) || total}
            </span>
          </button>

          {/* List of 15 Departments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const IconComp = getDepartmentIcon(cat.code, cat.name);
              const count = cat.items_count !== undefined ? cat.items_count : 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setPage(1);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.28) 0%, rgba(30, 58, 138, 0.45) 100%)'
                      : 'rgba(255, 255, 255, 0.02)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    textAlign: 'right',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: isSelected ? '#60a5fa' : '#94a3b8',
                      }}
                    >
                      <IconComp size={15} />
                    </div>
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={language === 'en' ? (cat.name_en || cat.name) : language === 'ur' ? (cat.name_ur || cat.name) : cat.name}
                    >
                      {language === 'en' ? (cat.name_en || cat.name) : language === 'ur' ? (cat.name_ur || cat.name) : cat.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {count > 0 && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          background: isSelected ? '#2563eb' : 'rgba(59, 130, 246, 0.15)',
                          color: isSelected ? '#ffffff' : '#93c5fd',
                          fontWeight: 700,
                        }}
                      >
                        {count}
                      </span>
                    )}
                    {isSelected && <ChevronLeft size={14} color="#60a5fa" />}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Canvas (Detail View) */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Department Highlights & KPI Cards */}
          <div
            className="glass-card"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Active Department Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('auto.القسم_النشط_حاليا_236efa')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>
                  {activeCategory ? (language === 'en' ? (activeCategory.name_en || activeCategory.name) : language === 'ur' ? (activeCategory.name_ur || activeCategory.name) : activeCategory.name) : t('auto.كافة_الأقسام_33998e')}
                </span>
                {activeCategory?.code && (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                      background: 'rgba(255,255,255,0.08)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      color: '#94a3b8',
                    }}
                  >
                    {activeCategory.code}
                  </span>
                )}
              </div>
            </div>

            {/* Total Items KPI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('auto.إجمالي_البنود_37af20')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={18} color="#34d399" />
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  {metrics.totalItems} {t('auto.بند_17e4d1')}</span>
              </div>
            </div>

            {/* Average Daily Target KPI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('auto.متوسط_المستهدف_اليومي_3df9f3')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={18} color="#f59e0b" />
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  {metrics.avgTarget > 0 ? `${metrics.avgTarget} ${formatUnit('وحدة/يوم', language)}` : '—'}
                </span>
              </div>
            </div>

            {/* Total Sub-stages KPI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('auto.المراحل_الفرعية_المفككة_52312e')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="#818cf8" />
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  {metrics.totalStages} {t('auto.مرحلة_5b41d3')}</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div
            className="glass-card"
            style={{
              padding: '1.1rem 1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 240px',
              gap: '1rem',
              alignItems: 'end',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <Search size={14} /> <span>{t('auto.بحث_باسم_البند_الكود_أو_مواصفا_7a43ba')}</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={t('auto.مثال_محارة_طرطشة_بؤج_PLS_01_3af384')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <Filter size={14} /> <span>{t('auto.تصفية_حسب_الفرع_77ecf9')}</span>
              </label>
              <select
                className="input-field"
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t('auto.كافة_الفروع_1a62e9')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Work Items Table with Expandable Stages */}
          <div
            className="glass-card"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <th style={{ padding: '0.9rem 1rem', width: '40px' }}></th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>{t('auto.اسم_بند_العمل_413641')}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>{t('auto.الكود_59a408')}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>{t('auto.القسم_الفئة_6cae77')}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>{t('auto.المستهدف_اليومي_49108a')}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>{t('auto.سعر_الوحدة_5e13de')}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>{t('auto.المراحل_الفرعية_330896')}</th>
                    <th style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                      {t('auto.الإجراءات_3259ef')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem' }}>
                        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                        <p style={{ marginTop: '0.85rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          {t('auto.جاري_تحميل_بنود_ومراحل_التشطيب_48a57e')}</p>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                        <FolderTree size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                          {t('auto.لا_توجد_بنود_عمل_مسجلة_في_هذا__74a684')}</p>
                        <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                          {t('auto.اضغط_على_زر_إضافة_بند_عمل_جديد_4ec495')}</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isExpanded = !!expandedItemIds[item.id];
                      const stages = item.stages || [];
                      const unitRate = item.defaultUnitRate || (item as any).default_unit_rate;
                      const dailyTarget = item.defaultDailyTarget || (item as any).default_daily_target;
                      
                      const formatPercent = (val: any) => {
                        const num = Number(val) || 0;
                        return num <= 1 && num > 0 ? Math.round(num * 100) : Math.round(num);
                      };
                      const stagesTotalPercent = stages.reduce((sum, s) => sum + formatPercent(s.percentage), 0);

                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            style={{
                              borderBottom: isExpanded ? 'none' : '1px solid var(--border-subtle)',
                              background: isExpanded ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            {/* Expand Toggle Button */}
                            <td style={{ padding: '0.9rem 0.5rem 0.9rem 1rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => toggleExpand(item.id)}
                                style={{
                                  background: isExpanded ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(148, 163, 184, 0.2)',
                                  borderRadius: '6px',
                                  width: '28px',
                                  height: '28px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isExpanded ? '#60a5fa' : '#94a3b8',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                title={isExpanded ? t('auto.إخفاء_المراحل_656342') : t('auto.عرض_مراحل_البند_5d7e53')}
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                              </button>
                            </td>

                            {/* Item Name */}
                            <td style={{ padding: '0.9rem 1rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem' }}>
                                  {item.name}
                                </span>
                                {(item as any).description && (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                    {(item as any).description}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Code */}
                            <td style={{ padding: '0.9rem 1rem' }}>
                              {item.code ? (
                                <span
                                  className="badge badge-secondary"
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                    padding: '0.2rem 0.5rem',
                                  }}
                                >
                                  <Hash size={12} /> {item.code}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-dim)' }}>—</span>
                              )}
                            </td>

                            {/* Category */}
                            <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                              {item.category || (item as any).category_name || '—'}
                            </td>

                            {/* Daily Target */}
                            <td style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>
                              {dailyTarget ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f59e0b' }}>
                                  <Target size={14} />
                                  <span>{dailyTarget} {item.unitSymbol || item.unitName || t('auto.م_c30d')}{t('auto.يوم_2dc238')}</span>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-dim)' }}>—</span>
                              )}
                            </td>

                            {/* Contract Unit Rate */}
                            <td style={{ padding: '0.9rem 1rem', color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
                              {unitRate ? formatCurrency(unitRate, language) : '—'}
                            </td>

                            {/* Sub-stages summary badge */}
                            <td style={{ padding: '0.9rem 1rem' }}>
                              {stages.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(item.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '999px',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    border: '1px solid rgba(59, 130, 246, 0.35)',
                                    color: '#93c5fd',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Layers size={13} />
                                  <span>{stages.length} {t('auto.مراحل_6e447e')}{stagesTotalPercent}%)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setStagesItem(item)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px dashed rgba(148, 163, 184, 0.3)',
                                    color: 'var(--text-dim)',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Plus size={12} /> <span>{t('auto.تفكيك_المراحل_1ef3bb')}</span>
                                </button>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button
                                  type="button"
                                  onClick={() => setStagesItem(item)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    color: '#818cf8',
                                    borderColor: 'rgba(129, 140, 248, 0.3)',
                                  }}
                                  title={t('auto.إدارة_مراحل_البند_والأوزان_الن_561201')}
                                >
                                  <Layers size={14} /> <span>{t('auto.المراحل_7f2a74')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setPricesItem(item)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    color: '#34d399',
                                    borderColor: 'rgba(52, 211, 153, 0.3)',
                                  }}
                                  title={t('auto.إدارة_الأسعار_والتكلفة_480093')}
                                >
                                  <DollarSign size={14} /> <span>{t('auto.الأسعار_7ef797')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEdit(item)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.5rem' }}
                                  title={t('auto.تعديل_البند_acf570')}
                                >
                                  <Edit2 size={14} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeletingItem(item)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    color: '#f87171',
                                    borderColor: 'rgba(239, 68, 68, 0.25)',
                                  }}
                                  title={t('auto.حذف_البند_30018a')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Sub-Stages Accordion View */}
                          {isExpanded && (
                            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                              <td colSpan={8} style={{ padding: '1rem 1.5rem 1.5rem 1.5rem' }}>
                                <div
                                  style={{
                                    background: 'var(--bg-surface-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    padding: '1.25rem',
                                  }}
                                >
                                  {/* Sub-stages Header */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '0.75rem',
                                      marginBottom: '1rem',
                                      paddingBottom: '0.75rem',
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <Layers size={18} color="#60a5fa" />
                                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc' }}>
                                        {t('auto.المراحل_التنفيذية_وتوزيع_الأوز_577f4b')}{item.name}"
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <span
                                        style={{
                                          fontSize: '0.78rem',
                                          color: stagesTotalPercent === 100 ? '#6ee7b7' : '#fcd34d',
                                          fontWeight: 700,
                                        }}
                                      >
                                        {t('auto.مجموع_الأوزان_5bdf4a')}{stagesTotalPercent}% {stagesTotalPercent === 100 ? t('auto.مكتمل_43eed7') : t('auto.غير_مكتمل_100_e85d10')}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setStagesItem(item)}
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '0.3rem 0.7rem',
                                          fontSize: '0.78rem',
                                          color: '#60a5fa',
                                          borderColor: 'rgba(59, 130, 246, 0.35)',
                                        }}
                                      >
                                        <Plus size={13} /> <span>{t('auto.تعديل_إضافة_مراحل_41b316')}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Stages Grid Cards */}
                                  {stages.length === 0 ? (
                                    <div
                                      style={{
                                        textAlign: 'center',
                                        padding: '1.5rem',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.85rem',
                                      }}
                                    >
                                      {t('auto.لم_يتم_تقسيم_هذا_البند_إلى_مرا_7904b0')}</div>
                                  ) : (
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                        gap: '0.85rem',
                                      }}
                                    >
                                      {stages.map((stage: WorkItemStageItem, sIdx: number) => (
                                        <div
                                          key={stage.id || sIdx}
                                          style={{
                                            background: 'var(--bg-surface-elevated)',
                                            border: '1px solid rgba(148, 163, 184, 0.15)',
                                            borderRadius: '8px',
                                            padding: '0.85rem 1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem',
                                          }}
                                        >
                                          {/* Stage Order & Name */}
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                              <span
                                                style={{
                                                  width: '22px',
                                                  height: '22px',
                                                  borderRadius: '50%',
                                                  background: 'rgba(59, 130, 246, 0.25)',
                                                  color: '#93c5fd',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 800,
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  flexShrink: 0,
                                                }}
                                              >
                                                {sIdx + 1}
                                              </span>
                                              <span
                                                style={{
                                                  fontWeight: 700,
                                                  fontSize: '0.86rem',
                                                  color: '#f1f5f9',
                                                  whiteSpace: 'nowrap',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                }}
                                                title={stage.name}
                                              >
                                                {stage.name}
                                              </span>
                                            </div>
                                            <span
                                              style={{
                                                fontSize: '0.78rem',
                                                fontWeight: 800,
                                                color: '#60a5fa',
                                                background: 'rgba(37, 99, 235, 0.2)',
                                                padding: '0.15rem 0.45rem',
                                                borderRadius: '4px',
                                              }}
                                            >
                                              {formatPercent(stage.percentage)}%
                                            </span>
                                          </div>

                                          {/* Progress bar visual representation */}
                                          <div
                                            style={{
                                              width: '100%',
                                              height: '5px',
                                              borderRadius: '3px',
                                              background: 'rgba(255, 255, 255, 0.08)',
                                              overflow: 'hidden',
                                            }}
                                          >
                                            <div
                                              style={{
                                                width: `${Math.min(formatPercent(stage.percentage), 100)}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                                                borderRadius: '3px',
                                              }}
                                            />
                                          </div>

                                          {/* Productivity target */}
                                          <div
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              fontSize: '0.76rem',
                                              color: 'var(--text-muted)',
                                              marginTop: '0.2rem',
                                            }}
                                          >
                                            <span>{t('auto.المستهدف_القياسي_39819d')}</span>
                                            <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                                              {stage.standard_productivity ? `${stage.standard_productivity} ${formatUnit('وحدة/يوم', language)}` : t('auto.حسب_المستهدف_العام_7a261a')}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Summary */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>{t('auto.إجمالي_بنود_العمل_289bd6')}{total}</span>
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
        </main>
      </div>

      {/* Create / Edit Work Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? t('auto.تعديل_بند_عمل_35c235') : t('auto.إضافة_بند_عمل_جديد_111e99')}
        icon={<CheckSquare size={22} color="#60a5fa" />}
        maxWidth="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button
              type="submit"
              form="work-item-form"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingItem ? t('auto.حفظ_التعديلات_4ff313') : t('auto.إنشاء_البند_258681')}</span>
            </button>
          </div>
        }
      >
        <form id="work-item-form" onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
              <label className="form-label">{t('auto.اسم_البند_7ac75b')}</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder={t('auto.مثال_بياض_محارة_ولياسة_داخلية__56e86e')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.كود_البند_6d33f6')}</label>
              <input
                type="text"
                className="input-field"
                placeholder="PLS-01"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.قسم_التشطيبات_5fb43b')}</label>
              <select
                className="input-field"
                value={formCategoryId}
                onChange={(e) => {
                  setFormCategoryId(e.target.value);
                  const selectedCat = categories.find((c) => c.id === e.target.value);
                  if (selectedCat) setFormCategory(selectedCat.name);
                }}
              >
                <option value="">{t('auto.اختر_القسم_55b1f4')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.المستهدف_اليومي_م_يوم_65a223')}</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={formDefaultDailyTarget}
                onChange={(e) => setFormDefaultDailyTarget(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.سعر_الوحدة_التعاقدي_ريال_8143a7')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={formDefaultUnitRate}
                onChange={(e) => setFormDefaultUnitRate(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.الفرع_اختياري_6336a1')}</label>
              <select
                className="input-field"
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
              >
                <option value="">{t('auto.كافة_الفروع_1a62e9')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
              <label className="form-label">{t('auto.وصف_البند_والمواصفات_1a7e27')}</label>
              <textarea
                rows={2}
                className="input-field"
                style={{ resize: 'vertical' }}
                placeholder={t('auto.تفاصيل_التوريد_والتركيب_والموا_2a6781')}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div
              style={{
                gridColumn: 'span 2',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}
              onClick={() => setFormIsActive(!formIsActive)}
            >
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <label style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                {t('auto.بند_نشط_ومتاح_للاستخدام_في_الم_3fbcc5')}</label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title={t('auto.تأكيد_حذف_بند_العمل_ba39a3')}
        icon={<Trash2 size={22} color="#f87171" />}
        maxWidth="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeletingItem(null)}
              className="btn btn-secondary"
              disabled={isDeleting}
            >
              {t('auto.إلغاء_5987b3')}</button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="btn btn-primary"
              style={{ background: '#dc2626' }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{t('auto.تأكيد_الحذف_4af57e')}</span>
            </button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          {t('auto.هل_أنت_متأكد_من_حذف_بند_العمل_25ca1e')}<strong style={{ color: 'var(--text-heading)' }}>"{deletingItem?.name}"</strong>{t('auto.k_61f')}</p>
      </Modal>

      {/* Stages Management Modal */}
      <StagesManagementModal
        isOpen={!!stagesItem}
        onClose={() => {
          setStagesItem(null);
          loadItems();
        }}
        workItem={stagesItem}
      />

      {/* Prices Management Modal */}
      <PricesManagementModal
        isOpen={!!pricesItem}
        onClose={() => {
          setPricesItem(null);
          loadItems();
        }}
        workItem={pricesItem}
      />
    </div>
  );
};
