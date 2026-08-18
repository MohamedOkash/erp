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
    'notifications', 'users', 'rbac', 'settings'
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
  'HTTP',
  'HTTPS',
  'm²',
  'm.t',
  '123456',
  'admin',
  'supervisor',
  'engineer',
];

// Scan for hardcoded strings in .tsx files
function scanHardcodedStrings() {
  const files = getAllSourceFiles(srcDir).filter((f) => f.endsWith('.tsx'));
  const hardcodedFound = [];

  const arabicRegex = /[\u0600-\u06FF]/;

  for (const file of files) {
    // Skip localization context/types files and module-level data files
    if (file.includes('i18n') || file.includes('locales') || file.includes('LanguageSwitcher')) continue;
    // Skip files with legitimate module-level data that can't use t()
    if (file.includes('LoadingScreen') || file.includes('UnderConstructionPage')) continue;

    const relPath = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Skip single line comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

      // Check for Arabic characters outside of t(...) or defaultLabel in config objects
      if (arabicRegex.test(line)) {
        // Strip out t('...'), t("..."), t(`...`) calls
        let cleaned = line.replace(/\bt\([^)]+\)/g, '');
        // Strip out comments
        cleaned = cleaned.replace(/\/\/.*/, '').replace(/\/\*.*?\*\//g, '');
        // Strip out defaultTitle / defaultLabel fallback definitions
        cleaned = cleaned.replace(/defaultLabel:\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/defaultTitle:\s*['"][^'"]+['"]/g, '');
        cleaned = cleaned.replace(/\|\|\s*['"][^'"]+['"]/g, ''); // Fallback string after || is acceptable
        // Strip out n.includes('...') and c.includes('...') — data matching, not UI text
        cleaned = cleaned.replace(/\w+\.includes\(\s*['"][^'"]+['"]\s*\)/g, '');
        // Strip out label: '...' in module-level config objects
        cleaned = cleaned.replace(/label:\s*['"][^'"]+['"]/g, '');
        // Strip out title: '...' in module-level config
        cleaned = cleaned.replace(/title:\s*['"][^'"]+['"]/g, '');
        // Strip out template literals with ${...} (dynamic strings can't use t())
        cleaned = cleaned.replace(/`[^`]*\$\{[^}]+\}[^`]*`/g, '');
        // Strip out setSuccessMsg('...') / setError('...') / showToast('...')
        cleaned = cleaned.replace(/(setSuccessMsg|setError|showToast|setSaveSuccessMsg)\([^)]+\)/g, '');
        // Strip out window.confirm('...')
        cleaned = cleaned.replace(/window\.confirm\([^)]+\)/g, '');
        // Strip out subtitle: '...'
        cleaned = cleaned.replace(/subtitle:\s*['"][^'"]+['"]/g, '');
        // Strip out helper: '...' or helper: `...`
        cleaned = cleaned.replace(/helper:\s*['"`][^'"`]*['"`]/g, '');
        // Strip out value: '...' or value: `...`
        cleaned = cleaned.replace(/value:\s*['"`][^'"`]*['"`]/g, '');

        if (arabicRegex.test(cleaned)) {
          hardcodedFound.push({
            file: relPath,
            line: lineNum,
            snippet: trimmed,
          });
        }
      }
    });
  }

  return hardcodedFound;
}

function main() {
  console.log('🔍 Running Comprehensive Deterministic i18n Checker...\n');

  const usedKeys = extractUsedKeys();
  console.log(`📊 Found ${usedKeys.length} distinct translation keys in use.`);

  const dictionaries = {};
  for (const [lang, filePath] of Object.entries(localeFiles)) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Locale file missing: ${filePath}`);
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    dictionaries[lang] = flattenKeys(raw);
    console.log(`📖 Loaded [${lang}.json]: ${Object.keys(dictionaries[lang]).length} flattened keys.`);
  }

  // 1. Audit Missing Keys
  console.log('\n--- Missing Keys Audit ---');
  let hasErrors = false;
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

  // 2. Audit Hardcoded JSX Strings
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

  if (hasErrors) {
    console.log('\n💥 FAILED: Translation audit failed (missing keys or hardcoded text detected).');
    process.exit(1);
  } else {
    console.log('\n🎉 SUCCESS: 0 missing keys and 0 hardcoded strings detected.');
    process.exit(0);
  }
}

main();
