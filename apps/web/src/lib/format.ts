import type { Language } from '../i18n/types';

/**
 * Maps raw database/API unit strings to localized display unit symbols
 */
export function formatUnit(unit?: string | null, lang: Language = 'ar'): string {
  if (!unit || typeof unit !== 'string') return '';
  const trimmed = unit.trim().toLowerCase();

  const UNIT_MAP: Record<string, { ar: string; en: string; ur: string }> = {
    // Square meters
    'م2': { ar: 'م²', en: 'm²', ur: 'مربع میٹر' },
    'م²': { ar: 'م²', en: 'm²', ur: 'مربع میٹر' },
    'متر مربع': { ar: 'متر مربع', en: 'sq.m', ur: 'مربع میٹر' },
    'sqm': { ar: 'م²', en: 'm²', ur: 'مربع میٹر' },
    'm2': { ar: 'م²', en: 'm²', ur: 'مربع میٹر' },
    'm²': { ar: 'م²', en: 'm²', ur: 'مربع میٹر' },

    // Pieces / Items
    'عدد': { ar: 'عدد', en: 'pcs', ur: 'عدد' },
    'قطعة': { ar: 'قطعة', en: 'pc', ur: 'ٹکڑا' },
    'حبة': { ar: 'حبة', en: 'pc', ur: 'عدد' },
    'pcs': { ar: 'عدد', en: 'pcs', ur: 'عدد' },
    'pc': { ar: 'قطعة', en: 'pc', ur: 'عدد' },

    // Linear meters
    'م.ط': { ar: 'م.ط', en: 'l.m', ur: 'طولی میٹر' },
    'متر طولي': { ar: 'متر طولي', en: 'lin.m', ur: 'طولی میٹر' },
    'lm': { ar: 'م.ط', en: 'l.m', ur: 'طولی میٹر' },

    // Cubic meters
    'م3': { ar: 'م³', en: 'm³', ur: 'مکعب میٹر' },
    'م³': { ar: 'م³', en: 'm³', ur: 'مکعب میٹر' },
    'متر مكعب': { ar: 'متر مكعب', en: 'cu.m', ur: 'مکعب میٹر' },
    'm3': { ar: 'م³', en: 'm³', ur: 'مکعب میٹر' },
    'm³': { ar: 'م³', en: 'm³', ur: 'مکعب میٹر' },

    // Weight
    'كجم': { ar: 'كجم', en: 'kg', ur: 'کلوگرام' },
    'كيلو': { ar: 'كيلو', en: 'kg', ur: 'کلو' },
    'kg': { ar: 'كجم', en: 'kg', ur: 'کلوگرام' },
    'طن': { ar: 'طن', en: 'ton', ur: 'ٹن' },

    // Electrical / Points
    'نقطة': { ar: 'نقطة', en: 'pt', ur: 'پوائنٹ' },
    'نقطة / مخرج': { ar: 'نقطة / مخرج', en: 'pt / outlet', ur: 'پوائنٹ' },
    'مخرج': { ar: 'مخرج', en: 'outlet', ur: 'آؤٹ لیٹ' },
    'pt': { ar: 'نقطة', en: 'pt', ur: 'پوائنٹ' },

    // Time & Rates
    'ساعة': { ar: 'ساعة', en: 'hr', ur: 'گھنٹہ' },
    'يوم': { ar: 'يوم', en: 'day', ur: 'دن' },
    'وحدة/يوم': { ar: 'وحدة/يوم', en: 'unit/day', ur: 'یونٹ/دن' },
    'unit/day': { ar: 'وحدة/يوم', en: 'unit/day', ur: 'یونٹ/دن' },
    'م²/يوم': { ar: 'م²/يوم', en: 'm²/day', ur: 'مربع میٹر/دن' },
  };

  const match = UNIT_MAP[trimmed];
  if (match) {
    return match[lang] || match.ar;
  }

  return unit;
}

/**
 * Formats a monetary amount with correct currency code and space
 */
export function formatCurrency(amount: number | string | null | undefined, lang: Language = 'ar'): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '—';
  }

  const num = Number(amount);
  const formattedNum = num.toLocaleString(lang === 'ar' ? 'ar-SA' : lang === 'ur' ? 'ur-PK' : 'en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  const CURRENCY_MAP: Record<Language, string> = {
    ar: 'ريال',
    en: 'SAR',
    ur: 'سعودی ریال',
  };

  return `${formattedNum} ${CURRENCY_MAP[lang] || 'SAR'}`;
}

/**
 * Formats a number with proper localized thousands separators
 */
export function formatNumber(val: number | string | null | undefined, lang: Language = 'ar'): string {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0';
  }
  return Number(val).toLocaleString(lang === 'ar' ? 'ar-SA' : lang === 'ur' ? 'ur-PK' : 'en-US');
}

/**
 * Resolves entity name based on active language with Arabic fallback
 */
export function getLocaleName(
  entity: { name?: string | null; name_en?: string | null; name_ur?: string | null } | null | undefined,
  lang: Language = 'ar',
): string {
  if (!entity) return '';
  if (lang === 'en' && entity.name_en && entity.name_en.trim().length > 0) {
    return entity.name_en.trim();
  }
  if (lang === 'ur' && entity.name_ur && entity.name_ur.trim().length > 0) {
    return entity.name_ur.trim();
  }
  return (entity.name || '').trim();
}

/**
 * Resolves entity description based on active language with fallback
 */
export function getLocaleDescription(
  entity: { description?: string | null; description_en?: string | null; description_ur?: string | null } | null | undefined,
  lang: Language = 'ar',
): string {
  if (!entity) return '';
  if (lang === 'en' && entity.description_en && entity.description_en.trim().length > 0) {
    return entity.description_en.trim();
  }
  if (lang === 'ur' && entity.description_ur && entity.description_ur.trim().length > 0) {
    return entity.description_ur.trim();
  }
  return (entity.description || '').trim();
}

