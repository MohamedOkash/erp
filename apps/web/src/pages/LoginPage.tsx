import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import {
  Building2,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  HardHat,
  Compass,
  AlertCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const { t, direction } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard or previous location
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError(t('auth.username_label') + ' ' + t('common.required'));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await login(username.trim(), password);
      const loggedUser = response?.user;
      let target = (location.state as any)?.from?.pathname;
      if (!target || target === '/' || target === '/dashboard') {
        const isAdmin = loggedUser?.roles?.some((r: any) =>
          ['company_admin', 'super_admin', 'program_manager'].includes(typeof r === 'string' ? r : r.code || r.roleCode),
        );
        if (!isAdmin && loggedUser?.scopes && loggedUser.scopes.length === 1) {
          target = `/production?projectId=${loggedUser.scopes[0].projectId}`;
        } else {
          target = '/dashboard';
        }
      }
      navigate(target, { replace: true });
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = (demoUsername: string) => {
    setUsername(demoUsername);
    setPassword('123456');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      <div className="app-bg-glow" />

      {/* Language Switcher in top corner */}
      <div style={{ position: 'absolute', top: '1.5rem', [direction === 'rtl' ? 'left' : 'right']: '1.5rem', zIndex: 20 }}>
        <LanguageSwitcher />
      </div>

      <div
        className="glass-card animate-fade-in-up"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2.5rem',
          position: 'relative',
          zIndex: 10,
          overflow: 'hidden',
        }}
      >
        {/* Contracting Brand Hazard Stripe */}
        <div className="hazard-stripe" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />

        {/* Header / Brand Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
              marginBottom: '1rem',
            }}
          >
            <Building2 size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>
            {t('app.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('app.subtitle')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1rem',
              background: 'var(--status-danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              <UserIcon size={16} />
              <span>{t('auth.username_label')}</span>
            </label>
            <div className="input-wrapper">
              <input
                id="login-username"
                type="text"
                className="input-field"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              <Lock size={16} />
              <span>{t('auth.password_label')}</span>
            </label>
            <div className="input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  [direction === 'rtl' ? 'left' : 'right']: '0.85rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', height: '48px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>{t('auth.logging_in')}</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>{t('auth.login_btn')}</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts Selection */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              textAlign: 'center',
              marginBottom: '0.85rem',
              fontWeight: 600,
            }}
          >
            {t('auth.quick_demo')} (123456)
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                flexDirection: 'column',
                padding: '0.65rem 0.4rem',
                fontSize: '0.75rem',
                gap: '0.35rem',
                background: username === 'admin' ? 'rgba(37, 99, 235, 0.2)' : undefined,
                borderColor: username === 'admin' ? 'var(--brand-primary)' : undefined,
              }}
              onClick={() => handleQuickDemoLogin('admin')}
            >
              <ShieldCheck size={16} color="#60a5fa" />
              <span>{t('auth.role_admin')}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{
                flexDirection: 'column',
                padding: '0.65rem 0.4rem',
                fontSize: '0.75rem',
                gap: '0.35rem',
                background: username === 'engineer' ? 'rgba(16, 185, 129, 0.2)' : undefined,
                borderColor: username === 'engineer' ? 'var(--status-success)' : undefined,
              }}
              onClick={() => handleQuickDemoLogin('engineer')}
            >
              <Compass size={16} color="#34d399" />
              <span>{t('auth.role_engineer')}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{
                flexDirection: 'column',
                padding: '0.65rem 0.4rem',
                fontSize: '0.75rem',
                gap: '0.35rem',
                background: username === 'supervisor' ? 'rgba(245, 158, 11, 0.2)' : undefined,
                borderColor: username === 'supervisor' ? 'var(--status-warning)' : undefined,
              }}
              onClick={() => handleQuickDemoLogin('supervisor')}
            >
              <HardHat size={16} color="#fbbf24" />
              <span>{t('auth.role_supervisor')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
