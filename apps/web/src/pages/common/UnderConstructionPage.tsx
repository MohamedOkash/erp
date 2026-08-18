import { useI18n } from '../../i18n/I18nContext';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Construction,
  LayoutDashboard,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ModuleInfo {
  title: string;
  subtitle: string;
  description: string;
  backendStatus: string;
  features: string[];
}

export const UnderConstructionPage: React.FC = () => {
  const { t } = useI18n();

  const MODULE_DATA: Record<string, ModuleInfo> = {
  '/incentives': {
    title: t('auto.نظام_الحوافز_والمكافآت_والإنتا_197b65'),
    subtitle: 'Incentives & Performance Bonus Engine',
    description:
      t('auto.نظام_حساب_المكافآت_التلقائي_لل_3a50bd'),
    backendStatus: t('auto.جاهز_برمجيا_في_الـ_Backend_ومر_437d53'),
    features: [
      t('auto.حساب_البونص_التلقائي_لكل_متر_و_7007a8'),
      t('auto.صرف_حوافز_إنجاز_المراحل_الحرجة_50d446'),
      t('auto.تقارير_تفصيلية_لمكافآت_المشرفي_62822a'),
    ],
  },
  '/documents': {
    title: t('auto.المستندات_والأرشيف_السحابي_وال_61aa1b'),
    subtitle: 'Documents & Engineering Drawings Archive',
    description:
      t('auto.أرشيف_رقمي_منظم_لكافة_مخططات_ا_2a4efc'),
    backendStatus: t('auto.جاهز_برمجيا_في_الـ_Backend_مع__17fa5e'),
    features: [
      t('auto.أرشفة_مخططات_الـ_PDF_والتصميما_706644'),
      t('auto.إدارة_أذونات_ومحاضر_فحص_واستلا_2f203b'),
      t('auto.ربط_المستندات_ببند_الـ_BOQ_أو__9850e5'),
    ],
  },
  '/reports': {
    title: t('auto.مركز_التقارير_المتقدمة_والتحلي_623451'),
    subtitle: 'Advanced Analytics & Executive Reporting',
    description:
      t('auto.مركز_شامل_لاستخراج_التقارير_ال_65d10a'),
    backendStatus: t('auto.التقرير_اليومي_متاح_حاليا_وجار_64952a'),
    features: [
      t('auto.تقرير_الإنتاجية_والمقارنات_بين_1e01c2'),
      t('auto.تحليل_انحراف_التكاليف_والموازن_65cf73'),
      t('auto.تصدير_كشوفات_الإنجاز_لملفات_Ex_50cdb7'),
    ],
  },
  '/settings': {
    title: t('auto.إعدادات_النظام_والتهيئة_العامة_21a161'),
    subtitle: 'System Configuration & Company Settings',
    description:
      t('auto.شاشة_التحكم_في_إعدادات_المنظوم_1bb2aa'),
    backendStatus: t('auto.إدارة_الأدوار_والمستخدمين_مفعل_7a0992'),
    features: [
      t('auto.تخصيص_بيانات_الشركة_والترويسة__fd76d9'),
      t('auto.إدارة_صلاحيات_المستخدمين_وهيكل_475d00'),
      t('auto.تهيئة_أوقات_الدوام_الرسمي_ومعد_2b882e'),
    ],
  },
};

  const location = useLocation();
  const navigate = useNavigate();

  const moduleInfo = MODULE_DATA[location.pathname] || {
    title: t('auto.الصفحة_قيد_التطوير_والتجهيز_2a794f'),
    subtitle: 'Module Under Construction',
    description:
      t('auto.هذه_الوحدة_البرمجية_قيد_التجهي_7b182a'),
    backendStatus: t('auto.مجدولة_ضمن_خطة_التطوير_65a732'),
    features: [t('auto.واجهة_تفاعلية_حديثة_17839d'), t('auto.ربط_مباشر_مع_قاعدة_البيانات_530d21'), t('auto.تصدير_التقارير_والإحصائيات_329afd')],
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '840px', margin: '2rem auto' }}>
      <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative Top Accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#60a5fa',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)',
          }}
        >
          <Construction size={40} className="animate-bounce" style={{ animationDuration: '2.5s' }} />
        </div>

        {/* Status Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '9999px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
          <Clock size={14} />
          <span>{t('auto.الوحدة_قيد_التجهيز_والتطوير_Wo_48ac30')}</span>
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-heading)' }}>
          {moduleInfo.title}
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#93c5fd', margin: '0 0 1.25rem', fontFamily: 'monospace' }}>
          {moduleInfo.subtitle}
        </p>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', maxWidth: '640px', margin: '0 auto 2rem' }}>
          {moduleInfo.description}
        </p>

        {/* Feature Preview Card */}
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            textAlign: 'right',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            <Sparkles size={16} />
            <span>{t('auto.الميزات_المخططة_لهذه_الشاشة_2973fb')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {moduleInfo.features.map((feat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                <CheckCircle2 size={15} color="#34d399" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <strong>{t('auto.حالة_المحرك_الخلفي_2155a4')}</strong>
            <span>{moduleInfo.backendStatus}</span>
          </div>
        </div>

        {/* Quick Nav Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
            style={{ gap: '0.5rem', padding: '0.65rem 1.5rem' }}
          >
            <LayoutDashboard size={18} />
            <span>{t('auto.العودة_للوحة_التحكم_2d987b')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/daily-report')}
            className="btn btn-secondary"
            style={{ gap: '0.5rem', padding: '0.65rem 1.5rem' }}
          >
            <FileSpreadsheet size={18} />
            <span>{t('auto.التقرير_اليومي_الشامل_e194e9')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/production')}
            className="btn btn-secondary"
            style={{ gap: '0.5rem', padding: '0.65rem 1.5rem' }}
          >
            <Layers size={18} />
            <span>{t('auto.تسجيل_الإنتاجية_234014')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
