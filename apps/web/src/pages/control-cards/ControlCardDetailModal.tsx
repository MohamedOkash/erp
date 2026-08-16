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
      setError(err?.message || 'تعذر تحميل بطاقة التحكم');
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
        title={card?.item.name || 'بطاقة التحكم الحية'}
        subtitle={`الكود: ${card?.item.code || '—'} | الوحدة: ${card?.item.unit || 'م²'}`}
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
              <Edit2 size={13} /> <span>تعديل المراحل</span>
            </button>
            <button
              type="button"
              onClick={() => setPricesModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
            >
              <DollarSign size={13} /> <span>تعديل الأسعار</span>
            </button>
          </div>
        }
        footer={
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.45rem 1.5rem', fontSize: '0.85rem' }}>
            إغلاق البطاقة
          </button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto', color: '#60a5fa' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>جاري تحميل حسابات البطاقة الحية...</p>
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
                <Layers size={16} /> <span>1. جدول تفصيل مراحل التنفيذ والأوزان النسبية</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.9)', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>مرحلة التنفيذ</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>الوزن النسبي (%)</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>الإنتاجية القياسية للفرقة</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>الإنتاجية الفعلية المحسوبة</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>تكوين الفريق</th>
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
                          {stg.standardProductivity} {card.item.unit}/يوم
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#34d399', fontWeight: 700 }}>
                          {stg.actualTotalProductivity} {card.item.unit}/يوم
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {stg.crew.skilled} فني + {stg.crew.unskilled} مساعد
                        </td>
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
                  <Clock size={16} /> <span>2. معدلات الإنتاجية المستهدفة</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>مستهدف اليوم بالكامل:</span>
                    <strong style={{ color: '#ffffff', fontSize: '1rem' }}>{card.totals.perDay} {card.item.unit}/يوم</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>معدل إنتاج الفرد بالساعة:</span>
                    <strong style={{ color: '#93c5fd', fontSize: '1rem' }}>{card.totals.perHour} {card.item.unit}/ساعة</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    * الحساب: {card.totals.perDay} ÷ (أفراد الفريق × 8 ساعات عمل)
                  </div>
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
                  <Users size={16} /> <span>3. تكلفة عمالة الفريق (SAR)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>يومية الفني + المساعد:</span>
                    <span>{card.labor.skilledDaily} + {card.labor.unskilledDaily} ريال</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>يومية الفريق الكامل:</span>
                    <strong style={{ color: '#fbbf24', fontSize: '1rem' }}>{card.labor.crewDailyCost} ريال/يوم</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>تكلفة عمالة الوحدة ({card.item.unit}):</span>
                    <strong style={{ color: '#f59e0b', fontSize: '1.05rem' }}>{card.labor.laborCostPerUnit} ريال/{card.item.unit}</strong>
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
                  <DollarSign size={16} /> <span>4. التعاقد والهامش المباشر</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>سعر بيع العقد للوحدة:</span>
                    <strong style={{ color: '#34d399', fontSize: '1rem' }}>{card.contract.price} ريال/{card.item.unit}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>تكلفة المواد المقدرة:</span>
                    <span>{card.contract.materialPrice} ريال/{card.item.unit}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>الهامش الصافي للوحدة:</span>
                    <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{card.contract.marginPerUnit} ريال/{card.item.unit}</strong>
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
                  <span>5. مؤشرات الموقع الحية والمتابعة التراكمية (Live Tracking Engine)</span>
                </div>
                {projectId && (
                  <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                    مشروع محدد
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>كمية المقايسة الكلية</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                    {card.live.boqQuantity.toLocaleString()} {card.item.unit}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>المنجز الموزون المعتمد</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                    {card.live.weightedDone.toLocaleString()} {card.item.unit}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                    ({card.live.progressPct}% إنجاز)
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>متوسط التنفيذ اليومي (آخر 7 أيام)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>
                    {card.live.actualDailyAvg} {card.item.unit}/يوم
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: card.live.variancePct >= 0 ? '#34d399' : '#f87171' }}>
                    {card.live.variancePct >= 0 ? `+${card.live.variancePct}% مقابل القياسي` : `${card.live.variancePct}% عجز`}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>الأيام المتبقية لإنهاء البند</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>
                    {card.live.remainingDays} يوم عمل
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>بالمعدل الميداني الحالي</div>
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
