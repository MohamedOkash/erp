import React, { useState, useEffect } from 'react';
import type { WorkItemPrice } from '../../api/work-categories.api';
import { workItemPricesApi } from '../../api/work-categories.api';
import type { Branch } from '../../api/branches.api';
import { branchesApi } from '../../api/branches.api';
import { Modal } from '../../components/Modal';
import { WheelDatePicker } from '../../components/WheelPicker';
import {
  DollarSign,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Calendar,
  Check,
  X,
} from 'lucide-react';

interface PricesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: {
    id: string;
    name: string;
    code?: string | null;
    default_unit_rate?: number | null;
    defaultDailyTarget?: number | null;
  } | null;
  onPricesUpdated?: () => void;
}

export const PricesManagementModal: React.FC<PricesManagementModalProps> = ({
  isOpen,
  onClose,
  workItem,
  onPricesUpdated,
}) => {
  const [prices, setPrices] = useState<WorkItemPrice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string>('');
  const [contractPrice, setContractPrice] = useState<number>(workItem?.default_unit_rate || 100);
  const [materialPrice, setMaterialPrice] = useState<number>(0);
  const [laborSkilled, setLaborSkilled] = useState<number>(224);
  const [laborUnskilled, setLaborUnskilled] = useState<number>(208);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && workItem) {
      loadData();
      resetForm();
    }
  }, [isOpen, workItem]);

  const resetForm = () => {
    setEditingPriceId(null);
    setBranchId('');
    setContractPrice(workItem?.default_unit_rate || 100);
    setMaterialPrice(0);
    setLaborSkilled(224);
    setLaborUnskilled(208);
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  const loadData = async () => {
    if (!workItem) return;
    setLoading(true);
    setError(null);
    try {
      const [pricesData, branchesRes] = await Promise.all([
        workItemPricesApi.listByItem(workItem.id),
        branchesApi.list(),
      ]);
      setPrices(pricesData || []);
      setBranches(branchesRes.data || []);
      if (workItem.default_unit_rate) {
        setContractPrice(workItem.default_unit_rate);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذر تحميل بيانات الأسعار');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (p: WorkItemPrice) => {
    setEditingPriceId(p.id);
    setBranchId(p.branch_id || '');
    setContractPrice(Number(p.contract_price) || 0);
    setMaterialPrice(Number(p.material_price) || 0);
    setLaborSkilled(Number(p.labor_rate_skilled) || 224);
    setLaborUnskilled(Number(p.labor_rate_unskilled) || 208);
    setEffectiveFrom(p.effective_from ? p.effective_from.split('T')[0] : new Date().toISOString().split('T')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSubmitPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workItem) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      branchId: branchId || undefined,
      contractPrice: Number(contractPrice),
      materialPrice: Number(materialPrice) || 0,
      laborRateSkilled: Number(laborSkilled) || 224,
      laborRateUnskilled: Number(laborUnskilled) || 208,
      effectiveFrom: effectiveFrom || undefined,
    };

    try {
      if (editingPriceId) {
        await workItemPricesApi.update(editingPriceId, payload);
        setSuccessMsg('تم تحديث السعر بنجاح');
      } else {
        await workItemPricesApi.create(workItem.id, payload);
        setSuccessMsg('تم حفظ وتوثيق السعر بنجاح');
      }
      resetForm();
      await loadData();
      onPricesUpdated?.();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذر حفظ السعر والتكلفة');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !workItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إدارة الأسعار والتكلفة: ${workItem.name}`}
      subtitle={`كود البند: ${workItem.code || '—'}`}
      icon={<DollarSign size={22} color="#34d399" />}
      maxWidth="2xl"
      footer={
        <button
          onClick={onClose}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 1.5rem', fontSize: '0.85rem' }}
        >
          إغلاق
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Notifications */}
        {error && (
          <div
            className="animate-fade-in"
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#f87171',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="animate-fade-in"
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#34d399',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Add / Edit Price Form Card */}
        <form
          onSubmit={handleSubmitPrice}
          className="glass-card"
          style={{
            padding: '1.25rem',
            background: editingPriceId ? 'rgba(16, 185, 129, 0.06)' : 'rgba(15, 23, 42, 0.5)',
            border: editingPriceId ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingPriceId ? (
                <>
                  <Edit2 size={16} color="#34d399" />
                  <span>تعديل السعر المحدد</span>
                </>
              ) : (
                <>
                  <Plus size={16} color="#34d399" />
                  <span>تحديد أو تحديث أسعار البند</span>
                </>
              )}
            </h4>
            {editingPriceId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <X size={14} /> إلغاء التعديل
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Building size={14} /> <span>نطاق الفرع</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="input-field"
              >
                <option value="">جميع الفروع (السعر القياسي العام)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <DollarSign size={14} color="#34d399" /> <span>سعر العقد (ريال) *</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="input-field"
                value={contractPrice}
                onChange={(e) => setContractPrice(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">سعر المواد المعتمد (ريال)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={materialPrice}
                onChange={(e) => setMaterialPrice(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">يومية الفني المعتمدة (ريال/يوم)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={laborSkilled}
                onChange={(e) => setLaborSkilled(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">يومية المساعد المعتمدة (ريال/يوم)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={laborUnskilled}
                onChange={(e) => setLaborUnskilled(Number(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Calendar size={14} /> <span>تاريخ بدء السريان *</span>
              </label>
              <WheelDatePicker
                required
                value={effectiveFrom}
                onChange={(val) => setEffectiveFrom(val)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', gap: '0.5rem' }}>
            {editingPriceId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 1.25rem',
                gap: '0.4rem',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                borderColor: '#10b981',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : editingPriceId ? (
                <>
                  <Check size={14} />
                  <span>تحديث السعر</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>حفظ وتوثيق السعر</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Prices History Cards */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              سجل الأسعار المعتمدة ({prices.length})
            </h4>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <div>جاري تحميل الأسعار...</div>
            </div>
          ) : prices.length === 0 ? (
            <div
              className="glass-card"
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              لا توجد أسعار مخصصة لهذا البند بعد. يتم استخدام السعر الافتراضي ({workItem.default_unit_rate || 0} ريال).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {prices.map((p) => {
                const isCurrentEditing = editingPriceId === p.id;
                const formattedDate = p.effective_from ? p.effective_from.split('T')[0] : '—';

                return (
                  <div
                    key={p.id}
                    className="glass-card"
                    style={{
                      padding: '0.9rem 1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isCurrentEditing ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                      border: isCurrentEditing ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                          {p.branch_name ? `فرع: ${p.branch_name}` : 'السعر القياسي العام (لكل الفروع)'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Calendar size={12} />
                          <span>يسري من: {formattedDate}</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>المواد: <strong style={{ color: '#ffffff' }}>{p.material_price} ريال</strong></span>
                        <span>أجر الفني: <strong style={{ color: '#fbbf24' }}>{p.labor_rate_skilled} ريال</strong></span>
                        <span>أجر المساعد: <strong style={{ color: '#fbbf24' }}>{p.labor_rate_unskilled} ريال</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace, Cairo' }}>
                          {p.contract_price} ريال
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                          سعر العقد
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        style={{
                          padding: '0.45rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#34d399',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="تعديل السعر"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
