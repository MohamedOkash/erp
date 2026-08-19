const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const arRaw = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const enRaw = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const urRaw = JSON.parse(fs.readFileSync(urPath, 'utf8'));

const EXACT_REPLACEMENTS = {
  // English fixes for auto items
  'auto.إلى_17d96a': { en: 'To', ur: 'تک کے لیے' },
  'auto.كهرب_2f1057': { en: 'Electrical', ur: 'الیکٹریکل کا کام' },
  'auto.صح_c698': { en: 'Sanitary / Plumbing', ur: 'سینیٹری و پلمبنگ کا کام' },
  'auto.أمس_17d1f1': { en: 'Yesterday', ur: 'گزشتہ کل' },
  'auto.قبل_أمس_1d79fe': { en: 'Day Before Yesterday', ur: 'پریروز (گزرا پرسوں)' },
  'auto.فترة_مخصصة_466629': { en: 'Custom Period', ur: 'مخصوص مدت کا دورانیہ' },
  'auto.مخصص_2f190e': { en: 'Custom', ur: 'مخصوص و طے شدہ' },
  'auto.اعتماد_25c964': { en: 'Approval', ur: 'حتمی منظوری' },

  // Urdu Translations for remaining identical/short keys
  'common.status': { ur: 'حیثیت و کیفیت' },
  'auto.مشروع_مخصص_5b4a40': { ur: 'مخصوص پروجیکٹ' },
  'auto.معطلة_5b459b': { ur: 'غیر فعال / بند' },
  'auto.سارية_من_29a3f6': { ur: 'نافذ العمل از:' },
  'auto.الاستراحة_2ae277': { ur: 'وقفہ / بریک:' },
  'auto.معامل_2563cc': { ur: '(ملٹی پلائر ×' },
  'auto.سجل_صالح_497f87': { ur: 'درست ریکارڈ)' },
  'auto.سارية_من_7bcfd0': { ur: '(نافذ از' },
  'auto.سماح_5a4d24': { ur: 'رعایتی وقت:' },
  'auto.استراحة_1780ef': { ur: 'وقفہ:' },
  'auto.إضافي_بعد_697d0e': { ur: 'اوور ٹائم بعد از:' },
  'auto.الحالة_252d72': { ur: 'حیثیت و حالت' },
  'auto.حضور_2e6c85': { ur: 'حاضری' },
  'auto.انصراف_250d7d': { ur: 'روانگی / چھٹی' },
  'auto.مكرر_36140e': { ur: '⚠️ ڈپلیکیٹ' },
  'auto.جاهز_4deaa7': { ur: '✓ تیار ہے' },
  'auto.الرئيسية_772ff2': { ur: 'مین ہوم پیج' },
  'auto.نظرة_عامة_32cda8': { ur: 'عمومی جائزہ' },
  'auto.قريب_ا_7e6db8': { ur: 'عنقریب دستیاب' },
  'auto.متصل_2f181f': { ur: 'آن لائن منسلک' },
  'auto.الشركة_252a1e': { ur: 'کمپنی کا نام' },
  'auto.مشروع_محدد_5b4a3c': { ur: 'متعین پروجیکٹ' },
  'auto.تنبيه_59ced2': { ur: 'انتباہی الرٹ' },
  'auto.تجاوز_59c2fc': { ur: 'اوور رائیڈ / تجاوز' },
  'auto.إنتاج_598860': { ur: 'پیداوار / پروڈکشن' },
  'auto.إنتاجية_18f1d5': { ur: 'پیداواری شرح' },
  'auto.بصمة_2e47e5': { ur: 'بائیو میٹرک فنگر پرنٹ' },
  'auto.مستند_5b42b1': { ur: 'دستاویز / فائل' },
  'auto.وثيقة_5b69cc': { ur: 'سرکاری وثیقہ' },
  'auto.بصمة_جهاز_42e3b3': { ur: 'ڈیوائس کی فنگر پرنٹ' },
  'auto.إكسيل_598729': { ur: 'ایکسل فائل' },
  'auto.يدوي_2f3dce': { ur: 'دستی اندراج' },
  'auto.نطاق_مخصص_1b6320': { ur: 'مخصوص تاریخیں' },
  'auto.المصدر_252257': { ur: 'ڈیٹا کا ماخذ' },
  'auto.موظف_2f1f2e': { ur: 'ملازم' },
  'auto.هوية_5b68da': { ur: 'شناختی نمبر:' },
  'auto.من_إجمالي_4d6b95': { ur: 'کل میں سے' },
  'auto.سجل_حضور_2ba5dc': { ur: 'حاضری کا ریکارڈ' },
  'auto.السابق_252abb': { ur: 'پچھلا صفحہ' },
  'auto.صفحة_2ea914': { ur: 'صفحہ نمبر' },
  'auto.التالي_252ecf': { ur: 'اگلا صفحہ' },
  'auto.حاضر_Present_5fc486': { ur: 'موجود / حاضر' },
  'auto.غائب_Absent_5404a0': { ur: 'غیر حاضر' },
  'auto.متأخر_Late_729bb3': { ur: 'تاخیر سے آمد' },
  'auto.إجازة_بعذر_Excused_313084': { ur: 'باعذر رخصت' },
  'auto.بدون_كود_519c6b': { ur: 'بغیر کوڈ کے' },
  'auto.بند_مقايسة_d822ee': { ur: 'بی او کیو (BOQ) آئٹم' },
  'auto.وحدة_2f2e97': { ur: 'پیمائشی یونٹ' },
  'auto.هاتف_5b5965': { ur: 'ٹیلی فون:' },
  'auto.معطل_2f1ba8': { ur: 'معطل / بند' },
  'auto.فرع_184029': { ur: 'برانچ کا دفتر' },
  'auto.فني_5b12a9': { ur: 'کاریگر +' },
  'auto.مساعد_5b42a4': { ur: 'مددگار / ہیلپر' },
  'auto.الحساب_311bf4': { ur: '* حسابی فارمولا:' },
  'auto.إنجاز_77d773': { ur: '% مکمل ہوا)' },
  'auto.سعر_العقد_5e1a67': { ur: 'معاہدے کی قیمت:' },
  'auto.الهامش_7f1266': { ur: 'منافع کا مارجن:' },
  'auto.أخرى_583aba': { ur: '📌 دیگر امور' },
  'auto.أجور_عمالة_Labor_3ac192': { ur: 'مزدوروں کی اجرت' },
  'auto.الفئة_59a3fc': { ur: 'درجہ / کیٹیگری' },
  'auto.عام_1820f7': { ur: 'عمومی نوعیت' },
  'auto.قيد_نظامي_3006ab': { ur: 'سسٹم کا باقاعدہ اندراج' },
  'auto.قيد_تكلفة_318bd1': { ur: 'لاگت کا اخراجاتی اندراج' },
  'auto.الفئة_7f688d': { ur: 'کیٹیگری کی قسم *' },
  'auto.التصنيف_7f5b59': { ur: 'درجہ بندی' },
  'auto.تنبيه_عاجل_20e4b3': { ur: 'فوری انتباہ' },
  'auto.إشعار_598069': { ur: 'اطلاع نامہ' },
  'auto.السجلات_7fd60a': { ur: 'تمام ریکارڈز' },
  'auto.بند_عمل_4ad23b': { ur: 'ورک آئٹم کا بند' },
  'auto.أخرى_2e21be': { ur: 'دیگر تفصیلات' },
  'auto.k_61f': { ur: '؟' },
  'auto.وزن_25267a': { ur: '— (وزنی تناسب:' },
  'auto.وزن_2f2f91': { ur: 'وزنی تناسب:' },
  'auto.مثال_20_66d4a6': { ur: 'مثال کے طور پر: 20' },
  'auto.مراحل_6e447e': { ur: 'مراحل کی فہرست (' },

  // Remaining Trailing کے لیے keys and lacking distinct
  'auto.لكافة_التخصصات_والمواقع_524e26': { ur: 'تمام شعبوں اور سائٹس کا احاطہ' },
  'auto.عام_للشركة_3ddfff': { ur: 'پوری کمپنی کا عمومی ضابطہ' },
  'auto.إلى_تاريخ_d3e6d7': { ur: 'آخری تاریخ تک' },
  'auto.إلى_تاريخ_33c707': { ur: 'آخری تاریخ تک...' },
  'auto.إلى_تاريخ_48a6fe': { ur: 'آخری تاریخ تک *' },
  'auto.إقامة_مقيم_Iqama_6a04c9': { ur: 'رہائشی اقامہ (Iqama)' },
  'auto.الجنسية_7f7efb': { ur: 'قومیت اور شہریت' },
  'auto.رقم_الجوال_d4c518': { ur: 'موبائل فون نمبر' },
  'auto.إقامة_مقيم_250e80': { ur: 'رہائشی اقامہ کی نقل' },
  'auto.منتهية_33ddc2': { ur: 'میعاد ختم ہو چکی ہے (' },
  'auto.استعلام_625abd': { ur: 'تلاش و استفسار کریں' },
  'auto.معطل_فقط_66c560': { ur: 'صرف غیر فعال ریکارڈز' },
  'auto.موظف_عامل_4750aa': { ur: 'ملازم یا ورکر' },
  'auto.دور_263c7e': { ur: '• رول اور اختیارات:' },
  'auto.صالح_2ea327': { ur: 'درست اور کارآمد' },
  'auto.استحقاق_625541': { ur: 'استحقاق اور حق' },
  'auto.نوع_الحافز_4da0eb': { ur: 'بونس کی قسم اور نوعیت' },
};

function applyExactReplacements(obj, lang, prefix = '') {
  if (typeof obj === 'string') {
    if (EXACT_REPLACEMENTS[prefix] && EXACT_REPLACEMENTS[prefix][lang]) {
      return EXACT_REPLACEMENTS[prefix][lang];
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item, idx) => applyExactReplacements(item, lang, `${prefix}[${idx}]`));
  }
  if (typeof obj === 'object' && obj !== null) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      res[k] = applyExactReplacements(v, lang, fullKey);
    }
    return res;
  }
  return obj;
}

console.log('⚡ Applying all exact translations...\n');
const updatedEn = applyExactReplacements(enRaw, 'en', '');
const updatedUr = applyExactReplacements(urRaw, 'ur', '');

fs.writeFileSync(enPath, JSON.stringify(updatedEn, null, 2) + '\n', 'utf8');
fs.writeFileSync(urPath, JSON.stringify(updatedUr, null, 2) + '\n', 'utf8');
console.log('✅ Applied all exact translations successfully.');
