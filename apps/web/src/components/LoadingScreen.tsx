import { useI18n } from '../i18n/I18nContext';
import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC<{ message?: string }> = ({
  message,
}) => {
  const { t } = useI18n();
  const displayMessage = message || t('auto.جاري_التحقق_من_بيانات_الجلسة_124642');
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-main)',
        gap: '1rem',
      }}
    >
      <div className="app-bg-glow" />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(37, 99, 235, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: 'var(--shadow-glow)',
        }}
      >
        <Loader2 className="animate-spin" size={32} color="#3b82f6" />
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
        {displayMessage}
      </p>
    </div>
  );
};
