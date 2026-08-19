const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urPath, 'utf8'));

// Helper to check if string genuinely means "for X" (purpose/recipient)
function isLegitimateFor(arStr = '', enStr = '') {
  const a = arStr.trim().toLowerCase();
  const e = enStr.trim().toLowerCase();
  if (e.startsWith('for ') || e.startsWith('to ')) return true;
  if (a.startsWith('من أجل ') || a.startsWith('لأجل ') || a.startsWith('مخصص لـ') || a.startsWith('خاص بـ')) return true;
  return false;
}

// Special dictionary for common high-impact UI terms to ensure top quality Urdu
const CORE_URDU_WORDS = {
  'common.all': 'تمام',
  'common.actions': 'اقدامات',
  'common.status': 'حیثیت و کیفیت',
  'common.active': 'فعال',
  'common.inactive': 'غیر فعال',
  'common.date': 'تاریخ',
  'common.time': 'وقت',
  'common.details': 'تفصیلات',
  'common.total': 'کل میزان',
  'common.count': 'تعداد',
  'common.to': 'تک',
  'common.from': 'از',
  'common.required': 'لازمی',
  'common.optional': 'اختیاری',
  'common.currency_sar': 'سعودی ریال',
  'common.page': 'صفحہ',
  'common.save': 'محفوظ کریں',
  'common.cancel': 'منسوخ کریں',
  'common.edit': 'ترمیم کریں',
  'common.delete': 'حذف کریں',
  'common.confirm': 'تصدیق کریں',
  'common.search': 'تلاش کریں',
  'common.filter': 'فلٹر',
  'common.export': 'برآمد کریں',
  'common.import': 'درآمد کریں',
  'common.download': 'ڈاؤن لوڈ کریں',
  'common.upload': 'اپ لوڈ کریں',
  'common.refresh': 'ریفریش کریں',
  'common.reset': 'ری سیٹ کریں',
  'common.close': 'بند کریں',
  'common.back': 'واپس',
  'common.next': 'اگلا',
  'common.previous': 'پچھلا',
  'common.submit': 'جمع کروائیں',
  'common.apply': 'لاگو کریں',
  'common.clear': 'صاف کریں',
  'common.view': 'ملاحظہ کریں',
  'common.loading': 'لوڈ ہو رہا ہے...',
  'common.no_data': 'کوئی ڈیٹا دستیاب نہیں ہے',
  'common.error': 'خرابی',
  'common.success': 'کامیابی',
  'common.warning': 'انتباہ',
  'common.info': 'معلومات',

  // Navigation & Headers
  'nav.groups.overview': 'عمومی جائزہ اور قیادت',
  'nav.groups.operations': 'سائٹ کے آپریشنز اور عمل درآمد',
  'nav.groups.resources': 'افرادی قوت، آلات اور نرخ',
  'nav.groups.finance': 'مالیات اور حسابات کی نگرانی',
  'nav.groups.system': 'سسٹم کی ترتیبات اور سیکیورٹی',
  'nav.links.attendance': 'حاضری، روانگی اور اوقات کار',
  'nav.links.employees': 'افرادی قوت اور عملہ',
  'nav.links.alerts': 'انتباہات اور قواعد کی نگرانی',
  'nav.links.notifications': 'اطلاعات و نوٹیفیکیشنز کا مرکز',
  'nav.links.users': 'صارفین کا انتظام و کنٹرول',
  'header.currency_label': 'کرنسی',
  'header.online_status': 'آن لائن متصل',
  'header.offline_status': 'آف لائن غیر متصل',
  'header.system_edition': 'کنسٹرکشن مینجمنٹ سسٹم',
  'header.currency_value': 'SAR 🇸🇦',
  'auth.username_label': 'صارف نام یا ای میل ایڈریس',
  'dashboard.welcome': 'خوش آمدید، {name}',
  'dashboard.profit_margin': 'تخمینی منافع کا مارجن',
};

let cleanedCount = 0;

function cleanNode(urNode, arNode, enNode, currentPath = '') {
  if (typeof urNode === 'string') {
    if (CORE_URDU_WORDS[currentPath]) {
      cleanedCount++;
      return CORE_URDU_WORDS[currentPath];
    }

    let val = urNode.trim();
    const arStr = typeof arNode === 'string' ? arNode.trim() : '';
    const enStr = typeof enNode === 'string' ? enNode.trim() : '';

    if ((val.endsWith('کے لیے') || val.endsWith('کے لئے')) && !isLegitimateFor(arStr, enStr)) {
      val = val.replace(/\s*کے ل[يئ]ے\s*$/, '').trim();
      cleanedCount++;
    }

    return val;
  }

  if (Array.isArray(urNode)) {
    return urNode.map((item, idx) => cleanNode(item, arNode ? arNode[idx] : undefined, enNode ? enNode[idx] : undefined, `${currentPath}[${idx}]`));
  }

  if (typeof urNode === 'object' && urNode !== null) {
    const result = {};
    for (const [key, value] of Object.entries(urNode)) {
      const subPath = currentPath ? `${currentPath}.${key}` : key;
      const subAr = arNode && typeof arNode === 'object' ? arNode[key] : undefined;
      const subEn = enNode && typeof enNode === 'object' ? enNode[key] : undefined;
      result[key] = cleanNode(value, subAr, subEn, subPath);
    }
    return result;
  }

  return urNode;
}

console.log('🧹 Running clean-urdu-keliye: Removing artificial "کے لیے" suffixes...\n');
const cleanedUr = cleanNode(ur, ar, en, '');

fs.writeFileSync(urPath, JSON.stringify(cleanedUr, null, 2) + '\n', 'utf8');
console.log(`✅ Complete: ${cleanedCount} Urdu translations cleaned and polished.`);
