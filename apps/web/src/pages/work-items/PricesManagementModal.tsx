import { useI18n } from '../../i18n/I18nContext';
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
  const { t } = useI18n();
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
      setError(err?.response?.data?.message || t('auto.تعذر_تحميل_بيانات_الأسعار_8a0253'));
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
        setSuccessMsg(t('auto.تم_تحديث_السعر_بنجاح_69b675'));
      } else {
        await workItemPricesApi.create(workItem.id, payload);
        setSuccessMsg(t('auto.تم_حفظ_وتوثيق_السعر_بنجاح_1a366e'));
      }
      resetForm();
      await loadData();
      onPricesUpdated?.();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auto.تعذر_حفظ_السعر_والتكلفة_1eb424'));
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
          {t('auto.إغلاق_59834d')}</button>
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
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingPriceId ? (
                <>
                  <Edit2 size={16} color="#34d399" />
                  <span>{t('auto.تعديل_السعر_المحدد_71f6c3')}</span>
                </>
              ) : (
                <>
                  <Plus size={16} color="#34d399" />
                  <span>{t('auto.تحديد_أو_تحديث_أسعار_البند_5ea0cd')}</span>
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
                <X size={14} /> {t('auto.إلغاء_التعديل_512208')}</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <Building size={14} /> <span>{t('auto.نطاق_الفرع_529d89')}</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="input-field"
              >
                <option value="">{t('auto.جميع_الفروع_السعر_القياسي_العا_bf9229')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <DollarSign size={14} color="#34d399" /> <span>{t('auto.سعر_العقد_ريال_ec8ff7')}</span>
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
              <label className="form-label">{t('auto.سعر_المواد_المعتمد_ريال_304308')}</label>
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
              <label className="form-label">{t('auto.يومية_الفني_المعتمدة_ريال_يوم_4fa4a6')}</label>
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
              <label className="form-label">{t('auto.يومية_المساعد_المعتمدة_ريال_يو_3142cb')}</label>
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
                <Calendar size={14} /> <span>{t('auto.تاريخ_بدء_السريان_69314c')}</span>
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
                {t('auto.إلغاء_5987b3')}</button>
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
                  <span>{t('auto.جاري_الحفظ_6d43e6')}</span>
                </>
              ) : editingPriceId ? (
                <>
                  <Check size={14} />
                  <span>{t('auto.تحديث_السعر_6ce267')}</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>{t('auto.حفظ_وتوثيق_السعر_66bf09')}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Prices History Cards */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {t('auto.سجل_الأسعار_المعتمدة_2e42a6')}{prices.length})
            </h4>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <div>{t('auto.جاري_تحميل_الأسعار_184565')}</div>
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
              {t('auto.لا_توجد_أسعار_مخصصة_لهذا_البند_fe73e7')}{workItem.default_unit_rate || 0} {t('auto.ريال_13cb7f')}</div>
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
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                          {p.branch_name ? `فرع: ${p.branch_name}` : t('auto.السعر_القياسي_العام_لكل_الفروع_1822cd')}
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
                          <span>{t('auto.يسري_من_26dd5f')}{formattedDate}</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>{t('auto.المواد_7f2006')}<strong style={{ color: 'var(--text-heading)' }}>{p.material_price} {t('auto.ريال_2e8e0f')}</strong></span>
                        <span>{t('auto.أجر_الفني_2a2767')}<strong style={{ color: '#fbbf24' }}>{p.labor_rate_skilled} {t('auto.ريال_2e8e0f')}</strong></span>
                        <span>{t('auto.أجر_المساعد_381b74')}<strong style={{ color: '#fbbf24' }}>{p.labor_rate_unskilled} {t('auto.ريال_2e8e0f')}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace, Cairo' }}>
                          {p.contract_price} {t('auto.ريال_2e8e0f')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                          {t('auto.سعر_العقد_5ddfd1')}</div>
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
                        title={t('auto.تعديل_السعر_acf7ec')}
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
