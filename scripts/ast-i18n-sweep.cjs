const fs = require('fs');
const path = require('path');
const ts = require(path.resolve(__dirname, '../apps/web/node_modules/typescript'));

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

// Dictionary for construction terminology
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
    .slice(0, 30);
  
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

function getFiles(dir, list = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) getFiles(p, list);
    else if (f.name.endsWith('.tsx')) list.push(p);
  }
  return list;
}

function transformFile(filePath) {
  if (filePath.includes('i18n') || filePath.includes('locales') || filePath.includes('LanguageSwitcher')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  if (!/[\u0600-\u06FF]/.test(content)) return;

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const replacements = [];

  function isDescendantOfTCall(node) {
    let parent = node.parent;
    while (parent) {
      if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === 't') {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  function visit(node) {
    // 1. JsxText containing Arabic
    if (ts.isJsxText(node)) {
      const text = node.text;
      if (/[\u0600-\u06FF]/.test(text)) {
        const trimmed = text.trim();
        if (trimmed.length > 0) {
          const key = registerKey(trimmed);
          if (key) {
            replacements.push({
              start: node.getStart(sourceFile),
              end: node.getEnd(),
              replacement: `{t('${key}')}`,
            });
          }
        }
      }
    }

    // 2. JsxAttribute with string literal: placeholder="نص عربي", title="نص عربي", etc.
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const text = node.initializer.text;
      if (/[\u0600-\u06FF]/.test(text)) {
        const key = registerKey(text);
        if (key) {
          replacements.push({
            start: node.initializer.getStart(sourceFile),
            end: node.initializer.getEnd(),
            replacement: `{t('${key}')}`,
          });
        }
      }
    }

    // 3. String literals in JS expressions (outside t() calls and outside import declarations)
    if (ts.isStringLiteral(node) && !ts.isImportDeclaration(node.parent) && !isDescendantOfTCall(node)) {
      // Don't replace if it's already an attribute initializer (handled above)
      if (!ts.isJsxAttribute(node.parent)) {
        const text = node.text;
        if (/[\u0600-\u06FF]/.test(text)) {
          // Avoid object keys e.g. { 'نص': val }
          if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) {
            // key name, skip
          } else {
            const key = registerKey(text);
            if (key) {
              replacements.push({
                start: node.getStart(sourceFile),
                end: node.getEnd(),
                replacement: `t('${key}')`,
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (replacements.length === 0) return;

  // Sort replacements in reverse order (bottom-up) to keep offsets intact
  replacements.sort((a, b) => b.start - a.start);

  let newContent = content;
  for (const r of replacements) {
    newContent = newContent.slice(0, r.start) + r.replacement + newContent.slice(r.end);
  }

  // Ensure useI18n import exists
  if (!newContent.includes('useI18n')) {
    const isUnderComponents = filePath.includes(path.join('apps', 'web', 'src', 'components')) && !filePath.includes('layout');
    const importPath = isUnderComponents ? '../i18n/I18nContext' : '../../i18n/I18nContext';
    newContent = `import { useI18n } from '${importPath}';\n` + newContent;
  }

  // Ensure const { t } = useI18n(); inside React functional components
  const compRegex = /const\s+([A-Z][a-zA-Z0-9_]*)\s*:\s*React\.FC[^=]*=\s*\([^)]*\)\s*=>\s*{/g;
  let m;
  while ((m = compRegex.exec(newContent)) !== null) {
    const pos = m.index + m[0].length;
    const nextChunk = newContent.slice(pos, pos + 300);
    if (!nextChunk.includes('useI18n()') && !nextChunk.includes('useI18n(')) {
      newContent = newContent.slice(0, pos) + `\n  const { t } = useI18n();` + newContent.slice(pos);
    }
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Transformed: ${path.relative(srcDir, filePath)} (${replacements.length} replacements)`);
}

function main() {
  const files = getFiles(srcDir);
  console.log(`Analyzing ${files.length} TSX files via TypeScript AST...`);
  for (const f of files) {
    transformFile(f);
  }

  fs.writeFileSync(arFile, JSON.stringify(ar, null, 2), 'utf8');
  fs.writeFileSync(enFile, JSON.stringify(en, null, 2), 'utf8');
  fs.writeFileSync(urFile, JSON.stringify(ur, null, 2), 'utf8');

  console.log(`\n🎉 AST Sweep completed. Dictionaries updated with ${Object.keys(ar.auto).length} keys.`);
}

main();
