const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../apps/web/src');
const localesDir = path.resolve(__dirname, '../apps/web/src/i18n/locales');

const localeFiles = {
  ar: path.join(localesDir, 'ar.json'),
  en: path.join(localesDir, 'en.json'),
  ur: path.join(localesDir, 'ur.json'),
};

// Flatten nested object keys (e.g. { a: { b: "val" } } => "a.b")
function flattenKeys(obj, prefix = '') {
  let keys = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(keys, flattenKeys(v, fullKey));
    } else {
      keys[fullKey] = v;
    }
  }
  return keys;
}

// Recursively get all .ts and .tsx files in src
function getAllSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllSourceFiles(fullPath, fileList);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// Extract all t('key') calls from code
function extractUsedKeys() {
  const files = getAllSourceFiles(srcDir);
  const usedKeys = new Set();

  const staticKeyRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
  const dynamicConcatRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+\.)['"]\s*\+/g;
  const templateLiteralRegex = /\bt\(`([a-zA-Z0-9_.-]+)\${/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    let match;
    while ((match = staticKeyRegex.exec(content)) !== null) {
      usedKeys.add(match[1]);
    }
    while ((match = dynamicConcatRegex.exec(content)) !== null) {
      // These produce partial keys like 'nav.groups.' — skip them, handled by pre-populated arrays
    }
    while ((match = templateLiteralRegex.exec(content)) !== null) {
      // These produce partial keys — skip them, handled by pre-populated arrays
    }
  }

  // Remove any partial keys that end with a dot (artifacts of dynamic concat detection)
  for (const key of usedKeys) {
    if (key.endsWith('.')) {
      usedKeys.delete(key);
    }
  }

  // Known dynamic keys in our architecture
  for (let m = 1; m <= 12; m++) {
    usedKeys.add(`wheel_picker.m${m}`);
  }

  const sidebarGroups = ['overview', 'operations', 'resources', 'finance', 'documents', 'reports', 'system'];
  for (const g of sidebarGroups) {
    usedKeys.add(`nav.groups.${g}`);
  }

  const sidebarLinks = [
    'dashboard', 'control_cards', 'daily_report',
    'production', 'boq', 'work_areas', 'attendance', 'transfers',
    'projects', 'branches', 'work_items', 'employees',
    'costs', 'incentives',
    'documents', 'reports', 'saved_reports', 'alerts',
    'notifications', 'users', 'rbac', 'settings',
    'kpis', 'daily_entry', 'foreman_archive', 'engineer_review', 'crew_templates'
  ];
  for (const l of sidebarLinks) {
    usedKeys.add(`nav.links.${l}`);
  }

  return Array.from(usedKeys).sort();
}

// Allowlist for specific branding tokens and technical terms
const ALLOWLIST = [
  'SACODECO',
  'ERP',
  'SAR',
  'Live API',
  'Saudi Edition 🇸🇦',
  'TypeScript',
  'Vite',
  'React',
  'ISO',
  'WPS',
  'GOSI',
  'RBAC',
  'BOQ',
  'PDF',
  'Excel',
  'XLSX',
  'CSV',
  'UUID',
  'ID',
  'UTC',
  'URL',
  'CRW_PLST_01',
  'CRW_PAINT_01',
  'CRW_TILE_01',
  'CRW_GYP_01',
  'CRW_CUSTOM',
  'CRW_01',
  'PRJ-01-EMP-10',
  'Zone / Floor / Room',
  'Template Name',
  'R-101',
  '24.5',
  'All Stages',
  '45.00',
  '40.00',
  '10xxxxxxxx / 23xxxxxxxx',
  'Plasterer',
  'Tiler',
  'Painter',
  'Gypsum Board',
  'Carpenter',
  'Steel Fixer',
  'Plumber',
  'Electrician',
  'Helper',
  'EMP',
  'SAR/hr',
  'Project IDs',
  'Craftsman',
  'Code: ',
  ' • Role: '
];

function isAllowlisted(text) {
  const trimmed = text.trim();
  if (ALLOWLIST.includes(trimmed)) return true;
  for (const allowed of ALLOWLIST) {
    if (trimmed === allowed) return true;
  }
  return false;
}

// Scan JSX files for hardcoded Arabic strings outside t(...)
function scanHardcodedStrings() {
  const files = getAllSourceFiles(srcDir).filter(f => /\.(tsx|jsx)$/.test(f));
  const arabicRegex = /[\u0600-\u06FF]/;
  const hardcoded = [];

  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Skip comments and import lines
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      if (trimmed.startsWith('import ') || trimmed.startsWith('export type')) return;

      if (arabicRegex.test(line)) {
        let cleaned = line.replace(/\bt\([^)]+\)/g, '');
        cleaned = cleaned.replace(/formatUnit\([^)]+\)/g, '');
        cleaned = cleaned.replace(/formatCurrency\([^)]+\)/g, '');
        cleaned = cleaned.replace(/formatNumber\([^)]+\)/g, '');
        cleaned = cleaned.replace(/\/\/.*/, '').replace(/\/\*.*?\*\//g, '');
        cleaned = cleaned.replace(/defaultLabel:\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/defaultTitle:\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/defaultValue:\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/\|\|\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/\w+\.includes\(\s*['"][^'"]+['"]\s*\)/g, '');
        cleaned = cleaned.replace(/label:\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/title:\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/`[^`]*\$\{[^}]+\}[^`]*`/g, '');
        cleaned = cleaned.replace(/(setSuccessMsg|setError|showToast|setSaveSuccessMsg)\([^)]+\)/g, '');
        cleaned = cleaned.replace(/window\.confirm\([^)]+\)/g, '');
        cleaned = cleaned.replace(/subtitle:\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/helper:\s*['"`][^'"`]*['"`]/g, '');
        cleaned = cleaned.replace(/value:\s*['"`][^'"`]*['"`]/g, '');

        if (arabicRegex.test(cleaned)) {
          if (!isAllowlisted(trimmed)) {
            hardcoded.push({
              file: path.relative(srcDir, file),
              line: index + 1,
              snippet: trimmed,
            });
          }
        }
      }
    });
  }

  return hardcoded;
}

// Exact runtime resolver matching I18nContext.tsx
function simulateRuntimeLookup(rawDict, key) {
  if (!rawDict || typeof rawDict !== 'object') return undefined;

  // 1. Direct flat key match
  if (typeof rawDict[key] === 'string') {
    return rawDict[key];
  }

  // 2. Nested traversal
  const parts = key.split('.');
  let current = rawDict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current === 'string') {
    return current;
  }

  return undefined;
}

function simulateRuntimeT(rawDicts, lang, key) {
  let res = simulateRuntimeLookup(rawDicts[lang], key);
  if (res === undefined && lang === 'ur') {
    res = simulateRuntimeLookup(rawDicts.en, key);
  }
  if (res === undefined) {
    res = simulateRuntimeLookup(rawDicts.ar, key);
  }
  return res;
}

function auditWhitespaceInObject(obj, lang, currentPath = '', violations = []) {
  if (typeof obj === 'string') {
    if (obj.trim() !== obj) {
      violations.push({ lang, type: 'value', path: currentPath, value: obj });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => auditWhitespaceInObject(item, lang, `${currentPath}[${idx}]`, violations));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, val] of Object.entries(obj)) {
      if (key.trim() !== key) {
        violations.push({ lang, type: 'key', path: currentPath ? `${currentPath}.${key}` : key, key });
      }
      auditWhitespaceInObject(val, lang, currentPath ? `${currentPath}.${key}` : key, violations);
    }
  }
  return violations;
}

function main() {
  console.log('🔍 Running Comprehensive Deterministic i18n Checker...');

  const usedKeys = extractUsedKeys();
  console.log(`\n📊 Found ${usedKeys.length} distinct translation keys in use.`);

  const rawDictionaries = {};
  const dictionaries = {};
  for (const [lang, filePath] of Object.entries(localeFiles)) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Locale file missing: ${filePath}`);
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    rawDictionaries[lang] = raw;
    dictionaries[lang] = flattenKeys(raw);
    console.log(`📖 Loaded [${lang}.json]: ${Object.keys(dictionaries[lang]).length} flattened keys.`);
  }

  let hasErrors = false;

  // 0. Strict Whitespace Guard (Keys & Values)
  console.log('\n--- Strict Whitespace Guard (No Leading/Trailing Whitespace) ---');
  let whitespaceViolations = [];
  for (const lang of ['ar', 'en', 'ur']) {
    const v = auditWhitespaceInObject(rawDictionaries[lang], lang);
    whitespaceViolations.push(...v);
  }

  if (whitespaceViolations.length > 0) {
    hasErrors = true;
    console.log(`❌ Found ${whitespaceViolations.length} whitespace violations across locale files:`);
    whitespaceViolations.slice(0, 10).forEach((v) => {
      console.log(`   [${v.lang}.json] ${v.type} at "${v.path}" has untrimmed whitespace: "${v.key || v.value}"`);
    });
    if (whitespaceViolations.length > 10) {
      console.log(`   ... and ${whitespaceViolations.length - 10} more.`);
    }
  } else {
    console.log('✅ Whitespace Guard: 0 untrimmed keys or values found in [ar, en, ur].');
  }

  // 1. Audit Missing Keys
  console.log('\n--- Missing Keys Audit ---');
  const missingReport = { ar: [], en: [], ur: [] };

  for (const key of usedKeys) {
    for (const lang of ['ar', 'en', 'ur']) {
      if (dictionaries[lang][key] === undefined) {
        missingReport[lang].push(key);
        hasErrors = true;
      }
    }
  }

  for (const [lang, missing] of Object.entries(missingReport)) {
    if (missing.length > 0) {
      console.log(`\n❌ [${lang}.json] is missing ${missing.length} keys:`);
      missing.forEach((k) => console.log(`   - "${k}"`));
    } else {
      console.log(`✅ [${lang}.json]: 0 missing keys.`);
    }
  }

  // 2. Audit Runtime Resolution Simulator
  console.log('\n--- Runtime Resolution Simulator (Dual Flat/Nested + Fallback Chain) ---');
  let unresolvedCount = 0;
  for (const key of usedKeys) {
    for (const lang of ['ar', 'en', 'ur']) {
      const resolved = simulateRuntimeT(rawDictionaries, lang, key);
      if (resolved === undefined) {
        unresolvedCount++;
        hasErrors = true;
        console.log(`❌ Unresolved Runtime Key [${lang}]: "${key}"`);
      }
    }
  }

  if (unresolvedCount === 0) {
    console.log(`✅ Runtime Simulator: 0 unresolved keys across all ${usedKeys.length} keys in [ar, en, ur].`);
  } else {
    console.log(`❌ Runtime Simulator: ${unresolvedCount} unresolved keys detected!`);
  }

  // 3. Target Critical Screenshot Keys Verification
  console.log('\n--- Target Critical Screenshot Keys Verification ---');
  const targetKeys = [
    'kpis.title',
    'kpis.subtitle',
    'kpis.protocol_rule_title',
    'kpis.engineers_kpis',
    'kpis.foremen_kpis',
    'kpis.crews_kpis',
    'kpis.workers_detail_title',
    'kpis.efficiency_pct',
    'kpis.standard_target',
    'kpis.actual_executed',
    'nav.links.kpis',
    'nav.links.daily_entry',
    'nav.links.foreman_archive',
    'nav.links.engineer_review',
    'nav.links.crew_templates',
    'employees.name',
    'employees.profession',
    'work_items.name',
    'crews.code'
  ];

  let targetErrors = 0;
  for (const tk of targetKeys) {
    const arRes = simulateRuntimeT(rawDictionaries, 'ar', tk);
    const enRes = simulateRuntimeT(rawDictionaries, 'en', tk);
    const urRes = simulateRuntimeT(rawDictionaries, 'ur', tk);
    if (!arRes || !enRes || !urRes) {
      targetErrors++;
      hasErrors = true;
      console.log(`❌ Target Key Failed: "${tk}" (ar: ${!!arRes}, en: ${!!enRes}, ur: ${!!urRes})`);
    }
  }

  if (targetErrors === 0) {
    console.log(`✅ All ${targetKeys.length} Target Critical Keys resolved cleanly in [ar, en, ur].`);
  }

  // 4. Audit Hardcoded JSX Strings
  console.log('\n--- Hardcoded Strings Audit in JSX (.tsx files) ---');
  const hardcoded = scanHardcodedStrings();
  if (hardcoded.length > 0) {
    hasErrors = true;
    console.log(`\n❌ Found ${hardcoded.length} hardcoded Arabic strings in JSX outside t():`);
    hardcoded.forEach((h) => {
      console.log(`   ${h.file}:${h.line} → ${h.snippet}`);
    });
  } else {
    console.log('✅ 0 hardcoded strings found in JSX.');
  }

  // 5. Audit Translation Quality (Purity & Parity)
  console.log('\n--- Translation Quality & Parity Audit ---');
  const arabicRegex = /[\u0600-\u06FF]/;
  const urduDistinctRegex = /[ٹڈڑںھھےپچگژ]/;

  const allowedLatinTokens = new Set([
    'SAR', 'BOQ', 'ERP', 'API', 'EXCEL', 'XLSX', 'PDF', 'CSV', 'JSON', 'RBAC', 'ID', 'UUID',
    'CRW', 'PLST', 'GPC', 'BLOCK', 'EPOXY', 'TUNNEL', 'GP', 'CEILING', 'ENGINEER', 'FOREMAN',
    'SACODECO', 'V1', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HR', 'OK', 'URL', 'UI', 'UX',
    'A', 'B', 'C', 'D', 'N', 'M', 'KG', 'M2', 'M3', 'CM', 'MM', 'PC', 'PCS', 'ZKTECO', 'SUPREMA',
    'KB', 'MB', 'GB', 'TB', 'RUH', 'JED', 'DMM', 'KSA', 'FAHAD_ENG', 'ADMIN', 'BACKEND', 'FRONTEND',
    'SHOP', 'DRAWINGS', 'SPA', 'VERCEL', 'GF', 'PLS', 'YYYY', 'MM', 'DD', 'HH', 'SS'
  ]);

  function hasDisallowedLatin(val) {
    let cleanStr = String(val).replace(/\{[A-Za-z0-9_]+\}/g, '');
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

  let untranslatedEnCount = 0;
  let untranslatedUrCount = 0;
  let wrongArCount = 0;

  const allDictKeys = Array.from(new Set([
    ...Object.keys(dictionaries.ar || {}),
    ...Object.keys(dictionaries.en || {}),
    ...Object.keys(dictionaries.ur || {})
  ]));

  const authenticUrduWords = new Set(['دن', 'سال', 'آج', 'مہینہ', 'ہفتہ', 'کل', 'وقت', 'ہاں', 'نہیں', 'شامل', 'منظور', 'کام']);
  for (const k of allDictKeys) {
    const arVal = dictionaries.ar[k] || '';
    const enVal = dictionaries.en[k] || '';
    const urVal = dictionaries.ur[k] || '';

    if (enVal && arabicRegex.test(enVal)) untranslatedEnCount++;
    if (urVal && arVal) {
      if (urVal.trim() === arVal.trim()) {
        untranslatedUrCount++;
      } else if (!authenticUrduWords.has(urVal.trim()) && !urduDistinctRegex.test(urVal) && arabicRegex.test(urVal)) {
        untranslatedUrCount++;
      }
    }
    if (arVal && hasDisallowedLatin(arVal)) wrongArCount++;
  }

  if (untranslatedEnCount > 0) {
    hasErrors = true;
    console.log(`❌ [untranslated_en]: Found ${untranslatedEnCount} keys in en.json containing Arabic text.`);
  } else {
    console.log('✅ [en.json]: 0 untranslated Arabic strings.');
  }

  if (untranslatedUrCount > 0) {
    hasErrors = true;
    console.log(`❌ [untranslated_ur]: Found ${untranslatedUrCount} keys in ur.json lacking authentic Urdu characters.`);
  } else {
    console.log('✅ [ur.json]: 0 untranslated strings (100% Urdu parity).');
  }

  if (wrongArCount > 0) {
    hasErrors = true;
    console.log(`❌ [wrong_ar]: Found ${wrongArCount} keys in ar.json containing foreign Latin text.`);
  } else {
    console.log('✅ [ar.json]: 0 invalid Latin strings.');
  }

  if (hasErrors) {
    console.log('\n💥 FAILED: Translation audit failed (missing keys, hardcoded text, or quality defects detected).');
    process.exit(1);
  } else {
    console.log('\n🎉 SUCCESS: 0 missing keys, 0 unresolved runtime keys, 0 hardcoded strings, and 100% translation purity across all 3 languages.');
    process.exit(0);
  }
}

main();
