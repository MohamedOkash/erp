export type Language = 'ar' | 'en' | 'ur';
export type Direction = 'rtl' | 'ltr';

export interface I18nContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}
