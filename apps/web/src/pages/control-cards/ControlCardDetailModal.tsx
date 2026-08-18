import { useI18n } from '../../i18n/I18nContext';
import React, { useState, useEffect } from 'react';
import { controlCardsApi } from '../../api/control-cards.api';
import type { ControlCardDetail } from '../../api/control-cards.api';
import { StagesManagementModal } from '../work-items/StagesManagementModal';
import { PricesManagementModal } from '../work-items/PricesManagementModal';
import { Modal } from '../../components/Modal';
import {
  Loader2,
  FileSpreadsheet,
  Layers,
  Users,
  DollarSign,
  Clock,
  Edit2,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface ControlCardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItemId: string | null;
  projectId?: string;
}

export const ControlCardDetailModal: React.FC<ControlCardDetailModalProps> = ({
  isOpen,
  onClose,
  workItemId,
  projectId,
}) => {
  const { t } = useI18n();
  const [card, setCard] = useState<ControlCardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Modals
  const [stagesModalOpen, setStagesModalOpen] = useState(false);
  const [pricesModalOpen, setPricesModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && workItemId) {
      loadCard();
    }
  }, [isOpen, workItemId, projectId]);

  const loadCard = async () => {
    if (!workItemId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await controlCardsApi.getDetail(workItemId, projectId);
      setCard(data);
    } catch (err: any) {
      setError(err?.message || t('auto.تعذر_تحميل_بطاقة_التحكم_3d1b67'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={card?.item.name || t('auto.بطاقة_التحكم_الحية_1dc70d')}
        subtitle={`الكود: ${card?.item.code || '—'} | الوحدة: ${card?.item.unit || t('auto.م_c30d')}`}
        icon={<FileSpreadsheet size={22} color="#60a5fa" />}
        maxWidth="3xl"
        headerActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setStagesModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#818cf8', borderColor: 'rgba(129, 140, 248, 0.3)' }}
            >
              <Edit2 size={13} /> <span>{t('auto.تعديل_المراحل_6a1a6e')}</span>
            </button>
            <button
              type="button"
              onClick={() => setPricesModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
            >
              <DollarSign size={13} /> <span>{t('auto.تعديل_الأسعار_6bf862')}</span>
            </button>
          </div>
        }
        footer={
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.45rem 1.5rem', fontSize: '0.85rem' }}>
            {t('auto.إغلاق_البطاقة_645e82')}</button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{t('auto.جاري_تحميل_حسابات_البطاقة_الحي_1261c3')}</p>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '1rem',
              background: 'var(--status-danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : card ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* SECTION 1: STAGES BREAKDOWN */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#93c5fd',
                }}
              >
                <Layers size={16} /> <span>{t('auto.1_جدول_تفصيل_مراحل_التنفيذ_وال_2152bc')}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>{t('auto.مرحلة_التنفيذ_802356')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.الوزن_النسبي_71981f')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.الإنتاجية_القياسية_للفرقة_1882b9')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.الإنتاجية_الفعلية_المحسوبة_5f9e11')}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{t('auto.تكوين_الفريق_34fbfc')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.stages.map((stg, idx) => (
                      <tr key={stg.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#ffffff' }}>
                          <span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{idx + 1}.</span>
                          {stg.name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                            {Math.round(stg.percentage * 100)}%
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#93c5fd', fontWeight: 600 }}>
                          {stg.standardProductivity} {card.item.unit}{t('auto.يوم_2dc238')}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#34d399', fontWeight: 700 }}>
                          {stg.actualTotalProductivity} {card.item.unit}{t('auto.يوم_2dc238')}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {stg.crew.skilled} {t('auto.فني_5b12a9')}{stg.crew.unskilled} {t('auto.مساعد_5b42a4')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTIONS 2, 3, 4: FINANCIALS & PRODUCTIVITY GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Card 1: الإجماليات ومعدلات الإنتاج */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#60a5fa', fontWeight: 700 }}>
                  <Clock size={16} /> <span>{t('auto.2_معدلات_الإنتاجية_المستهدفة_18e431')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auto.مستهدف_اليوم_بالكامل_127458')}</span>
                    <strong style={{ color: '#ffffff', fontSize: '1rem' }}>{card.totals.perDay} {card.item.unit}{t('auto.يوم_2dc238')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auto.معدل_إنتاج_الفرد_بالساعة_1db493')}</span>
                    <strong style={{ color: '#93c5fd', fontSize: '1rem' }}>{card.totals.perHour} {card.item.unit}{t('auto.ساعة_57f991')}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    {t('auto.الحساب_311bf4')}{card.totals.perDay} {t('auto.أفراد_الفريق_8_ساعات_عمل_2ac4cd')}</div>
                </div>
              </div>

              {/* Card 2: تكلفة العمالة وأجور الفريق */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#fbbf24', fontWeight: 700 }}>
                  <Users size={16} /> <span>{t('auto.3_تكلفة_عمالة_الفريق_SAR_168c36')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auto.يومية_الفني_المساعد_6739d3')}</span>
                    <span>{card.labor.skilledDaily} + {card.labor.unskilledDaily} {t('auto.ريال_2e8e0f')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auto.يومية_الفريق_الكامل_46acd0')}</span>
                    <strong style={{ color: '#fbbf24', fontSize: '1rem' }}>{card.labor.crewDailyCost} {t('auto.ريال_يوم_4ecec7')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auto.تكلفة_عمالة_الوحدة_6bfade')}{card.item.unit}):</span>
                    <strong style={{ color: '#f59e0b', fontSize: '1.05rem' }}>{card.labor.laborCostPerUnit} {t('auto.ريال_5a333d')}{card.item.unit}</strong>
                  </div>
                </div>
              </div>

              {/* Card 3: العقد والهامش الربحي */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#34d399', fontWeight: 700 }}>
                  <DollarSign size={16} /> <span>{t('auto.4_التعاقد_والهامش_المباشر_c7dbd2')}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auto.سعر_بيع_العقد_للوحدة_1ddc0b')}</span>
                    <strong style={{ color: '#34d399', fontSize: '1rem' }}>{card.contract.price} {t('auto.ريال_5a333d')}{card.item.unit}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auto.تكلفة_المواد_المقدرة_6bd9b1')}</span>
                    <span>{card.contract.materialPrice} {t('auto.ريال_5a333d')}{card.item.unit}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auto.الهامش_الصافي_للوحدة_f8fc67')}</span>
                    <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{card.contract.marginPerUnit} {t('auto.ريال_5a333d')}{card.item.unit}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5: LIVE SITE ENGINE (مؤشرات الموقع الحية) */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(17, 24, 39, 0.8) 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(59, 130, 246, 0.5)',
                padding: '1.5rem',
                boxShadow: '0 8px 32px rgba(37, 99, 235, 0.2)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  paddingBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '1rem', color: '#60a5fa' }}>
                  <Activity size={20} className="animate-pulse" />
                  <span>{t('auto.5_مؤشرات_الموقع_الحية_والمتابع_10336b')}</span>
                </div>
                {projectId && (
                  <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                    {t('auto.مشروع_محدد_5b4a3c')}</span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>{t('auto.كمية_المقايسة_الكلية_63b1a4')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                    {card.live.boqQuantity.toLocaleString()} {card.item.unit}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>{t('auto.المنجز_الموزون_المعتمد_5cfa10')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                    {card.live.weightedDone.toLocaleString()} {card.item.unit}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                    ({card.live.progressPct}{t('auto.إنجاز_77d773')}</div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>{t('auto.متوسط_التنفيذ_اليومي_آخر_7_أيا_592fcd')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>
                    {card.live.actualDailyAvg} {card.item.unit}{t('auto.يوم_2dc238')}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: card.live.variancePct >= 0 ? '#34d399' : '#f87171' }}>
                    {card.live.variancePct >= 0 ? `+${card.live.variancePct}% مقابل القياسي` : `${card.live.variancePct}% عجز`}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>{t('auto.الأيام_المتبقية_لإنهاء_البند_658742')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
                    {card.live.remainingDays} {t('auto.يوم_عمل_3f9ea6')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('auto.بالمعدل_الميداني_الحالي_3db13d')}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit Stages Modal */}
      <StagesManagementModal
        isOpen={stagesModalOpen}
        onClose={() => {
          setStagesModalOpen(false);
          loadCard();
        }}
        workItem={card?.item ? { id: card.item.id, name: card.item.name, code: card.item.code } : null}
      />

      {/* Edit Prices Modal */}
      <PricesManagementModal
        isOpen={pricesModalOpen}
        onClose={() => {
          setPricesModalOpen(false);
          loadCard();
        }}
        workItem={card?.item ? { id: card.item.id, name: card.item.name, code: card.item.code, default_unit_rate: card.contract.price } : null}
      />
    </>
  );
};
