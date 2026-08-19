const fs = require('fs');
const path = require('path');

const WEB_SRC = path.resolve(__dirname, '../apps/web/src');

function getAllFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(full, list);
    } else if (entry.name.endsWith('.tsx')) {
      list.push(full);
    }
  }
  return list;
}

function checkUnits() {
  console.log('🔍 Running check-units: Scanning for hardcoded literal unit strings in TSX JSX...');

  const tsxFiles = getAllFiles(WEB_SRC);
  const violations = [];

  // Patterns of literal Arabic units in JSX text or string literals:
  // e.g. "ريال", "م2", "م²", "متر", "عدد", "م.ط", "وحدة/يوم", "وحدة"
  const rawUnitPatterns = [
    /(>|\s|'|"|`)(\d+(\.\d+)?\s*(م2|م²|متر|عدد|م\.ط|م3|م³|ريال|وحدة\/يوم))(<|\s|'|"|`)/,
    /(\$\{[^}]+\}\s*(م2|م²|متر|عدد|م\.ط|م3|م³|ريال|وحدة\/يوم))/,
  ];

  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      // Skip comments, imports, translation default values
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      if (trimmed.startsWith('import ') || trimmed.startsWith('export type')) return;

      // Skip lines where unit is handled by t() or formatUnit() or formatCurrency()
      let stripped = line;
      stripped = stripped.replace(/formatUnit\([^)]+\)/g, '');
      stripped = stripped.replace(/formatCurrency\([^)]+\)/g, '');
      stripped = stripped.replace(/t\([^)]+\)/g, '');
      stripped = stripped.replace(/defaultValue:\s*['"][^'"]+['"]/g, '');

      for (const pattern of rawUnitPatterns) {
        if (pattern.test(stripped)) {
          violations.push({
            file: path.relative(WEB_SRC, file),
            line: idx + 1,
            snippet: trimmed,
          });
          break;
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error(`\n❌ Found ${violations.length} hardcoded literal Arabic units in TSX files:`);
    violations.forEach((v) => {
      console.error(`   - [${v.file}:${v.line}] ${v.snippet}`);
    });
    console.error('💡 Use formatUnit(unit, lang) from @/lib/format or t(...) instead of hardcoded strings.');
    process.exit(1);
  }

  console.log('✅ check-units: 0 hardcoded literal Arabic units found across all TSX files.');
  process.exit(0);
}

checkUnits();
