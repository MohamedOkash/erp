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

const MODULE_DATA: Record<string, ModuleInfo> = {
  '/incentives': {
    title: 'نظام الحوافز والمكافآت والإنتاجية',
    subtitle: 'Incentives & Performance Bonus Engine',
    description:
      'نظام حساب المكافآت التلقائي للكوادر الفنية والمشرفين بناءً على تجاوز معدلات الإنتاجية القياسية ونسب إنجاز مراحل البنود في الوقت المحدد.',
    backendStatus: 'جاهز برمجياً في الـ Backend ومربوط ببيانات الإنتاج والحضور',
    features: [
      'حساب البونص التلقائي لكل متر/وحدة إضافية فوق المستهدف',
      'صرف حوافز إنجاز المراحل الحرجة قبل الموعد التعاقدي',
      'تقارير تفصيلية لمكافآت المشرفين والفرق الميدانية',
    ],
  },
  '/documents': {
    title: 'المستندات والأرشيف السحابي والمخططات',
    subtitle: 'Documents & Engineering Drawings Archive',
    description:
      'أرشيف رقمي منظم لكافة مخططات الـ Shop Drawings، محاضر الاستلام، كراسات الشروط، ومستندات المشاريع مع إدارة الإصدارات والصلاحيات.',
    backendStatus: 'جاهز برمجياً في الـ Backend مع التوثيق والمرفقات',
    features: [
      'أرشفة مخططات الـ PDF والتصميمات المعمارية والإنشائية',
      'إدارة أذونات ومحاضر فحص واستلام الاستشاري',
      'ربط المستندات ببند الـ BOQ أو منطقة العمل المعنية',
    ],
  },
  '/reports': {
    title: 'مركز التقارير المتقدمة والتحليلات الشاملة',
    subtitle: 'Advanced Analytics & Executive Reporting',
    description:
      'مركز شامل لاستخراج التقارير المالية والإنتاجية التنفيذية، مؤشرات الأداء الرئيسية (KPIs)، وتصدير المخططات التفصيلية.',
    backendStatus: 'التقرير اليومي متاح حالياً، وجاري تجهيز لوحة التحليلات المتقدمة',
    features: [
      'تقرير الإنتاجية والمقارنات بين المشاريع والفروع',
      'تحليل انحراف التكاليف والموازنات التقديرية',
      'تصدير كشوفات الإنجاز لملفات Excel و PDF متقدمة',
    ],
  },
  '/settings': {
    title: 'إعدادات النظام والتهيئة العامة',
    subtitle: 'System Configuration & Company Settings',
    description:
      'شاشة التحكم في إعدادات المنظومة، إدارة المستخدمين، التهيئة العامة للشركة، ربط السيرفرات والنسخ الاحتياطي.',
    backendStatus: 'إدارة الأدوار والمستخدمين مفعلة من خلال قاعدة البيانات',
    features: [
      'تخصيص بيانات الشركة والترويسة الرسمية',
      'إدارة صلاحيات المستخدمين وهيكل الأدوار الهرمي',
      'تهيئة أوقات الدوام الرسمي ومعدلات الإضافي والتنبيهات',
    ],
  },
};

export const UnderConstructionPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const moduleInfo = MODULE_DATA[location.pathname] || {
    title: 'الصفحة قيد التطوير والتجهيز',
    subtitle: 'Module Under Construction',
    description:
      'هذه الوحدة البرمجية قيد التجهيز والتطوير لتوفير أفضل تجربة مستخدم ومطابقة متطلبات العمل بدقة.',
    backendStatus: 'مجدولة ضمن خطة التطوير',
    features: ['واجهة تفاعلية حديثة', 'ربط مباشر مع قاعدة البيانات', 'تصدير التقارير والإحصائيات'],
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
          <span>الوحدة قيد التجهيز والتطوير (Work in Progress)</span>
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#ffffff' }}>
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
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            textAlign: 'right',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            <Sparkles size={16} />
            <span>الميزات المخططة لهذه الشاشة:</span>
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
            <strong>حالة المحرك الخلفي:</strong>
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
            <span>العودة للوحة التحكم</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/daily-report')}
            className="btn btn-secondary"
            style={{ gap: '0.5rem', padding: '0.65rem 1.5rem' }}
          >
            <FileSpreadsheet size={18} />
            <span>التقرير اليومي الشامل</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/production')}
            className="btn btn-secondary"
            style={{ gap: '0.5rem', padding: '0.65rem 1.5rem' }}
          >
            <Layers size={18} />
            <span>تسجيل الإنتاجية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
