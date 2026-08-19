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

const flatAr = flattenObject(ar);
const flatEn = flattenObject(en);
const flatUr = flattenObject(ur);

const arabicRegex = /[\u0600-\u06FF]/;
const urduDistinctRegex = /[ٹڈڑںھھےپچگژ]/;

// Allowlist for legitimate technical abbreviations and terms in Arabic context
const allowedLatinTokens = new Set([
  'SAR', 'BOQ', 'ERP', 'API', 'EXCEL', 'XLSX', 'PDF', 'CSV', 'JSON', 'RBAC', 'ID', 'UUID',
  'CRW', 'PLST', 'GPC', 'BLOCK', 'EPOXY', 'TUNNEL', 'GP', 'CEILING', 'ENGINEER', 'FOREMAN',
  'SACODECO', 'V1', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HR', 'OK', 'URL', 'UI', 'UX',
  'A', 'B', 'C', 'D', 'N', 'M', 'KG', 'M2', 'M3', 'CM', 'MM', 'PC', 'PCS', 'ZKTECO', 'SUPREMA',
  'KB', 'MB', 'GB', 'TB', 'RUH', 'JED', 'DMM', 'KSA', 'FAHAD_ENG', 'ADMIN', 'BACKEND', 'FRONTEND',
  'SHOP', 'DRAWINGS', 'SPA', 'VERCEL', 'GF', 'PLS'
]);

function hasDisallowedLatinInAr(val) {
  // Strip out {variable} placeholders like {name}, {count}, {date}
  let cleanStr = val.replace(/\{[A-Za-z0-9_]+\}/g, '');
  // Strip numbers, URLs, email placeholders, and technical code formats
  cleanStr = cleanStr.replace(/[A-Z0-9_\-\.]+@[A-Z0-9_\-\.]+/gi, '');
  
  // Find all remaining pure latin words (only letters A-Z, length >= 2)
  const words = cleanStr.match(/[A-Za-z]+/g) || [];
  for (const word of words) {
    const upper = word.toUpperCase();
    if (allowedLatinTokens.has(upper)) continue;
    if (/^[A-Z]{1,6}$/i.test(word) && ['M','K','B'].includes(upper)) continue;
    return true;
  }
  return false;
}

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

  // 2. Untranslated EN (contains Arabic letters)
  if (enVal !== undefined && arabicRegex.test(enVal)) {
    untranslated_en.push({ key, value: enVal });
  }

  // 3. Untranslated UR (identical to AR or contains Arabic script without distinct Urdu markers)
  if (urVal !== undefined && arVal !== undefined) {
    if (urVal.trim() === arVal.trim() && arVal.trim().length > 0 && arabicRegex.test(arVal)) {
      untranslated_ur.push({ key, value: urVal, reason: 'Identical to Arabic string' });
    } else if (urVal.trim().length > 0 && arabicRegex.test(urVal) && !urduDistinctRegex.test(urVal)) {
      untranslated_ur.push({ key, value: urVal, reason: 'Lacks distinct Urdu characters' });
    }
  }

  // 4. Wrong AR (contains foreign Latin text not in allowlist)
  if (arVal !== undefined && hasDisallowedLatinInAr(arVal)) {
    wrong_ar.push({ key, value: arVal });
  }
}

console.log('====================================================');
console.log('       TRANSLATION QUALITY AUDIT REPORT');
console.log('====================================================');
console.log(`Total Keys Audited: ${allKeys.length}`);
console.log(`- untranslated_en: ${untranslated_en.length}`);
console.log(`- untranslated_ur: ${untranslated_ur.length}`);
console.log(`- wrong_ar:       ${wrong_ar.length}`);
console.log(`- missing_keys:   ${missing_keys.length}`);
console.log('====================================================\n');

if (untranslated_en.length > 0) {
  console.log(`[!] Category 1: untranslated_en (Total: ${untranslated_en.length}, Sample up to 20):`);
  untranslated_en.slice(0, 20).forEach((item, idx) => {
    console.log(`  ${idx + 1}. [${item.key}]: "${item.value}"`);
  });
  console.log('');
}

if (untranslated_ur.length > 0) {
  console.log(`[!] Category 2: untranslated_ur (Total: ${untranslated_ur.length}, Sample up to 20):`);
  untranslated_ur.slice(0, 20).forEach((item, idx) => {
    console.log(`  ${idx + 1}. [${item.key}]: "${item.value}" (${item.reason})`);
  });
  console.log('');
}

if (wrong_ar.length > 0) {
  console.log(`[!] Category 3: wrong_ar (Total: ${wrong_ar.length}, Sample up to 20):`);
  wrong_ar.slice(0, 20).forEach((item, idx) => {
    console.log(`  ${idx + 1}. [${item.key}]: "${item.value}"`);
  });
  console.log('');
}

if (missing_keys.length > 0) {
  console.log(`[!] Category 4: missing_keys (Total: ${missing_keys.length}, Sample up to 20):`);
  missing_keys.slice(0, 20).forEach((item, idx) => {
    console.log(`  ${idx + 1}. [${item.key}] -> AR:${item.ar}, EN:${item.en}, UR:${item.ur}`);
  });
  console.log('');
}

const totalIssues = untranslated_en.length + untranslated_ur.length + wrong_ar.length + missing_keys.length;

if (totalIssues > 0) {
  console.log(`❌ AUDIT FAILED: Found ${totalIssues} translation quality defects.`);
  process.exit(1);
} else {
  console.log('✅ AUDIT PASSED: 100% translation purity and parity across ar, en, ur.');
  process.exit(0);
}
