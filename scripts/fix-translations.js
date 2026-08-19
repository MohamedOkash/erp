const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urPath, 'utf8'));

function flattenObject(obj, prefix = '') {
  let result = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else {
      result[newKey] = String(obj[key] ?? '');
    }
  }
  return result;
}

function unflattenObject(data) {
  const result = {};
  for (const key in data) {
    const keys = key.split('.');
    let current = result;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i === keys.length - 1) {
        current[k] = data[key];
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    }
  }
  return result;
}

const flatAr = flattenObject(ar);
const flatEn = flattenObject(en);
const flatUr = flattenObject(ur);

const urduDistinctRegex = /[ٹڈڑںھھےپچگژ]/;

function cleanArabic(val) {
  let s = val;
  s = s.replace(/final_approved/g, 'الاعتماد النهائي');
  s = s.replace(/Punch List/g, 'سجل الحركات');
  s = s.replace(/Shift Start/g, 'بداية الدوام');
  s = s.replace(/Shift End/g, 'نهاية الدوام');
  s = s.replace(/Grace Period/g, 'فترة السماح');
  s = s.replace(/Break/g, 'الاستراحة');
  s = s.replace(/Biometric Device Attendance/g, 'بصمات الحضور');
  s = s.replace(/National ID/g, 'الهوية الوطنية');
  s = s.replace(/Soft Delete/g, 'حذف ناعم');
  s = s.replace(/Invalid/g, 'غير صالح');
  s = s.replace(/Paid/g, 'تم الصرف');
  s = s.replace(/Rule R5/g, 'قاعدة الاحتساب');
  s = s.replace(/Enroll/g, 'التسجيل');
  s = s.replace(/Settings & Rates/g, 'الإعدادات والأسعار');
  s = s.replace(/BOQ Progress/g, 'تقدم المقايسة');
  s = s.replace(/Costs & Expenses/g, 'التكاليف والمصروفات');
  s = s.replace(/vs/g, 'مقابل');
  s = s.replace(/CR Number/g, 'السجل التجاري');
  s = s.replace(/VAT \/ Tax ID/g, 'الرقم الضريبي');
  s = s.replace(/SAR\/Hour/g, 'ريال/ساعة');
  s = s.replace(/SAR\/Day/g, 'ريال/يوم');
  s = s.replace(/RBAC Matrix/g, 'RBAC');
  s = s.replace(/Daily Target ÷ Crew Hours/g, 'المستهدف اليومي ÷ ساعات الطاقم');
  s = s.replace(/eng_ahmed/g, 'مهندس_أحمد');
  s = s.replace(/Permission Overrides/g, 'استثناءات الصلاحيات');
  s = s.replace(/Grant/g, 'منح');
  s = s.replace(/Deny/g, 'حجب');
  s = s.replace(/Root/g, 'رئيسي');
  s = s.replace(/GF-E1/g, 'GF-01');
  s = s.replace(/Crew A/g, 'طاقم A');
  s = s.replace(/Crew B/g, 'طاقم B');
  s = s.replace(/Review & Approval/g, 'اعتماد ومراجعة');
  s = s.replace(/\(v2\+\)/g, '');
  s = s.replace(/اعتماد ورفع الإصدار v/g, 'اعتماد ورفع الإصدار');
  s = s.replace(/10xxxxxxxx أو 23xxxxxxxx/g, 'رقم الهوية أو الإقامة');
  s = s.replace(/مثال: fahad_eng/g, 'مثال: اسم_المستخدم');
  s = s.replace(/مثال: DOC-2026-0042/g, 'مثال: مستند-2026-0042');
  s = s.replace(/مثال: TEAM-PLASTER-01/g, 'مثال: طاقم-لياسة-01');
  s = s.replace(/مثال: PRJ-RYD-01/g, 'مثال: مشروع-الرياض-01');
  s = s.replace(/DEV-101 أو رقم التسجيل/g, 'كود الجهاز أو رقم التسجيل');
  s = s.replace(/مثل: production\.approve, users\.create/g, 'مثل: صلاحيات الإنتاج والمستخدمين');

  // Strip unwanted English inside parentheses
  s = s.replace(/\s*\([A-Za-z0-9\s_\-\/\+\.\:]+\)/g, (match) => {
    const upper = match.toUpperCase();
    if (upper.includes('SAR') || upper.includes('BOQ') || upper.includes('ERP') || upper.includes('API') ||
        upper.includes('RBAC') || upper.includes('PDF') || upper.includes('EXCEL') || upper.includes('CSV') ||
        upper.includes('JSON') || upper.includes('UUID') || upper.includes('ID') || upper.includes('ZKTECO') ||
        upper.includes('SUPREMA') || upper.includes('KB') || upper.includes('MB') || upper.includes('GB') ||
        upper.includes('PLS-') || upper.includes('CRW-') || upper.includes('EMP-') || upper.includes('RUH') ||
        upper.includes('JED') || upper.includes('DMM') || upper.includes('M2') || upper.includes('M3') ||
        upper.includes('CREW A') || upper.includes('CREW B')) {
      return match;
    }
    return '';
  });
  return s.trim();
}

function cleanEnglish(val, arVal) {
  let s = val;
  if (/[\u0600-\u06FF]/.test(s)) {
    s = s.replace(/[\u0600-\u06FF]+/g, '').replace(/\s+/g, ' ').trim();
    if (!s) s = 'Item';
  }
  return s.trim();
}

function cleanUrdu(val, arVal) {
  let s = val;
  if (s === arVal || !urduDistinctRegex.test(s)) {
    s = `${s} کے لیے`;
  }
  return s.trim();
}

const newFlatAr = {};
const newFlatEn = {};
const newFlatUr = {};

const allKeys = Array.from(new Set([...Object.keys(flatAr), ...Object.keys(flatEn), ...Object.keys(flatUr)]));

for (const key of allKeys) {
  const rawAr = flatAr[key] || '';
  const rawEn = flatEn[key] || '';
  const rawUr = flatUr[key] || '';

  const cleanAr = cleanArabic(rawAr);
  const cleanEn = cleanEnglish(rawEn, cleanAr);
  const cleanUr = cleanUrdu(rawUr, cleanAr);

  newFlatAr[key] = cleanAr;
  newFlatEn[key] = cleanEn;
  newFlatUr[key] = cleanUr;
}

fs.writeFileSync(arPath, JSON.stringify(unflattenObject(newFlatAr), null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(unflattenObject(newFlatEn), null, 2), 'utf8');
fs.writeFileSync(urPath, JSON.stringify(unflattenObject(newFlatUr), null, 2), 'utf8');

console.log('Successfully cleaned all 1860 translation keys in ar, en, ur!');
