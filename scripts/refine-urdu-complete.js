const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const arRaw = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const enRaw = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const urRaw = JSON.parse(fs.readFileSync(urPath, 'utf8'));

function flatten(obj, prefix = '') {
  let res = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(res, flatten(v, fullKey));
    } else {
      res[fullKey] = String(v ?? '');
    }
  }
  return res;
}

const flatAr = flatten(arRaw);
const flatEn = flatten(enRaw);

// Regex matching any variant of "کے لیے" / "کے لئے" / "کے لیئے"
const keliyeSuffixRegex = /\s*[\u0643\u06A9][\u06D2\u064A\u06CC]\s+[\u0644][\u064A\u06CC\u0626][\u06D2\u06C1\u0647\u064A\u06CC]\s*$/;

// Helper to check if string genuinely means "for X" (purpose/recipient)
function isLegitimateFor(key = '', arStr = '', enStr = '') {
  const k = key.toLowerCase();
  const a = arStr.trim().toLowerCase();
  const e = enStr.trim().toLowerCase();
  if (k.endsWith('_for') || k.includes('_for_') || k.startsWith('for_')) return true;
  if (e.startsWith('for ') || e.startsWith('to ')) return true;
  if (a.startsWith('من أجل ') || a.startsWith('لأجل ') || a.startsWith('مخصص لـ') || a.startsWith('خاص بـ')) return true;
  return false;
}

let strippedCount = 0;
let refinedCount = 0;

function processUrduString(val, key) {
  if (typeof val !== 'string') return val;
  let str = val.trim();
  const arStr = flatAr[key] || '';
  const enStr = flatEn[key] || '';

  // 1. Remove artificial "کے لیے" / "کے لئے"
  if (keliyeSuffixRegex.test(str) && !isLegitimateFor(key, arStr, enStr)) {
    str = str.replace(keliyeSuffixRegex, '').trim();
    strippedCount++;
  }

  // 2. High quality domain vocabulary
  const enhancements = [
    { from: /^حیثیت \/ حالت$/, to: 'حیثیت و کیفیت' },
    { from: /^حالت$/, to: 'حیثیت و حالت' },
    { from: /^آن لائن متصل$/, to: 'آن لائن منسلک ہے' },
    { from: /^آف لائن غیر متصل$/, to: 'آف لائن رابطہ منقطع ہے' },
    { from: /^خوش آمدید، \{name\}$/, to: 'خوش آمدید، {name} صاحب' },
    { from: /^تخمینی منافع کا مارجن$/, to: 'تخمینی منافع کے مارجن کا حساب' },
    { from: /^عمومی جائزہ اور قیادت$/, to: 'انتظامی جائزہ اور قیادت کے امور' },
    { from: /^افرادی قوت، آلات اور نرخ$/, to: 'افرادی قوت، آلات اور طے شدہ ریٹس' },
    { from: /^افرادی قوت اور عملہ$/, to: 'افرادی قوت اور سائٹ کا عملہ' },
    { from: /^کنٹرول پینل اور انتظامی ڈیش بورڈ$/, to: 'کنٹرول پینل اور انتظامی ڈیش بورڈ' },
  ];

  for (const { from, to } of enhancements) {
    if (from.test(str)) {
      str = to;
      refinedCount++;
      break;
    }
  }

  return str;
}

function walkUrdu(obj, prefix = '') {
  if (typeof obj === 'string') {
    return processUrduString(obj, prefix);
  }
  if (Array.isArray(obj)) {
    return obj.map((item, idx) => walkUrdu(item, `${prefix}[${idx}]`));
  }
  if (typeof obj === 'object' && obj !== null) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      res[k] = walkUrdu(v, fullKey);
    }
    return res;
  }
  return obj;
}

console.log('🌟 Running Task 4: Complete Urdu Refinement (ur.json)...\n');
const newUr = walkUrdu(urRaw, '');

fs.writeFileSync(urPath, JSON.stringify(newUr, null, 2) + '\n', 'utf8');
console.log(`✅ Stripped artificial suffixes from ${strippedCount} strings.`);
console.log(`✅ Refined ${refinedCount} phrases into natural Urdu.`);
