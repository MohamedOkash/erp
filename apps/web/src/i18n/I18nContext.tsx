import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Language, Direction, I18nContextType } from './types';
import arDict from './locales/ar.json';
import enDict from './locales/en.json';
import urDict from './locales/ur.json';

const dictionaries: Record<Language, any> = {
  ar: arDict,
  en: enDict,
  ur: urDict,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('erp_lang') as Language;
    if (saved === 'ar' || saved === 'en' || saved === 'ur') {
      return saved;
    }
    return 'ar';
  });

  const direction: Direction = language === 'en' ? 'ltr' : 'rtl';

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', direction);
    localStorage.setItem('erp_lang', language);
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let current: any = dictionaries[language];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to Arabic if missing
          let fallback: any = dictionaries.ar;
          for (const fbK of keys) {
            if (fallback && typeof fallback === 'object' && fbK in fallback) {
              fallback = fallback[fbK];
            } else {
              fallback = null;
              break;
            }
          }
          current = fallback ?? key;
          break;
        }
      }

      if (typeof current !== 'string') {
        return key;
      }

      if (params) {
        return Object.entries(params).reduce((str, [pKey, pVal]) => {
          return str.replace(new RegExp(`{${pKey}}`, 'g'), String(pVal));
        }, current);
      }

      return current;
    },
    [language],
  );

  return (
    <I18nContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
