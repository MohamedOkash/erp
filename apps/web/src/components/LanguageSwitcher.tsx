import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { Language } from '../i18n/types';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'ar', label: 'عربي', flag: '🇸🇦' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '2px',
        gap: '2px',
      }}
    >
      <div
        style={{
          padding: '0 0.35rem',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-dim)',
        }}
      >
        <Globe size={14} />
      </div>

      {languages.map((lang) => {
        const isActive = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            style={{
              padding: '0.25rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: isActive ? 'var(--brand-primary)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title={lang.label}
          >
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
};
