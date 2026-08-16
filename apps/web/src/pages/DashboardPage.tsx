import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  Layers,
  FileSpreadsheet,
  Users,
  DollarSign,
  FileText,
  Bell,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(17, 29, 56, 0.8) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-success">
              <CheckCircle2 size={12} />
              <span>المصادقة نشطة والـ Token موثق</span>
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>
            أهلاً بك، {user?.fullName || user?.username} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            منظومة المقاولات والتشطيبات المتكاملة — إدارة الإنتاجية اليومية والمقايسة وحساب التكاليف.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Shield size={24} color="#60a5fa" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>معرف المستخدم</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>
              {user?.id?.substring(0, 13) || '—'}...
            </div>
          </div>
        </div>
      </div>

      {/* Quick KPI Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(37, 99, 235, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
            }}
          >
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>حالة الإنتاجية</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>سجلات معتمدة</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>إنجاز المقايسة</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>تراكمي حي</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>إدارة الهويات</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>إقامات وهويات</div>
          </div>
        </div>
      </div>

      {/* Grid Modules Section */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
        الانتقال السريع للموديولات التشغيلية
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Module 1: Employees */}
        <Link to="/employees" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ padding: '1.5rem', height: '100%', transition: 'var(--transition-normal)' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Users size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>العمال والموظفون</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              إدارة الهويات (هوية وطنية، إقامة، جواز)، تواريخ الانتهاء، وتعيينات المشاريع.
            </p>
          </div>
        </Link>

        {/* Module 2: Projects & BOQ */}
        <Link to="/boq" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ padding: '1.5rem', height: '100%' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <FileSpreadsheet size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>المقايسة وتقدم التنفيذ</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              حساب الكميات التراكمية المنفذة ونسب الإنجاز التلقائية من واقع السجلات المعتمدة.
            </p>
          </div>
        </Link>

        {/* Module 3: Daily Production */}
        <Link to="/production" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ padding: '1.5rem', height: '100%' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(37, 99, 235, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Layers size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>الإنتاجية اليومية</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              تسجيل تقارير الإنجاز اليومي للبنود واعتمادها عبر مسار الحالات الصارم.
            </p>
          </div>
        </Link>

        {/* Module 4: Costs & Ledger */}
        <Link to="/costs" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ padding: '1.5rem', height: '100%' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(236, 72, 153, 0.15)',
                color: '#f472b6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <DollarSign size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>التكاليف والحوافز</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              حساب أجور العمالة تلقائيًا من الحضور، ومكافآت تجاوز المستهدفات.
            </p>
          </div>
        </Link>

        {/* Module 5: Documents */}
        <Link to="/documents" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ padding: '1.5rem', height: '100%' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(14, 165, 233, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <FileText size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>المستندات والأرشيف</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              إدارة مخططات المشاريع، مستندات العقود، وإصدارات الملفات المؤرشفة.
            </p>
          </div>
        </Link>

        {/* Module 6: Alerts */}
        <Link to="/alerts" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ padding: '1.5rem', height: '100%' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Bell size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>التنبيهات المجدولة</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              فحص دوري لانخفاض الإنتاجية، اقتراب انتهاء الإقامات، والغياب.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};
