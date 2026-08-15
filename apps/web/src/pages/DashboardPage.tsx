import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  LogOut,
  Shield,
  Layers,
  FileSpreadsheet,
  Users,
  DollarSign,
  FileText,
  Bell,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', width: '100vw', paddingBottom: '3rem' }}>
      <div className="app-bg-glow" />

      {/* Top Navbar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(11, 19, 41, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <Building2 size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>منظومة إدارة التشطيبات</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Construction ERP Platform
              </span>
            </div>
          </div>

          {/* User Profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                {user?.fullName || user?.username}
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.15rem' }}>
                {user?.roles?.map((r) => (
                  <span key={r.roleCode} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    {r.roleName}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', gap: '0.4rem' }}
              title="تسجيل الخروج"
            >
              <LogOut size={16} color="#ef4444" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1280px', margin: '2rem auto', padding: '0 1.5rem' }}>
        {/* Welcome Banner */}
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '2rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(17, 29, 56, 0.8) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
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
              تم الاتصال بنجاح بقاعدة البيانات والـ API Backend مع تفعيل العزل السحابي (Tenant Isolation).
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
                {user?.id.substring(0, 13)}...
              </div>
            </div>
          </div>
        </div>

        {/* Quick Grid Modules Overview */}
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
          الموديولات التشغيلية الجاهزة في النظام
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Card 1: Production */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
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
              تسجيل تقارير الإنجاز اليومي للبنود واعتمادها عبر مسار الحالات الصارم (مشرف ← مهندس ← مدير).
            </p>
          </div>

          {/* Card 2: BOQ Progress */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
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
              حساب الكميات التراكمية المنفذة ونسب الإنجاز التلقائية من واقع السجلات المعتمدة نهائيًا.
            </p>
          </div>

          {/* Card 3: Employees */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
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
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>العمالة والحضور</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              إدارة الهويات (هوية وطنية، إقامة، جواز)، تواريخ الانتهاء، تسجيل الحضور وحساب ساعات الإضافي.
            </p>
          </div>

          {/* Card 4: Costs & Incentives */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
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
              حساب أجور العمالة تلقائيًا من الحضور، ومكافآت تجاوز المستهدفات واعتماد الصرفيات.
            </p>
          </div>

          {/* Card 5: Documents */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
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
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>المستندات والملفات</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              إدارة مخططات المشاريع، مستندات العقود، وإصدارات الملفات المؤرشفة بأمان.
            </p>
          </div>

          {/* Card 6: Alerts */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
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
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>محرك التنبيهات المجدولة</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              فحص دوري لانخفاض الإنتاجية، اقتراب انتهاء الإقامات، والغياب غير المبرر.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
