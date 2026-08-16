import React, { useEffect, useState, useCallback } from 'react';
import { workItemsApi } from '../../api/work-items.api';
import type { WorkItem, CreateWorkItemPayload } from '../../api/work-items.api';
import { branchesApi } from '../../api/branches.api';
import type { Branch } from '../../api/branches.api';
import type { WorkCategory } from '../../api/work-categories.api';
import { workCategoriesApi } from '../../api/work-categories.api';
import { StagesManagementModal } from './StagesManagementModal';
import { PricesManagementModal } from './PricesManagementModal';
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
  X,
  Layers,
  DollarSign,
  FolderTree,
} from 'lucide-react';

export const WorkItemsPage: React.FC = () => {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<WorkCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDefaultUnitRate, setFormDefaultUnitRate] = useState(0);
  const [formDefaultDailyTarget, setFormDefaultDailyTarget] = useState(0);
  const [formBranchId, setFormBranchId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<WorkItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await workItemsApi.list({
        page,
        limit,
        search: search.trim() || undefined,
        category: selectedCategory || undefined,
        branchId: selectedBranch || undefined,
      });
      setItems(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بنود الأعمال');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedBranch, selectedCategory]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormCode('');
    setFormCategory(selectedCategory || '');
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
    setFormCategory((item as any).category || '');
    setFormDescription((item as any).description || '');
    setFormDefaultUnitRate(Number((item as any).defaultUnitRate) || 0);
    setFormDefaultDailyTarget(Number(item.defaultDailyTarget) || 0);
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
      const payload: CreateWorkItemPayload & { category?: string; description?: string; defaultUnitRate?: number; branchId?: string } = {
        name: formName.trim(),
        code: formCode.trim() || undefined,
        category: formCategory.trim() || undefined,
        description: formDescription.trim() || undefined,
        defaultUnitRate: Number(formDefaultUnitRate) || 0,
        defaultDailyTarget: Number(formDefaultDailyTarget) || 0,
        isActive: formIsActive,
      };
      if (formBranchId) (payload as any).branchId = formBranchId;

      if (editingItem) {
        await workItemsApi.update(editingItem.id, payload);
        setSuccessMsg('تم تحديث بند العمل بنجاح');
      } else {
        await workItemsApi.create(payload);
        setSuccessMsg('تم إنشاء بند العمل بنجاح');
      }
      setIsModalOpen(false);
      loadItems();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ بند العمل');
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
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'فشل حذف بند العمل');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1380px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckSquare size={28} color="#60a5fa" />
            <span>كتالوج بنود التشطيبات والمقايسة الهرمية (BOQ)</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            إدارة كافة بنود التشطيبات، تقسيم المراحل والأوزان النسبية، والأسعار ومعدلات الإنتاجية.
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          <span>إضافة بند عمل</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--status-success-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <CheckCircle2 size={18} /> <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--status-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {/* Departments / Categories Bar */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <button
            onClick={() => { setSelectedCategory(''); setPage(1); }}
            className={`btn ${selectedCategory === '' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            <FolderTree size={14} /> <span>كافة الأقسام ({categories.length})</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.name); setPage(1); }}
              className={`btn ${selectedCategory === cat.name ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label"><Search size={14} /> <span>بحث باسم البند أو الكود</span></label>
          <input type="text" className="input-field" placeholder="ابحث..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label"><Filter size={14} /> <span>الفرع</span></label>
          <select className="input-field" value={selectedBranch} onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}>
            <option value="">كافة الفروع</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem' }}>اسم البند</th>
                <th style={{ padding: '1rem' }}>الكود</th>
                <th style={{ padding: '1rem' }}>الفئة / القسم</th>
                <th style={{ padding: '1rem' }}>المستهدف اليومي</th>
                <th style={{ padding: '1rem' }}>سعر العقد</th>
                <th style={{ padding: '1rem' }}>الحالة</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>المراحل والأسعار</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جاري تحميل بنود الأعمال...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>لا توجد بنود أعمال مسجلة</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#ffffff' }}>{item.name}</td>
                    <td style={{ padding: '1rem' }}>
                      {item.code ? (
                        <span className="badge badge-secondary" style={{ fontFamily: 'monospace' }}><Hash size={12} /> {item.code}</span>
                      ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{(item as any).category || '—'}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{item.defaultDailyTarget || '—'}</td>
                    <td style={{ padding: '1rem', color: '#34d399', fontWeight: 700 }}>
                      {(item as any).defaultUnitRate ? `${Number((item as any).defaultUnitRate).toLocaleString()} ريال` : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {item.isActive ? <span className="badge badge-success">نشط</span> : <span className="badge badge-accent" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>معطل</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setStagesItem(item)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#818cf8', borderColor: 'rgba(129, 140, 248, 0.3)' }}
                          title="إدارة مراحل البند والأوزان النسبية"
                        >
                          <Layers size={14} /> <span>المراحل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPricesItem(item)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
                          title="إدارة الأسعار والتكلفة"
                        >
                          <DollarSign size={14} /> <span>الأسعار</span>
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button type="button" onClick={() => openEdit(item)} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }} title="تعديل"><Edit2 size={15} /></button>
                        <button type="button" onClick={() => setDeletingItem(item)} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)' }} title="حذف"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>إجمالي البنود: {total}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
            <span style={{ padding: '0.35rem 0.5rem' }}>صفحة {page}</span>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={page * limit >= total} onClick={() => setPage(page + 1)}>التالي</button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 100 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '560px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={22} color="#60a5fa" />
                {editingItem ? 'تعديل بند العمل' : 'إضافة بند عمل جديد'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                  <label className="form-label">اسم البند *</label>
                  <input type="text" required className="input-field" placeholder="مثال: بياض محارة داخلي" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">كود البند</label>
                  <input type="text" className="input-field" placeholder="WI-001" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">الفئة / القسم</label>
                  <select className="input-field" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                    <option value="">اختر القسم...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">المستهدف اليومي</label>
                  <input type="number" min="0" className="input-field" value={formDefaultDailyTarget} onChange={(e) => setFormDefaultDailyTarget(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">سعر الوحدة (ريال)</label>
                  <input type="number" min="0" step="0.01" className="input-field" value={formDefaultUnitRate} onChange={(e) => setFormDefaultUnitRate(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">الفرع (اختياري)</label>
                  <select className="input-field" value={formBranchId} onChange={(e) => setFormBranchId(e.target.value)}>
                    <option value="">بدون تحديد فرع</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                  <label className="form-label">وصف البند</label>
                  <textarea rows={2} className="input-field" style={{ resize: 'vertical' }} placeholder="تفاصيل..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setFormIsActive(!formIsActive)}>
                  <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  <label style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#ffffff' }}>بند نشط ومتاح للاستخدام</label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={isSaving}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>{editingItem ? 'حفظ التعديلات' : 'إنشاء البند'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 100 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171', marginBottom: '1rem' }}>
              <Trash2 size={24} />
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>تأكيد حذف بند العمل</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              هل أنت متأكد من حذف البند <strong style={{ color: '#ffffff' }}>"{deletingItem.name}"</strong>؟
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setDeletingItem(null)} className="btn btn-secondary" disabled={isDeleting}>إلغاء</button>
              <button type="button" onClick={handleConfirmDelete} className="btn btn-primary" style={{ background: '#dc2626' }} disabled={isDeleting}>
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stages Modal */}
      <StagesManagementModal
        isOpen={!!stagesItem}
        onClose={() => setStagesItem(null)}
        workItem={stagesItem}
      />

      {/* Prices Modal */}
      <PricesManagementModal
        isOpen={!!pricesItem}
        onClose={() => setPricesItem(null)}
        workItem={pricesItem}
      />
    </div>
  );
};
