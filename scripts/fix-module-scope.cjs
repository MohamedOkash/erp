/**
 * Fix AST sweep mistakes: revert t() calls outside React component scope back to original Arabic text.
 * Reads ar.json to get the reverse mapping from key -> Arabic text.
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.resolve(__dirname, '../apps/web/src/i18n/locales');
const arFile = path.join(localesDir, 'ar.json');
const ar = JSON.parse(fs.readFileSync(arFile, 'utf8'));

// Build reverse map: auto key -> arabic text
const reverseMap = {};
if (ar.auto) {
  for (const [k, v] of Object.entries(ar.auto)) {
    reverseMap[`auto.${k}`] = v;
  }
}

// Files and the line ranges that are at module scope (before the component function)
const fixes = [
  {
    file: path.resolve(__dirname, '../apps/web/src/components/Layout.tsx'),
    // SIDEBAR_GROUPS is module-level constant (lines ~54-124)
    scopeEnd: 125,
  },
  {
    file: path.resolve(__dirname, '../apps/web/src/components/LoadingScreen.tsx'),
    // default param at line 6
    scopeEnd: 7,
  },
  {
    file: path.resolve(__dirname, '../apps/web/src/pages/common/UnderConstructionPage.tsx'),
    // MODULE_DATA is module-level (lines ~22-75)
    scopeEnd: 80,
  },
  {
    file: path.resolve(__dirname, '../apps/web/src/pages/rbac/RbacMatrixPage.tsx'),
    // MODULE_CONFIG is module-level (lines ~30-44)
    scopeEnd: 54,
  },
  {
    file: path.resolve(__dirname, '../apps/web/src/pages/work-items/WorkItemsPage.tsx'),
    // getDepartmentIcon is module-level function (lines ~42-58)
    scopeEnd: 60,
  },
];

let totalFixed = 0;

for (const fix of fixes) {
  if (!fs.existsSync(fix.file)) {
    console.log(`Skipping missing: ${fix.file}`);
    continue;
  }

  const content = fs.readFileSync(fix.file, 'utf8');
  const lines = content.split('\n');
  let changed = false;

  for (let i = 0; i < Math.min(fix.scopeEnd, lines.length); i++) {
    const line = lines[i];
    // Replace t('auto.xxx') with the original Arabic text in quotes
    const replaced = line.replace(/t\('(auto\.[^']+)'\)/g, (match, key) => {
      if (reverseMap[key]) {
        totalFixed++;
        changed = true;
        return `'${reverseMap[key]}'`;
      }
      return match;
    });
    lines[i] = replaced;
  }

  if (changed) {
    fs.writeFileSync(fix.file, lines.join('\n'), 'utf8');
    console.log(`Fixed module-scope t() calls in: ${path.relative(path.resolve(__dirname, '..'), fix.file)}`);
  }
}

// Fix TransfersPage.tsx: rename transfers.map((t) => ...) to transfers.map((item) => ...)
const transfersFile = path.resolve(__dirname, '../apps/web/src/pages/transfers/TransfersPage.tsx');
if (fs.existsSync(transfersFile)) {
  let content = fs.readFileSync(transfersFile, 'utf8');
  // Replace the map callback variable name from t to item (avoid shadowing the t() function)
  if (content.includes('transfers.map((t)')) {
    content = content.replace(/transfers\.map\(\(t\)/g, 'transfers.map((item)');
    // Replace all t. property accesses within the map block with item.
    // We need to be careful to only replace t.xxx (property access) not t('xxx') (function call)
    // Simple approach: replace patterns like {t.xxx} and t.xxx (followed by property chars, not '(' )
    content = content.replace(/\bt\.(\w+)(?!\s*\()/g, (match, prop) => {
      // Only replace if this looks like a transfer property access
      const transferProps = [
        'id', 'employee_name', 'employee_role', 'employee_code',
        'from_project_name', 'to_project_name', 'requester_name',
        'requested_role', 'urgency', 'reason', 'transfer_date',
        'status',
      ];
      if (transferProps.includes(prop)) {
        return `item.${prop}`;
      }
      return match;
    });
    fs.writeFileSync(transfersFile, content, 'utf8');
    console.log('Fixed TransfersPage.tsx variable shadowing (t -> item)');
    totalFixed++;
  }
}

// Fix LoadingScreen.tsx: remove unused useI18n import, revert default param
const loadingFile = path.resolve(__dirname, '../apps/web/src/components/LoadingScreen.tsx');
if (fs.existsSync(loadingFile)) {
  let content = fs.readFileSync(loadingFile, 'utf8');
  // Remove the standalone useI18n import line
  content = content.replace(/import { useI18n } from '[^']*';\n?/g, '');
  fs.writeFileSync(loadingFile, content, 'utf8');
  console.log('Fixed LoadingScreen.tsx: removed unused useI18n import');
  totalFixed++;
}

console.log(`\nTotal fixes applied: ${totalFixed}`);
