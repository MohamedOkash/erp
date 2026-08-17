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

// Extract t('key') and t("key") and dynamic keys from files
function extractUsedKeys() {
  const files = getAllSourceFiles(srcDir);
  const usedKeys = new Set();
  const dynamicPrefixes = new Set();

  const staticKeyRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]\s*[,)]/g;
  const dynamicConcatRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+\.)['"]\s*\+/g;
  const templateLiteralRegex = /\bt\(`([a-zA-Z0-9_.-]+)\${/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    // Static keys
    let match;
    while ((match = staticKeyRegex.exec(content)) !== null) {
      usedKeys.add(match[1]);
    }

    // Dynamic concatenations like t('nav.groups.' + ...)
    while ((match = dynamicConcatRegex.exec(content)) !== null) {
      dynamicPrefixes.add(match[1]);
    }

    // Template literals like t(`wheel_picker.m${...}`)
    while ((match = templateLiteralRegex.exec(content)) !== null) {
      dynamicPrefixes.add(match[1]);
    }
  }

  // Also include known dynamic arrays
  // Months 1..12
  for (let m = 1; m <= 12; m++) {
    usedKeys.add(`wheel_picker.m${m}`);
  }

  // Sidebar dynamic groups and links
  const sidebarGroups = ['overview', 'operations', 'resources', 'finance', 'reports', 'system'];
  for (const g of sidebarGroups) {
    usedKeys.add(`nav.groups.${g}`);
  }

  const sidebarLinks = [
    'dashboard', 'control_cards', 'daily_report',
    'production', 'boq', 'work_areas', 'attendance', 'transfers',
    'projects', 'branches', 'work_items', 'employees',
    'costs', 'incentives',
    'documents', 'saved_reports', 'alerts',
    'users', 'rbac', 'settings'
  ];
  for (const l of sidebarLinks) {
    usedKeys.add(`nav.links.${l}`);
  }

  return { usedKeys: Array.from(usedKeys).sort(), dynamicPrefixes: Array.from(dynamicPrefixes) };
}

function main() {
  console.log('🔍 Running Deterministic i18n Checker for Construction ERP...\n');

  const { usedKeys, dynamicPrefixes } = extractUsedKeys();
  console.log(`📊 Found ${usedKeys.length} distinct translation keys in use across apps/web/src.`);

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

  console.log('\n--- Missing Keys Audit ---');
  let hasMissing = false;
  const missingReport = { ar: [], en: [], ur: [] };

  for (const key of usedKeys) {
    for (const lang of ['ar', 'en', 'ur']) {
      if (dictionaries[lang][key] === undefined) {
        missingReport[lang].push(key);
        hasMissing = true;
      }
    }
  }

  for (const [lang, missing] of Object.entries(missingReport)) {
    if (missing.length > 0) {
      console.log(`\n❌ [${lang}.json] is missing ${missing.length} keys:`);
      missing.forEach((k) => console.log(`   - "${k}"`));
    } else {
      console.log(`\n✅ [${lang}.json]: 0 missing keys.`);
    }
  }

  if (hasMissing) {
    console.log('\n💥 FAILED: One or more locale dictionaries are incomplete.');
    process.exit(1);
  } else {
    console.log('\n🎉 SUCCESS: 0 missing keys across all 3 locale dictionaries (ar, en, ur).');
    process.exit(0);
  }
}

main();
