import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect } from 'react';
import type { WorkItemStage } from '../../api/work-categories.api';
import { workItemStagesApi } from '../../api/work-categories.api';
import { Modal } from '../../components/Modal';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Percent,
  X,
  Check,
} from 'lucide-react';

interface StagesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: { id: string; name: string; code?: string | null; default_daily_target?: number | null } | null;
  onStagesUpdated?: () => void;
}

export const StagesManagementModal: React.FC<StagesManagementModalProps> = ({
  isOpen,
  onClose,
  workItem,
  onStagesUpdated,
}) => {
  const { t } = useI18n();
  const [stages, setStages] = useState<WorkItemStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [percentage, setPercentage] = useState<number>(25);
  const [standardProductivity, setStandardProductivity] = useState<number>(workItem?.default_daily_target || 20);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && workItem) {
      loadStages();
      resetForm();
    }
  }, [isOpen, workItem]);

  const resetForm = () => {
    setEditingStageId(null);
    setName('');
    setCode('');
    setPercentage(25);
    setStandardProductivity(workItem?.default_daily_target || 20);
    setError(null);
  };

  const loadStages = async () => {
    if (!workItem) return;
    setLoading(true);
    setError(null);
    try {
      const data = await workItemStagesApi.listByItem(workItem.id);
      setStages(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auto.تعذر_تحميل_مراحل_البند_4d6ad6'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (stage: WorkItemStage) => {
    setEditingStageId(stage.id);
    setName(stage.name);
    setCode(stage.code || '');
    setPercentage(Math.round(Number(stage.percentage) * 100));
    setStandardProductivity(Number(stage.standard_productivity) || 20);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSubmitStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workItem || !name.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      percentage: Number(percentage) / 100,
      standardProductivity: Number(standardProductivity) || 0,
    };

    try {
      if (editingStageId) {
        await workItemStagesApi.update(editingStageId, payload);
        setSuccessMsg(t('auto.تم_تحديث_بيانات_المرحلة_بنجاح_1c08ec'));
      } else {
        await workItemStagesApi.create(workItem.id, {
          ...payload,
          sortOrder: stages.length + 1,
        });
        setSuccessMsg(t('auto.تمت_إضافة_المرحلة_الجديدة_بنجا_5fe2aa'));
      }
      resetForm();
      await loadStages();
      onStagesUpdated?.();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auto.تعذر_حفظ_المرحلة_6288c5'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStage = async (stageId: string, stageName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مرحلة "${stageName}"؟`)) return;
    try {
      await workItemStagesApi.delete(stageId);
      await loadStages();
      onStagesUpdated?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auto.تعذر_حذف_المرحلة_650161'));
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const currentStage = stages[index];
    const targetStage = stages[targetIndex];
    if (!currentStage || !targetStage) return;

    try {
      // Swap sort_orders
      const currentOrder = currentStage.sort_order || index + 1;
      const targetOrder = targetStage.sort_order || targetIndex + 1;

      await Promise.all([
        workItemStagesApi.update(currentStage.id, { sortOrder: targetOrder }),
        workItemStagesApi.update(targetStage.id, { sortOrder: currentOrder }),
      ]);

      await loadStages();
      onStagesUpdated?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auto.تعذر_إعادة_ترتيب_المراحل_5d74e1'));
    }
  };

  if (!isOpen || !workItem) return null;

  const totalPercentage = stages.reduce(
    (acc, s) => acc + Math.round(Number(s.percentage) * 100),
    0,
  );

  const getStatusColor = () => {
    if (totalPercentage === 100) return '#10b981'; // Emerald
    if (totalPercentage > 100) return '#ef4444'; // Rose
    return '#f59e0b'; // Amber
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إدارة مراحل البند: ${workItem.name}`}
      subtitle={`كود البند: ${workItem.code || '—'}`}
      icon={<Layers size={22} color="var(--accent-primary)" />}
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

        {/* Weights Summary Strip Card */}
        <div
          className="glass-card"
          style={{
            padding: '1.1rem',
            border: `1px solid ${totalPercentage === 100 ? 'rgba(16, 185, 129, 0.4)' : totalPercentage > 100 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Percent size={16} color={getStatusColor()} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>{t('auto.مجموع_نسب_المراحل_التنفيذية_7a1b24')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: getStatusColor(),
                  fontFamily: 'monospace, Cairo',
                }}
              >
                {totalPercentage}%
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: `${getStatusColor()}20`,
                  color: getStatusColor(),
                  border: `1px solid ${getStatusColor()}40`,
                }}
              >
                {totalPercentage === 100
                  ? t('auto.مكتمل_ومثالي_100_9b5080')
                  : totalPercentage > 100
                  ? t('auto.تجاوز_100_تجاوزت_الحد_433e53')
                  : `⚠️ متبقي ${100 - totalPercentage}% للوصول إلى 100%`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '10px',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '999px',
              overflow: 'hidden',
              display: 'flex',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            {stages.map((stg, i) => {
              const colors = [
                'linear-gradient(90deg, #3b82f6, #60a5fa)',
                'linear-gradient(90deg, #10b981, #34d399)',
                'linear-gradient(90deg, #f59e0b, #fbbf24)',
                'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                'linear-gradient(90deg, #06b6d4, #22d3ee)',
                'linear-gradient(90deg, #ec4899, #f472b6)',
              ];
              const p = Math.round(Number(stg.percentage) * 100);
              return (
                <div
                  key={stg.id}
                  style={{
                    width: `${p}%`,
                    background: colors[i % colors.length],
                    height: '100%',
                    transition: 'width 0.3s ease',
                  }}
                  title={`${stg.name}: ${p}%`}
                />
              );
            })}
          </div>
        </div>

        {/* Add / Edit Form Card */}
        <form
          onSubmit={handleSubmitStage}
          className="glass-card"
          style={{
            padding: '1.25rem',
            background: editingStageId ? 'rgba(59, 130, 246, 0.06)' : 'rgba(15, 23, 42, 0.5)',
            border: editingStageId ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingStageId ? (
                <>
                  <Edit2 size={16} color="#60a5fa" />
                  <span>{t('auto.تعديل_المرحلة_الحالية_63d671')}</span>
                </>
              ) : (
                <>
                  <Plus size={16} color="var(--accent-primary)" />
                  <span>{t('auto.إضافة_مرحلة_تنفيذية_جديدة_693880')}</span>
                </>
              )}
            </h4>
            {editingStageId && (
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
              <label className="form-label">{t('auto.اسم_المرحلة_التنفيذية_25cd5a')}</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder={t('auto.مثال_البؤج_والأوتار_الطرطشة_ال_1dec57')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.كود_المرحلة_اختياري_76b7c0')}</label>
              <input
                type="text"
                className="input-field"
                placeholder="STG-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.الوزن_النسبي_للمرحلة_26e671')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  className="input-field"
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  style={{ paddingLeft: '2rem' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  %
                </span>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('auto.الإنتاجية_القياسية_اليومية_aa02ba')}</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="input-field"
                placeholder={t('auto.مثال_20_66d4a6')}
                value={standardProductivity}
                onChange={(e) => setStandardProductivity(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.5rem' }}>
            {editingStageId && (
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
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t('auto.جاري_الحفظ_6d43e6')}</span>
                </>
              ) : editingStageId ? (
                <>
                  <Check size={14} />
                  <span>{t('auto.تحديث_المرحلة_411ced')}</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>{t('auto.إضافة_المرحلة_ab0ab9')}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Stages List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {t('auto.المراحل_المسجلة_6984bc')}{stages.length})
            </h4>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <div>{t('auto.جاري_تحميل_المراحل_5c06d9')}</div>
            </div>
          ) : stages.length === 0 ? (
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
              {t('auto.لا_توجد_مراحل_مسجلة_لهذا_البند_3ab97e')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stages.map((stg, idx) => {
                const isCurrentEditing = editingStageId === stg.id;
                const p = Math.round(Number(stg.percentage) * 100);

                return (
                  <div
                    key={stg.id}
                    className="glass-card"
                    style={{
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isCurrentEditing ? 'rgba(59, 130, 246, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                      border: isCurrentEditing ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-subtle)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Left details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}
                      >
                        {idx + 1}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                          {stg.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {stg.code && (
                            <span style={{ fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {stg.code}
                            </span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <TrendingUp size={12} color="#60a5fa" />
                            <span>{t('auto.الإنتاجية_القياسية_705d56')}<strong style={{ color: '#ffffff' }}>{stg.standard_productivity}</strong></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right actions & weight badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '999px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#93c5fd',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          fontFamily: 'monospace, Cairo',
                        }}
                      >
                        {p}%
                      </span>

                      {/* Reorder Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStage(idx, 'up')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: idx === 0 ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-muted)',
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            padding: '2px',
                            lineHeight: 1,
                          }}
                          title={t('auto.تحريك_لأعلى_73756a')}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === stages.length - 1}
                          onClick={() => handleMoveStage(idx, 'down')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: idx === stages.length - 1 ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-muted)',
                            cursor: idx === stages.length - 1 ? 'not-allowed' : 'pointer',
                            padding: '2px',
                            lineHeight: 1,
                          }}
                          title={t('auto.تحريك_لأسفل_737581')}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(stg)}
                        style={{
                          padding: '0.4rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#93c5fd',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={t('auto.تعديل_المرحلة_6a1a55')}
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteStage(stg.id, stg.name)}
                        style={{
                          padding: '0.4rem',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={t('auto.حذف_المرحلة_343aa8')}
                      >
                        <Trash2 size={14} />
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
