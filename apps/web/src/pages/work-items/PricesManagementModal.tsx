import React, { useState, useEffect } from 'react';
import type { WorkItemPrice } from '../../api/work-categories.api';
import { workItemPricesApi } from '../../api/work-categories.api';
import type { Branch } from '../../api/branches.api';
import { branchesApi } from '../../api/branches.api';
import { Modal } from '../../components/Modal';
import { DollarSign } from 'lucide-react';

interface PricesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: { id: string; name: string; code?: string | null; default_unit_rate?: number | null; defaultDailyTarget?: number | null } | null;
}

export const PricesManagementModal: React.FC<PricesManagementModalProps> = ({
  isOpen,
  onClose,
  workItem,
}) => {
  const [prices, setPrices] = useState<WorkItemPrice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState<string>('');
  const [contractPrice, setContractPrice] = useState<number>(workItem?.default_unit_rate || 100);
  const [materialPrice, setMaterialPrice] = useState<number>(0);
  const [laborSkilled, setLaborSkilled] = useState<number>(224);
  const [laborUnskilled, setLaborUnskilled] = useState<number>(208);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && workItem) {
      loadData();
    }
  }, [isOpen, workItem]);

  const loadData = async () => {
    if (!workItem) return;
    setLoading(true);
    setError(null);
    try {
      const [pricesData, branchesRes] = await Promise.all([
        workItemPricesApi.listByItem(workItem.id),
        branchesApi.list(),
      ]);
      setPrices(pricesData);
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

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workItem) return;

    setSubmitting(true);
    setError(null);
    try {
      await workItemPricesApi.create(workItem.id, {
        branchId: branchId || undefined,
        contractPrice: Number(contractPrice),
        materialPrice: Number(materialPrice) || 0,
        laborRateSkilled: Number(laborSkilled) || 224,
        laborRateUnskilled: Number(laborUnskilled) || 208,
      });
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذر حفظ السعر');
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
      <div className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleCreatePrice} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">تحديد أو تحديث أسعار البند</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">الفرع (اتركه فارغاً للسعر العام)</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">جميع الفروع (السعر القياسي)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">سعر العقد (ريال) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={contractPrice}
                  onChange={(e) => setContractPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">سعر المواد المعتمد (ريال)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={materialPrice}
                  onChange={(e) => setMaterialPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">يومية الفني المعتمدة (ريال/يوم)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborSkilled}
                  onChange={(e) => setLaborSkilled(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">يومية المساعد المعتمدة (ريال/يوم)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborUnskilled}
                  onChange={(e) => setLaborUnskilled(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-emerald-600/30"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ السعر والتكلفة'}
              </button>
            </div>
          </form>

          {/* Current Prices List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">سجل الأسعار المسجلة</h4>
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">جاري تحميل الأسعار...</div>
            ) : prices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
                لا توجد أسعار مخصصة لهذا البند بعد. يتم استخدام السعر الافتراضي ({workItem.default_unit_rate || 0} ريال).
              </div>
            ) : (
              <div className="divide-y divide-slate-800 bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
                {prices.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {p.branch_name ? `فرع: ${p.branch_name}` : 'السعر القياسي العام (لكل الفروع)'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-4 mt-0.5">
                        <span>المواد: <strong className="text-slate-300">{p.material_price} ريال</strong></span>
                        <span>أجر الفني: <strong className="text-amber-400">{p.labor_rate_skilled} ريال</strong></span>
                        <span>أجر المساعد: <strong className="text-amber-400">{p.labor_rate_unskilled} ريال</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">{p.contract_price} ريال</div>
                      <div className="text-[10px] text-slate-500">سعر العقد</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
};
