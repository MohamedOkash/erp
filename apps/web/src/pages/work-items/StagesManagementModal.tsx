import React, { useState, useEffect } from 'react';
import type { WorkItemStage } from '../../api/work-categories.api';
import { workItemStagesApi } from '../../api/work-categories.api';
import { Modal } from '../../components/Modal';
import { Layers } from 'lucide-react';

interface StagesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: { id: string; name: string; code?: string | null } | null;
}

export const StagesManagementModal: React.FC<StagesManagementModalProps> = ({
  isOpen,
  onClose,
  workItem,
}) => {
  const [stages, setStages] = useState<WorkItemStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New stage form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [percentage, setPercentage] = useState<number>(50);
  const [standardProductivity, setStandardProductivity] = useState<number>(20);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && workItem) {
      loadStages();
    }
  }, [isOpen, workItem]);

  const loadStages = async () => {
    if (!workItem) return;
    setLoading(true);
    setError(null);
    try {
      const data = await workItemStagesApi.listByItem(workItem.id);
      setStages(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذر تحميل مراحل البند');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workItem || !name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await workItemStagesApi.create(workItem.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        percentage: Number(percentage) / 100,
        standard_productivity: Number(standardProductivity) || 0,
      });
      setName('');
      setCode('');
      setPercentage(50);
      setStandardProductivity(20);
      loadStages();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذر إضافة المرحلة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المرحلة؟')) return;
    try {
      await workItemStagesApi.delete(stageId);
      loadStages();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذر حذف المرحلة');
    }
  };

  if (!isOpen || !workItem) return null;

  const totalPercentage = stages.reduce(
    (acc, s) => acc + Math.round(Number(s.percentage) * 100),
    0,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`مراحل البند: ${workItem.name}`}
      subtitle={`كود البند: ${workItem.code || '—'}`}
      icon={<Layers size={22} />}
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

          {/* Stages Summary Bar */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium">مجموع نسب المراحل:</span>
              <span className={`font-bold ${totalPercentage === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalPercentage}% {totalPercentage === 100 ? '✓ (مكتمل ومثالي)' : '(يجب أن يساوي 100%)'}
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden flex">
              {stages.map((stg, i) => {
                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500', 'bg-purple-500'];
                const p = Math.round(Number(stg.percentage) * 100);
                return (
                  <div
                    key={stg.id}
                    className={`${colors[i % colors.length]} h-full transition-all`}
                    style={{ width: `${p}%` }}
                    title={`${stg.name}: ${p}%`}
                  />
                );
              })}
            </div>
          </div>

          {/* Add Stage Form */}
          <form onSubmit={handleCreateStage} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">إضافة مرحلة جديدة للبند</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">اسم المرحلة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مرحلة الشاسيه والهيكل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">كود المرحلة (اختياري)</label>
                <input
                  type="text"
                  placeholder="STG-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">الوزن النسبي (%) *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-slate-400 text-xs font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">معدل الإنتاجية القياسي اليومي</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={standardProductivity}
                  onChange={(e) => setStandardProductivity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-indigo-600/30"
              >
                {submitting ? 'جاري الإضافة...' : '+ إضافة المرحلة'}
              </button>
            </div>
          </form>

          {/* Stages List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">المراحل الحالية ({stages.length})</h4>
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">جاري تحميل المراحل...</div>
            ) : stages.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
                لا توجد مراحل مسجلة لهذا البند بعد. أضف المرحلة الأولى أعلاه.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
                {stages.map((stg, idx) => (
                  <div key={stg.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-white">{stg.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                          {stg.code && <span>الكود: {stg.code}</span>}
                          <span>الإنتاجية اليومية: <strong className="text-indigo-400">{stg.standard_productivity}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20">
                        {Math.round(Number(stg.percentage) * 100)}%
                      </span>
                      <button
                        onClick={() => handleDeleteStage(stg.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs transition-colors p-1"
                        title="حذف المرحلة"
                      >
                        🗑
                      </button>
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
