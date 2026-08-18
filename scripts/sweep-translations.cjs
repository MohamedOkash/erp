const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../apps/web/src');
const localesDir = path.resolve(__dirname, '../apps/web/src/i18n/locales');

const arPath = path.join(localesDir, 'ar.json');
const enPath = path.join(localesDir, 'en.json');
const urPath = path.join(localesDir, 'ur.json');

const arDict = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const enDict = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const urDict = JSON.parse(fs.readFileSync(urPath, 'utf8'));

// Common dictionary glossary for construction
const GLOSSARY = {
  'حفظ': { en: 'Save', ur: 'محفوظ کریں' },
  'إلغاء': { en: 'Cancel', ur: 'منسوخ کریں' },
  'تأكيد': { en: 'Confirm', ur: 'تصدیق کریں' },
  'حذف': { en: 'Delete', ur: 'حذف کریں' },
  'تعديل': { en: 'Edit', ur: 'ترمیم کریں' },
  'إضافة': { en: 'Add', ur: 'شامل کریں' },
  'بحث': { en: 'Search', ur: 'تلاش کریں' },
  'تصفية': { en: 'Filter', ur: 'فلٹر' },
  'عرض': { en: 'View', ur: 'دیکھیں' },
  'تحميل': { en: 'Loading...', ur: 'لوڈ ہو رہا ہے...' },
  'تصدير': { en: 'Export', ur: 'برآمد کریں' },
  'استيراد': { en: 'Import', ur: 'درآمد کریں' },
  'طباعة': { en: 'Print', ur: 'پرنٹ کریں' },
  'إغلاق': { en: 'Close', ur: 'بند کریں' },
  'رجوع': { en: 'Back', ur: 'واپس' },
  'التالي': { en: 'Next', ur: 'اگلا' },
  'السابق': { en: 'Previous', ur: 'پچھلا' },
  'التاريخ': { en: 'Date', ur: 'تاریخ' },
  'الوقت': { en: 'Time', ur: 'وقت' },
  'الحالة': { en: 'Status', ur: 'حالت' },
  'الفرع': { en: 'Branch', ur: 'شاخ' },
  'المشروع': { en: 'Project', ur: 'منصوبہ' },
  'البند': { en: 'Work Item', ur: 'کام کی مد' },
  'المرحلة': { en: 'Stage', ur: 'مرحلہ' },
  'المستهدف': { en: 'Target', ur: 'ہدف' },
  'الفعلي': { en: 'Actual', ur: 'حقیقی' },
  'المشرف': { en: 'Supervisor', ur: 'نگران' },
  'الموظف': { en: 'Employee', ur: 'ملازم' },
  'العمالة': { en: 'Workforce', ur: 'افرادی قوت' },
  'الإنتاجية': { en: 'Productivity', ur: 'پیداواری صلاحیت' },
  'الحضور': { en: 'Attendance', ur: 'حاضری' },
  'الانصراف': { en: 'Departure', ur: 'روانگی' },
  'الإضافي': { en: 'Overtime', ur: 'اضافی وقت' },
  'الغياب': { en: 'Absence', ur: 'غیر حاضری' },
  'التكاليف': { en: 'Costs', ur: 'لاگت' },
  'المصروفات': { en: 'Expenses', ur: 'اخراجات' },
  'الحوافز': { en: 'Incentives', ur: 'مراعات' },
  'المكافآت': { en: 'Bonuses', ur: 'بونس' },
  'المستندات': { en: 'Documents', ur: 'دستاویزات' },
  'التقارير': { en: 'Reports', ur: 'رپورٹس' },
  'التنبيهات': { en: 'Alerts', ur: 'انتباہات' },
  'الإشعارات': { en: 'Notifications', ur: 'اطلاعات' },
  'المستخدمين': { en: 'Users', ur: 'صارفین' },
  'الصلاحيات': { en: 'Permissions', ur: 'اجازتیں' },
  'الأدوار': { en: 'Roles', ur: 'کردار' },
  'الإجراءات': { en: 'Actions', ur: 'اقدامات' },
  'التفاصيل': { en: 'Details', ur: 'تفصیلات' },
  'الملاحظات': { en: 'Notes', ur: 'نوٹس' },
  'العملة': { en: 'Currency', ur: 'کرنسی' },
  'متصل': { en: 'Connected', ur: 'منسلک' },
  'غير متصل': { en: 'Offline', ur: 'غیر متصل' },
  'كافة الفروع': { en: 'All Branches', ur: 'تمام شاخیں' },
  'كافة المشاريع': { en: 'All Projects', ur: 'تمام منصوبے' },
  'كافة الأقسام': { en: 'All Categories', ur: 'تمام زمرہ جات' },
  'لا توجد بيانات متاحة': { en: 'No data available', ur: 'کوئی ڈیٹا دستیاب نہیں' },
  'تم الحفظ بنجاح': { en: 'Saved successfully', ur: 'کامیابی سے محفوظ ہو گیا' },
  'تم التعديل بنجاح': { en: 'Updated successfully', ur: 'کامیابی سے اپ ڈیٹ ہو گیا' },
  'تم الحذف بنجاح': { en: 'Deleted successfully', ur: 'کامیابی سے حذف ہو گیا' },
  'حدث خطأ غير متوقع': { en: 'An unexpected error occurred', ur: 'ایک غیر متوقع خرابی پیش آگئی' },
};

function translateText(text) {
  const trimmed = text.trim();
  if (GLOSSARY[trimmed]) {
    return GLOSSARY[trimmed];
  }

  // Simple clean fallback translation generator
  let enWords = [];
  let urWords = [];
  const words = trimmed.split(/\s+/);

  for (const w of words) {
    const cleanWord = w.replace(/[.,:;*?!()"']/g, '');
    if (GLOSSARY[cleanWord]) {
      enWords.push(GLOSSARY[cleanWord].en);
      urWords.push(GLOSSARY[cleanWord].ur);
    } else {
      enWords.push(cleanWord);
      urWords.push(cleanWord);
    }
  }

  return {
    en: enWords.join(' ') || trimmed,
    ur: urWords.join(' ') || trimmed,
  };
}

console.log('Glossary initialized with', Object.keys(GLOSSARY).length, 'terms.');
