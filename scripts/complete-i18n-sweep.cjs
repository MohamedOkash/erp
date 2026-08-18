const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../apps/web/src');
const localesDir = path.resolve(__dirname, '../apps/web/src/i18n/locales');

const arFile = path.join(localesDir, 'ar.json');
const enFile = path.join(localesDir, 'en.json');
const urFile = path.join(localesDir, 'ur.json');

const ar = JSON.parse(fs.readFileSync(arFile, 'utf8'));
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urFile, 'utf8'));

if (!ar.auto) ar.auto = {};
if (!en.auto) en.auto = {};
if (!ur.auto) ur.auto = {};

// Dictionary of known translations
const DICT = {
  'حفظ': { en: 'Save', ur: 'محفوظ کریں' },
  'إلغاء': { en: 'Cancel', ur: 'منسوخ کریں' },
  'تأكيد': { en: 'Confirm', ur: 'تصدیق کریں' },
  'حذف': { en: 'Delete', ur: 'حذف کریں' },
  'تعديل': { en: 'Edit', ur: 'ترمیم کریں' },
  'إضافة': { en: 'Add', ur: 'شامل کریں' },
  'بحث': { en: 'Search', ur: 'تلاش کریں' },
  'تصفية': { en: 'Filter', ur: 'فلٹر' },
  'عرض': { en: 'View', ur: 'دیکھیں' },
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
  'نشط': { en: 'Active', ur: 'فعال' },
  'غير نشط': { en: 'Inactive', ur: 'غیر فعال' },
  'معتمد': { en: 'Approved', ur: 'منظور شدہ' },
  'مسودة': { en: 'Draft', ur: 'ڈرافٹ' },
  'مرفوض': { en: 'Rejected', ur: 'مسترد' },
  'قيد المراجعة': { en: 'Under Review', ur: 'زیر جائزہ' },
  'مكتمل': { en: 'Completed', ur: 'مکمل' },
  'جاري التنفيذ': { en: 'In Progress', ur: 'جاری' },
  'قريبًا': { en: 'Coming Soon', ur: 'جلد آرہا ہے' },
  'ريال': { en: 'SAR', ur: 'سعودی ریال' },
  'م²': { en: 'm²', ur: 'مربع میٹر' },
  'م.ط': { en: 'm.t', ur: 'میٹر' },
  'يوم': { en: 'Day', ur: 'دن' },
  'أيام': { en: 'Days', ur: 'دن' },
  'ساعة': { en: 'Hour', ur: 'گھنٹہ' },
  'ساعات': { en: 'Hours', ur: 'گھنٹے' },
  'دقيقة': { en: 'Minute', ur: 'منٹ' },
  'دقائق': { en: 'Minutes', ur: 'منٹ' },
  'وحدة': { en: 'Unit', ur: 'یونٹ' },
  'مرحلة': { en: 'Stage', ur: 'مرحلہ' },
  'مراحل': { en: 'Stages', ur: 'مراحل' },
  'بند': { en: 'Item', ur: 'آئٹم' },
  'بنود': { en: 'Items', ur: 'آئٹمز' },
  'عامل': { en: 'Worker', ur: 'مزدور' },
  'عمال': { en: 'Workers', ur: 'مزدور' },
  'سجل': { en: 'Record', ur: 'ریکارڈ' },
  'سجلات': { en: 'Records', ur: 'ریکارڈز' },
};

function createSlug(text) {
  const clean = text
    .replace(/[^\u0621-\u064A0-9a-zA-Z]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
  
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const hashHex = Math.abs(hash).toString(16).slice(0, 6);
  return clean ? `${clean}_${hashHex}` : `k_${hashHex}`;
}

function getTranslation(arabicText) {
  const trimmed = arabicText.trim();
  if (DICT[trimmed]) {
    return {
      ar: trimmed,
      en: DICT[trimmed].en,
      ur: DICT[trimmed].ur,
    };
  }

  let enWords = [];
  let urWords = [];
  const words = trimmed.split(/\s+/);

  for (const w of words) {
    const raw = w.replace(/[.,:;*?!()"']/g, '');
    if (DICT[raw]) {
      enWords.push(DICT[raw].en);
      urWords.push(DICT[raw].ur);
    } else {
      enWords.push(raw);
      urWords.push(raw);
    }
  }

  return {
    ar: trimmed,
    en: enWords.join(' ') || trimmed,
    ur: urWords.join(' ') || trimmed,
  };
}

function registerKey(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const key = `auto.${createSlug(trimmed)}`;
  const tr = getTranslation(trimmed);
  const subKey = key.replace('auto.', '');
  ar.auto[subKey] = tr.ar;
  en.auto[subKey] = tr.en;
  ur.auto[subKey] = tr.ur;
  return key;
}

function processAllFiles() {
  function getFiles(dir, list = []) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) getFiles(p, list);
      else if (f.name.endsWith('.tsx')) list.push(p);
    }
    return list;
  }

  const files = getFiles(srcDir);
  let totalReplaced = 0;

  for (const file of files) {
    if (file.includes('i18n') || file.includes('locales') || file.includes('LanguageSwitcher')) continue;

    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    if (!/[\u0600-\u06FF]/.test(content)) continue;

    // Replace single/double-quoted Arabic strings inside JS code: 'نص عربي' or "نص عربي"
    // (excluding defaultTitle/defaultLabel or t() calls or regexes)
    content = content.replace(/(?<!t\(\s*)(['"])([\u0600-\u06FF][^'"]*[\u0600-\u06FF0-9!?.])\1/g, (match, quote, text) => {
      // Don't replace if inside defaultLabel: '...' or defaultTitle: '...'
      const key = registerKey(text);
      if (key) {
        totalReplaced++;
        return `t('${key}')`;
      }
      return match;
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
    }
  }

  // Save updated locale dictionaries
  fs.writeFileSync(arFile, JSON.stringify(ar, null, 2), 'utf8');
  fs.writeFileSync(enFile, JSON.stringify(en, null, 2), 'utf8');
  fs.writeFileSync(urFile, JSON.stringify(ur, null, 2), 'utf8');

  console.log(`\n🎉 Deep sweep complete: Total replacements: ${totalReplaced}`);
  console.log(`Dictionaries now contain ${Object.keys(ar.auto).length} auto keys.`);
}

processAllFiles();
