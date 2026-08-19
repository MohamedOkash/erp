const fs = require('fs');
const path = require('path');

const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urPath, 'utf8'));

const FINAL_20 = {
  'auto.الصفحة_قيد_التطوير_والتجهيز_2a794f': {
    en: 'Page under development and preparation',
    ur: 'یہ صفحہ تیاری اور ترقی کے مراحل میں ہے',
  },
  'auto.حالة_الاعتماد_6243e3': {
    en: 'Approval Status',
    ur: 'منظوری کی موجودہ حیثیت',
  },
  'auto.مجموع_الأمتار_المنفذة_35950f': {
    en: 'Total Executed Meters:',
    ur: 'مکمل شدہ کل میٹرز کی تعداد:',
  },
  'auto.الوزن_النسبي_للمرحلة_6b8152': {
    en: 'Stage Relative Weight:',
    ur: 'مرحلے کا تناسبی وزن:',
  },
  'auto.الأمتار_المكافئة_المعتمدة_25aee4': {
    en: 'Approved Equivalent Meters',
    ur: 'منظور شدہ مساوی میٹرز کی پیمائش',
  },
  'auto.يمكنك_تغيير_الفلاتر_بالأعلى_أو_536a8c': {
    en: 'You can change filters above or register a new daily entry',
    ur: 'آپ اوپر سے فلٹرز تبدیل کر سکتے ہیں یا نئی انٹری درج کریں',
  },
  'auto.فشل_اعتماد_السجل_155e0f': {
    en: 'Failed to approve record',
    ur: 'ریکارڈ کی منظوری دینے میں ناکامی ہوئی',
  },
  'auto.فشل_تحديث_السجل_26f9fe': {
    en: 'Failed to update record',
    ur: 'ریکارڈ کو اپ ڈیٹ کرنے میں ناکامی ہوئی',
  },
  'auto.منظومة_التدقيق_الهندسي_تقييم_م_2d38ad': {
    en: 'Engineering audit system, performance targets assessment, and formal approval',
    ur: 'انجینئرنگ آڈٹ سسٹم، کارکردگی کا جائزہ اور باقاعدہ منظوری',
  },
  'auto.إجمالي_الأمتار_المنجزة_24df9e': {
    en: 'Total Completed Meters',
    ur: 'مکمل شدہ میٹرز کا کل میزان',
  },
  'auto.للفترة_المحددة_287844': {
    en: 'For Selected Period',
    ur: 'منتخب کردہ مدت کے دوران',
  },
  'auto.أداء_قياسي_ممتاز_3683b5': {
    en: 'Excellent Benchmark Performance',
    ur: 'شاندار اور معیاری کارکردگی',
  },
  'auto.قيد_المراجعة_345943': {
    en: 'Under Review (',
    ur: 'جائزہ و نظر ثانی کے تحت (',
  },
  'auto.المعتمدة_4002dc': {
    en: 'Approved (',
    ur: 'منظور شدہ ریکارڈز (',
  },
  'auto.جميع_السجلات_69f12a': {
    en: 'All Records',
    ur: 'تمام رجسٹرڈ ریکارڈز کی فہرست',
  },
  'auto.نسبة_الإنجاز_التقييم_2a04fc': {
    en: 'Completion Rate (Assessment)',
    ur: 'کام کی تکمیلی شرح (تشخیص)',
  },
  'auto.ملاحظات_المهندس_3c9bd0': {
    en: 'Engineer Notes',
    ur: 'انجینئر کے اہم نوٹس',
  },
  'auto.لا_توجد_ملاحظات_4ef080': {
    en: 'No notes available',
    ur: 'کوئی نوٹس درج نہیں ہیں',
  },
  'auto.ملاحظات_المهندس_وتوجيهات_الاعت_7a889c': {
    en: 'Engineer Notes & Approval Directives (Optional)',
    ur: 'انجینئر کے نوٹس اور منظوری کی ہدایات (اختیاری)',
  },
  'auto.جاري_الاعتماد_32811a': {
    en: 'Approving...',
    ur: 'منظوری کا عمل جاری ہے...',
  },
};

for (const [k, v] of Object.entries(FINAL_20)) {
  en[k] = v.en;
  ur[k] = v.ur;
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(urPath, JSON.stringify(ur, null, 2) + '\n', 'utf8');
console.log('✅ 20 auto keys updated in en.json and ur.json.');
