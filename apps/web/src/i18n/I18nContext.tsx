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

function resolveKeyInDictionary(dict: any, rawKey: string): string | undefined {
  if (!dict || typeof dict !== 'object' || typeof rawKey !== 'string') return undefined;
  const key = rawKey.trim();
  if (!key) return undefined;

  // 1. Direct flat key match (e.g. "kpis.title" or "common.save")
  if (typeof dict[key] === 'string') {
    return dict[key].trim();
  }
  // Whitespace-resilient flat match
  for (const [k, v] of Object.entries(dict)) {
    if (k.trim() === key && typeof v === 'string') {
      return v.trim();
    }
  }

  // 2. Nested path traversal (e.g. dict.kpis.title)
  const parts = key.split('.').map((p) => p.trim()).filter(Boolean);
  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      if (typeof current[part] !== 'undefined') {
        current = current[part];
      } else {
        // Dual defense: check if any key matches after trimming
        let found = false;
        for (const [k, v] of Object.entries(current)) {
          if (k.trim() === part) {
            current = v;
            found = true;
            break;
          }
        }
        if (!found) {
          current = undefined;
          break;
        }
      }
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current === 'string') {
    return current.trim();
  }

  return undefined;
}

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
    (rawKey: string, params?: Record<string, string | number>): string => {
      const key = typeof rawKey === 'string' ? rawKey.trim() : String(rawKey || '');

      // 1. Current Language Lookup
      let resolved = resolveKeyInDictionary(dictionaries[language], key);

      // 2. Fallback Chain: ur -> en -> ar
      if (resolved === undefined && language === 'ur') {
        resolved = resolveKeyInDictionary(dictionaries.en, key);
      }

      // 3. Fallback to Arabic
      if (resolved === undefined) {
        resolved = resolveKeyInDictionary(dictionaries.ar, key);
      }

      // 4. Default to key if completely missing
      const finalStr = (resolved !== undefined ? resolved : key).trim();

      if (params) {
        return Object.entries(params).reduce((str, [pKey, pVal]) => {
          return str.replace(new RegExp(`{${pKey}}`, 'g'), String(pVal));
        }, finalStr);
      }

      return finalStr;
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
