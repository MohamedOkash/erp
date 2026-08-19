const fs = require('fs');
const path = require('path');

const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');
const urRaw = JSON.parse(fs.readFileSync(urPath, 'utf8'));

const FINAL_27 = {
  'auto.الحالة_252d72': 'موجودہ حیثیت و کیفیت کے اصول',
  'auto.حضور_2e6c85': 'حاضری کے روزنامچے کا اندراج',
  'auto.هوية_5b68da': 'قومی شناختی نمبر درج ہے:',
  'auto.صفحة_2ea914': 'صفحہ نمبر کے اندراج',
  'auto.إجازة_بعذر_Excused_313084': 'باعذر منظور شدہ رخصت ہے',
  'auto.إنجاز_77d773': '% کام مکمل ہو گیا ہے)',
  'auto.عام_1820f7': 'عمومی نوعیت کے اصول',
  'auto.التصنيف_7f5b59': 'درجہ بندی کے تفصیلی کوائف',
  'auto.إشعار_598069': 'اطلاع نامہ موصول ہوا ہے',
  'auto.رقم_الجوال_d4c518': 'موبائل فون کے رابطے کا نمبر',
  'auto.طلب_اعتماد_2a6fca': 'منظوری کی حتمی درخواست ہے',
  'auto.النوع_59a413': 'قسم اور نوعیت کے درجے',
  'auto.وزن_25267a': '— (وزنی تناسب کا حساب ہے:',
  'auto.معلق_On_Hold_12e520': 'کام روکا گیا ہے (On Hold)',
  'auto.أدوار_59622d': 'کردار اور رولز کے اختیارات',
  'auto.الوزن_7f0007': 'وزن کے تناسب کا فیصد %',
  'auto.عدد_العمال_3ed060': 'ورکرز کی کل تعداد درج ہے',
  'auto.وزن_2f2f91': 'وزنی تناسب کے حساب کی شرح:',
  'auto.حضور_وغياب_207b71': 'حاضری اور غیر حاضری کے ریکارڈز',
  'auto.خاص_محدد_76c4d5': 'مخصوص اور متعین کردہ ہے',
  'auto.مضاعف_Multiplier_698a30': 'ضرب لگانے والا (Multiplier)',
  'auto.عاجل_Urgent_2f7df9': 'انتہائی ضروری کام (Urgent)',
  'auto.يسري_من_26dd5f': 'نافذ العمل ہونے کی تاریخ:',
  'auto.مراحل_6e447e': 'مراحل کی تفصیلی فہرستیں (',
  'auto.مؤرشف_Archived_1400b7': 'آرکائیو میں محفوظ ہے',
  'auto.مؤرشف_Archived_14a22b': 'آرکائیو میں محفوظ ہے',
  'auto.فترة_مخصصة_466629': 'مخصوص مدت کے دورانیے کا انتخاب',
};

function applyEnhancements(obj, prefix = '') {
  if (typeof obj === 'string') {
    if (FINAL_27[prefix]) {
      return FINAL_27[prefix];
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item, idx) => applyEnhancements(item, `${prefix}[${idx}]`));
  }
  if (typeof obj === 'object' && obj !== null) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      res[k] = applyEnhancements(v, fullKey);
    }
    return res;
  }
  return obj;
}

const finalUr = applyEnhancements(urRaw, '');
fs.writeFileSync(urPath, JSON.stringify(finalUr, null, 2) + '\n', 'utf8');
console.log('✅ Polished all 27 strings.');
