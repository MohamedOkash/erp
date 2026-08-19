const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const arRaw = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const enRaw = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const urRaw = JSON.parse(fs.readFileSync(urPath, 'utf8'));

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

const flatAr = flattenObject(arRaw);
const flatEn = flattenObject(enRaw);
const flatUr = flattenObject(urRaw);

const arabicRegex = /[\u0600-\u06FF]/;
const urduDistinctRegex = /[ٹڈڑںھھےپچگژ]/;

// Check whitespace in nested objects
function auditWhitespace(obj, lang, pathPrefix = '') {
  const violations = [];
  if (typeof obj === 'string') {
    if (obj.trim() !== obj) {
      violations.push({ lang, path: pathPrefix, type: 'value', value: obj });
    }
    return violations;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      violations.push(...auditWhitespace(item, lang, `${pathPrefix}[${idx}]`));
    });
    return violations;
  }
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
      if (key.trim() !== key) {
        violations.push({ lang, path: currentPath, type: 'key', key });
      }
      violations.push(...auditWhitespace(value, lang, currentPath));
    }
  }
  return violations;
}

// Allowlist for technical abbreviations in Arabic
const allowedLatinTokens = new Set([
  'SAR', 'BOQ', 'ERP', 'API', 'EXCEL', 'XLSX', 'PDF', 'CSV', 'JSON', 'RBAC', 'ID', 'UUID',
  'CRW', 'PLST', 'GPC', 'BLOCK', 'EPOXY', 'TUNNEL', 'GP', 'CEILING', 'ENGINEER', 'FOREMAN',
  'SACODECO', 'V1', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HR', 'OK', 'URL', 'UI', 'UX',
  'A', 'B', 'C', 'D', 'N', 'M', 'KG', 'M2', 'M3', 'CM', 'MM', 'PC', 'PCS', 'ZKTECO', 'SUPREMA',
  'KB', 'MB', 'GB', 'TB', 'RUH', 'JED', 'DMM', 'KSA', 'FAHAD_ENG', 'ADMIN', 'BACKEND', 'FRONTEND',
  'SHOP', 'DRAWINGS', 'SPA', 'VERCEL', 'GF', 'PLS', 'YYYY', 'MM', 'DD', 'HH', 'SS'
]);

function hasDisallowedLatinInAr(val) {
  let cleanStr = val.replace(/\{[A-Za-z0-9_]+\}/g, '');
  cleanStr = cleanStr.replace(/[A-Z0-9_\-\.]+@[A-Z0-9_\-\.]+/gi, '');
  const words = cleanStr.match(/[A-Za-z]+/g) || [];
  for (const word of words) {
    const upper = word.toUpperCase();
    if (allowedLatinTokens.has(upper)) continue;
    if (/^[A-Z]{1,6}$/i.test(word) && ['M','K','B'].includes(upper)) continue;
    return true;
  }
  return false;
}

const whitespace_violations = [
  ...auditWhitespace(arRaw, 'ar'),
  ...auditWhitespace(enRaw, 'en'),
  ...auditWhitespace(urRaw, 'ur')
];

const system_item_violations = [];
const untranslated_en = [];
const untranslated_ur = [];
const wrong_ar = [];
const missing_keys = [];

const allKeys = Array.from(new Set([...Object.keys(flatAr), ...Object.keys(flatEn), ...Object.keys(flatUr)]));

for (const key of allKeys) {
  const arVal = flatAr[key];
  const enVal = flatEn[key];
  const urVal = flatUr[key];

  // 1. Missing keys
  if (arVal === undefined || enVal === undefined || urVal === undefined) {
    missing_keys.push({
      key,
      ar: arVal !== undefined,
      en: enVal !== undefined,
      ur: urVal !== undefined,
    });
  }

  // 2. System Item in EN
  if (enVal !== undefined && enVal.toLowerCase().includes('system item')) {
    system_item_violations.push({ key, value: enVal });
  }

  // 3. Untranslated EN (contains Arabic letters)
  if (enVal !== undefined && arabicRegex.test(enVal)) {
    untranslated_en.push({ key, value: enVal });
  }

  // 4. Untranslated UR: identical to AR or lacking distinct Urdu characters for strings > 10 chars
  if (urVal !== undefined && arVal !== undefined) {
    if (urVal.trim() === arVal.trim() && arabicRegex.test(arVal) && arVal.trim() !== '؟') {
      untranslated_ur.push({ key, value: urVal, reason: 'Identical to Arabic string' });
    } else if (urVal.trim().length > 10 && !urduDistinctRegex.test(urVal) && arabicRegex.test(urVal)) {
      untranslated_ur.push({ key, value: urVal, reason: 'Lacks distinct Urdu characters (>10 chars)' });
    }
  }

  // 5. Wrong AR (contains foreign Latin text not in allowlist)
  if (arVal !== undefined && hasDisallowedLatinInAr(arVal)) {
    wrong_ar.push({ key, value: arVal });
  }
}

console.log('====================================================');
console.log('       TRANSLATION QUALITY AUDIT REPORT');
console.log('====================================================');
console.log(`Total Keys Audited: ${allKeys.length}`);
console.log(`- whitespace_violations: ${whitespace_violations.length}`);
console.log(`- system_item_en:        ${system_item_violations.length}`);
console.log(`- untranslated_en:       ${untranslated_en.length}`);
console.log(`- untranslated_ur:       ${untranslated_ur.length}`);
console.log(`- wrong_ar:              ${wrong_ar.length}`);
console.log(`- missing_keys:          ${missing_keys.length}`);
console.log('====================================================\n');

if (whitespace_violations.length > 0) {
  console.log(`[!] Category: whitespace_violations (Total: ${whitespace_violations.length}):`);
  whitespace_violations.slice(0, 10).forEach((v) => {
    console.log(`   [${v.lang}.json] ${v.type} at "${v.path}": "${v.key || v.value}"`);
  });
  console.log('');
}

if (system_item_violations.length > 0) {
  console.log(`[!] Category: system_item_en (Total: ${system_item_violations.length}):`);
  system_item_violations.slice(0, 10).forEach((item) => {
    console.log(`   [${item.key}]: "${item.value}"`);
  });
  console.log('');
}

if (untranslated_en.length > 0) {
  console.log(`[!] Category: untranslated_en (Total: ${untranslated_en.length}):`);
  untranslated_en.slice(0, 10).forEach((item) => {
    console.log(`   [${item.key}]: "${item.value}"`);
  });
  console.log('');
}

if (untranslated_ur.length > 0) {
  console.log(`[!] Category: untranslated_ur (Total: ${untranslated_ur.length}):`);
  untranslated_ur.slice(0, 10).forEach((item) => {
    console.log(`   [${item.key}]: "${item.value}" (${item.reason})`);
  });
  console.log('');
}

if (wrong_ar.length > 0) {
  console.log(`[!] Category: wrong_ar (Total: ${wrong_ar.length}):`);
  wrong_ar.slice(0, 10).forEach((item) => {
    console.log(`   [${item.key}]: "${item.value}"`);
  });
  console.log('');
}

if (missing_keys.length > 0) {
  console.log(`[!] Category: missing_keys (Total: ${missing_keys.length}):`);
  missing_keys.slice(0, 10).forEach((item) => {
    console.log(`   [${item.key}] -> AR:${item.ar}, EN:${item.en}, UR:${item.ur}`);
  });
  console.log('');
}

const totalErrors = whitespace_violations.length + system_item_violations.length + untranslated_en.length + untranslated_ur.length + wrong_ar.length + missing_keys.length;

if (totalErrors > 0) {
  console.error(`❌ AUDIT FAILED: Found ${totalErrors} translation quality defects.`);
  process.exit(1);
} else {
  console.log('✅ AUDIT PASSED: 100% translation purity and parity across ar, en, ur.');
  process.exit(0);
}
