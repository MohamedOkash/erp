/**
 * Generate proper English and Urdu translations for all auto.* keys
 * that currently have Arabic text in en.json and ur.json.
 * Uses a comprehensive Arabic-to-English/Urdu mapping.
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.resolve(__dirname, '../apps/web/src/i18n/locales');
const arFile = path.join(localesDir, 'ar.json');
const enFile = path.join(localesDir, 'en.json');
const urFile = path.join(localesDir, 'ur.json');

const ar = JSON.parse(fs.readFileSync(arFile, 'utf8'));
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urFile, 'utf8'));

if (!en.auto) en.auto = {};
if (!ur.auto) ur.auto = {};

// Comprehensive Arabic → English & Urdu translation dictionary
const translations = {
  // ===== Common UI Terms =====
  'هل أنت متأكد': { en: 'Are you sure', ur: 'کیا آپ واقعی' },
  'تأكيد': { en: 'Confirm', ur: 'تصدیق' },
  'إلغاء': { en: 'Cancel', ur: 'منسوخ' },
  'حفظ': { en: 'Save', ur: 'محفوظ کریں' },
  'حذف': { en: 'Delete', ur: 'حذف کریں' },
  'تعديل': { en: 'Edit', ur: 'ترمیم' },
  'إضافة': { en: 'Add', ur: 'شامل کریں' },
  'بحث': { en: 'Search', ur: 'تلاش' },
  'تصدير': { en: 'Export', ur: 'برآمد' },
  'استيراد': { en: 'Import', ur: 'درآمد' },
  'إغلاق': { en: 'Close', ur: 'بند کریں' },
  'تحميل': { en: 'Loading', ur: 'لوڈنگ' },
  'نجاح': { en: 'Success', ur: 'کامیابی' },
  'خطأ': { en: 'Error', ur: 'خرابی' },
  'تحذير': { en: 'Warning', ur: 'انتباہ' },
  'معلومات': { en: 'Information', ur: 'معلومات' },
  'الكل': { en: 'All', ur: 'سب' },
  'لا يوجد': { en: 'None found', ur: 'کچھ نہیں ملا' },
  'لا توجد': { en: 'None found', ur: 'کچھ نہیں ملا' },
  'نعم': { en: 'Yes', ur: 'ہاں' },
  'لا': { en: 'No', ur: 'نہیں' },
  'موافق': { en: 'OK', ur: 'ٹھیک ہے' },
  'رجوع': { en: 'Back', ur: 'واپس' },
  'التالي': { en: 'Next', ur: 'اگلا' },
  'السابق': { en: 'Previous', ur: 'پچھلا' },
  'تطبيق': { en: 'Apply', ur: 'لاگو کریں' },
  'إعادة': { en: 'Reset', ur: 'ری سیٹ' },
  'تفاصيل': { en: 'Details', ur: 'تفصیلات' },
  'عرض': { en: 'View', ur: 'دیکھیں' },
  'جديد': { en: 'New', ur: 'نیا' },
  'تاريخ': { en: 'Date', ur: 'تاریخ' },
  'من': { en: 'From', ur: 'سے' },
  'إلى': { en: 'To', ur: 'تک' },
  'الحالة': { en: 'Status', ur: 'حالت' },
  'الاسم': { en: 'Name', ur: 'نام' },
  'الكود': { en: 'Code', ur: 'کوڈ' },
  'الوصف': { en: 'Description', ur: 'وضاحت' },
  'ملاحظات': { en: 'Notes', ur: 'نوٹس' },
  'الإجمالي': { en: 'Total', ur: 'کل' },
  'المجموع': { en: 'Total', ur: 'کل' },
  'نسبة': { en: 'Percentage', ur: 'فیصد' },
  'عدد': { en: 'Count', ur: 'تعداد' },
  'قيمة': { en: 'Value', ur: 'قدر' },
  'وحدة': { en: 'Unit', ur: 'یونٹ' },
  'كمية': { en: 'Quantity', ur: 'مقدار' },
  'سعر': { en: 'Price', ur: 'قیمت' },
  'تكلفة': { en: 'Cost', ur: 'لاگت' },
  'ريال': { en: 'SAR', ur: 'ریال' },
  
  // ===== Domain Terms =====
  'سياسة': { en: 'Policy', ur: 'پالیسی' },
  'سياسات': { en: 'Policies', ur: 'پالیسیاں' },
  'دوام': { en: 'Work hours', ur: 'کام کے اوقات' },
  'حضور': { en: 'Attendance', ur: 'حاضری' },
  'انصراف': { en: 'Departure', ur: 'رخصتی' },
  'غياب': { en: 'Absence', ur: 'غیر حاضری' },
  'تأخر': { en: 'Late', ur: 'تاخیر' },
  'متأخر': { en: 'Late', ur: 'تاخیر سے' },
  'حاضر': { en: 'Present', ur: 'حاضر' },
  'غائب': { en: 'Absent', ur: 'غائب' },
  'معذور': { en: 'Excused', ur: 'معذور' },
  'بصمة': { en: 'Fingerprint', ur: 'فنگر پرنٹ' },
  'إنتاجية': { en: 'Productivity', ur: 'پیداواریت' },
  'إنتاج': { en: 'Production', ur: 'پیداوار' },
  'مشروع': { en: 'Project', ur: 'پروجیکٹ' },
  'مشاريع': { en: 'Projects', ur: 'پروجیکٹس' },
  'فرع': { en: 'Branch', ur: 'شاخ' },
  'فروع': { en: 'Branches', ur: 'شاخیں' },
  'موظف': { en: 'Employee', ur: 'ملازم' },
  'موظفون': { en: 'Employees', ur: 'ملازمین' },
  'عامل': { en: 'Worker', ur: 'مزدور' },
  'عمال': { en: 'Workers', ur: 'مزدور' },
  'مشرف': { en: 'Supervisor', ur: 'سپروائزر' },
  'مهندس': { en: 'Engineer', ur: 'انجینئر' },
  'بند': { en: 'Work Item', ur: 'کام کی شے' },
  'بنود': { en: 'Work Items', ur: 'کام کی اشیاء' },
  'أعمال': { en: 'Works', ur: 'کام' },
  'مرحلة': { en: 'Stage', ur: 'مرحلہ' },
  'مراحل': { en: 'Stages', ur: 'مراحل' },
  'منطقة': { en: 'Area', ur: 'علاقہ' },
  'مناطق': { en: 'Areas', ur: 'علاقے' },
  'طابق': { en: 'Floor', ur: 'منزل' },
  'شقة': { en: 'Apartment', ur: 'اپارٹمنٹ' },
  'مقايسة': { en: 'BOQ', ur: 'بی او کیو' },
  'تنفيذ': { en: 'Execution', ur: 'عملدرآمد' },
  'نقل': { en: 'Transfer', ur: 'منتقلی' },
  'تحويل': { en: 'Transfer', ur: 'منتقلی' },
  'صلاحيات': { en: 'Permissions', ur: 'اجازات' },
  'صلاحية': { en: 'Permission', ur: 'اجازت' },
  'دور': { en: 'Role', ur: 'کردار' },
  'أدوار': { en: 'Roles', ur: 'کردار' },
  'مستخدم': { en: 'User', ur: 'صارف' },
  'مستخدمين': { en: 'Users', ur: 'صارفین' },
  'حساب': { en: 'Account', ur: 'اکاؤنٹ' },
  'تنبيه': { en: 'Alert', ur: 'الرٹ' },
  'تنبيهات': { en: 'Alerts', ur: 'الرٹس' },
  'إشعار': { en: 'Notification', ur: 'اطلاع' },
  'إشعارات': { en: 'Notifications', ur: 'اطلاعات' },
  'تقرير': { en: 'Report', ur: 'رپورٹ' },
  'تقارير': { en: 'Reports', ur: 'رپورٹس' },
  'مستند': { en: 'Document', ur: 'دستاویز' },
  'مستندات': { en: 'Documents', ur: 'دستاویزات' },
  'أرشيف': { en: 'Archive', ur: 'آرکائیو' },
  'إعدادات': { en: 'Settings', ur: 'ترتیبات' },
  'حوافز': { en: 'Incentives', ur: 'مراعات' },
  'مكافآت': { en: 'Bonuses', ur: 'انعامات' },
  'مكافأة': { en: 'Bonus', ur: 'انعام' },
  'تكاليف': { en: 'Costs', ur: 'اخراجات' },
  'مصروفات': { en: 'Expenses', ur: 'اخراجات' },
  'جلسة': { en: 'Session', ur: 'سیشن' },
  'نظام': { en: 'System', ur: 'نظام' },
  'كلمة المرور': { en: 'Password', ur: 'پاسورڈ' },
  'اسم المستخدم': { en: 'Username', ur: 'صارف نام' },
  'تسجيل الدخول': { en: 'Login', ur: 'لاگ ان' },
  'تسجيل الخروج': { en: 'Logout', ur: 'لاگ آؤٹ' },
  'لوحة التحكم': { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  'بطاقة': { en: 'Card', ur: 'کارڈ' },
  'بطاقات': { en: 'Cards', ur: 'کارڈز' },
  'التقرير اليومي': { en: 'Daily Report', ur: 'روزانہ رپورٹ' },
  'عرض الكل': { en: 'View All', ur: 'سب دیکھیں' },
  'مستهدف': { en: 'Target', ur: 'ہدف' },
  'فعلي': { en: 'Actual', ur: 'حقیقی' },
  'انحراف': { en: 'Deviation', ur: 'انحراف' },
  'نشطة': { en: 'Active', ur: 'فعال' },
  'معطلة': { en: 'Disabled', ur: 'غیر فعال' },
  'قيد التطوير': { en: 'Under Development', ur: 'زیر تعمیر' },
  'جاري التحقق': { en: 'Verifying', ur: 'تصدیق ہو رہی ہے' },
  'محارة': { en: 'Plastering', ur: 'پلاسٹرنگ' },
  'لياسة': { en: 'Plastering', ur: 'پلاسٹرنگ' },
  'دهان': { en: 'Painting', ur: 'پینٹنگ' },
  'جبس': { en: 'Gypsum', ur: 'جپسم' },
  'سيراميك': { en: 'Ceramic', ur: 'سیرامک' },
  'بورسلين': { en: 'Porcelain', ur: 'پورسلین' },
  'رخام': { en: 'Marble', ur: 'سنگ مرمر' },
  'بلك': { en: 'Block', ur: 'بلاک' },
  'مباني': { en: 'Masonry', ur: 'چنائی' },
  'نجار': { en: 'Carpentry', ur: 'بڑھئی' },
  'ألمنيوم': { en: 'Aluminum', ur: 'ایلومینیم' },
  'المنيوم': { en: 'Aluminum', ur: 'ایلومینیم' },
  'كهرب': { en: 'Electrical', ur: 'بجلی' },
  'سباك': { en: 'Plumbing', ur: 'پلمبنگ' },
  'تكييف': { en: 'HVAC', ur: 'ایچ وی اے سی' },
  'عزل': { en: 'Insulation', ur: 'انسولیشن' },
  'إيبوكسي': { en: 'Epoxy', ur: 'ایپوکسی' },
  'ايبوكسي': { en: 'Epoxy', ur: 'ایپوکسی' },
  'إضافي': { en: 'Overtime', ur: 'اوور ٹائم' },
  'معامل': { en: 'Factor', ur: 'فیکٹر' },
  'احتساب': { en: 'Calculation', ur: 'حساب' },
  'ساعة': { en: 'Hour', ur: 'گھنٹہ' },
  'يوم': { en: 'Day', ur: 'دن' },
  'شهر': { en: 'Month', ur: 'مہینہ' },
  'سنة': { en: 'Year', ur: 'سال' },
  'ملف': { en: 'File', ur: 'فائل' },
  'رفع': { en: 'Upload', ur: 'اپ لوڈ' },
  'تحليل': { en: 'Analysis', ur: 'تجزیہ' },
  'مطابقة': { en: 'Matching', ur: 'مطابقت' },
  'اسحب': { en: 'Drag', ur: 'گھسیٹیں' },
  'أفلت': { en: 'Drop', ur: 'چھوڑیں' },
  'اختيار': { en: 'Select', ur: 'منتخب کریں' },
  'إنشاء': { en: 'Create', ur: 'بنائیں' },
  'تحديث': { en: 'Update', ur: 'اپ ڈیٹ' },
  'تفعيل': { en: 'Activate', ur: 'فعال کریں' },
  'تعطيل': { en: 'Deactivate', ur: 'غیر فعال کریں' },
  'تغيير': { en: 'Change', ur: 'تبدیلی' },
  'إعادة تعيين': { en: 'Reset', ur: 'ری سیٹ' },
  'استثناء': { en: 'Exception', ur: 'استثنا' },
  'استثناءات': { en: 'Exceptions', ur: 'استثناءات' },
  'مصفوفة': { en: 'Matrix', ur: 'میٹرکس' },
  'الصلاحيات': { en: 'Permissions', ur: 'اجازات' },
  'مشاركة': { en: 'Share', ur: 'شیئر' },
  'تشغيل': { en: 'Run', ur: 'چلائیں' },
  'نتائج': { en: 'Results', ur: 'نتائج' },
};

// Function to translate an Arabic string to English using dictionary lookup
function translateToEnglish(arabicText) {
  // Direct match first
  if (translations[arabicText]) return translations[arabicText].en;
  
  let result = arabicText;
  
  // Try pattern-based translation
  // Sort by length descending to replace longer phrases first
  const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
  
  for (const arPhrase of sortedKeys) {
    if (result.includes(arPhrase)) {
      result = result.replace(new RegExp(arPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), translations[arPhrase].en);
    }
  }
  
  return result;
}

function translateToUrdu(arabicText) {
  if (translations[arabicText]) return translations[arabicText].ur;
  
  let result = arabicText;
  const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
  
  for (const arPhrase of sortedKeys) {
    if (result.includes(arPhrase)) {
      result = result.replace(new RegExp(arPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), translations[arPhrase].ur);
    }
  }
  
  return result;
}

// Check if a string contains Arabic characters
function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

let enFixed = 0;
let urFixed = 0;

for (const [key, arValue] of Object.entries(ar.auto || {})) {
  // Fix English translations that are still Arabic
  if (en.auto[key] && hasArabic(en.auto[key])) {
    const translated = translateToEnglish(arValue);
    if (translated !== arValue || !hasArabic(translated)) {
      en.auto[key] = translated;
      enFixed++;
    }
  }
  
  // Fix Urdu translations that are still Arabic (Urdu uses same script range but different words)
  if (ur.auto[key] && ur.auto[key] === arValue) {
    const translated = translateToUrdu(arValue);
    if (translated !== arValue) {
      ur.auto[key] = translated;
      urFixed++;
    }
  }
}

fs.writeFileSync(enFile, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(urFile, JSON.stringify(ur, null, 2) + '\n', 'utf8');

console.log(`English: fixed ${enFixed} auto keys`);
console.log(`Urdu: fixed ${urFixed} auto keys`);

// Report remaining Arabic in en.json
let remaining = 0;
for (const [key, val] of Object.entries(en.auto || {})) {
  if (hasArabic(val)) remaining++;
}
console.log(`Remaining Arabic in en.json auto: ${remaining}`);
