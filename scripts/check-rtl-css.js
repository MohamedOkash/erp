const fs = require('fs');
const path = require('path');

const WEB_SRC = path.resolve(__dirname, '../apps/web/src');

function getAllFiles(dir, exts, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(full, exts, list);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      list.push(full);
    }
  }
  return list;
}

function checkRtlCss() {
  console.log('🔍 Running check-rtl-css: Auditing direction rules across CSS & TSX...');

  let violations = [];

  // 1. Audit CSS files
  const cssFiles = getAllFiles(WEB_SRC, ['.css']);
  for (const file of cssFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    let currentSelector = '';
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.includes('{')) {
        currentSelector = trimmed.split('{')[0].trim();
      }

      // Check for hardcoded direction property outside [dir=...] or body[dir=...]
      if (/^\s*direction\s*:\s*(rtl|ltr)\s*;?/i.test(trimmed)) {
        const isScoped =
          currentSelector.includes('[dir=') ||
          currentSelector.includes(':dir(') ||
          currentSelector.includes('html') ||
          currentSelector.includes('body');

        if (!isScoped) {
          violations.push({
            file: path.relative(WEB_SRC, file),
            line: idx + 1,
            code: trimmed,
            reason: `Hardcoded direction outside [dir="..."] selector (Selector: "${currentSelector}")`,
          });
        }
      }
    });
  }

  // 2. Audit TSX files for static inline direction styles
  const tsxFiles = getAllFiles(WEB_SRC, ['.tsx']);
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      // Match inline direction without variable or dir condition
      if (/style=\{\{[^}]*\bdirection\s*:\s*['"](rtl|ltr)['"][^}]*\}\}/i.test(trimmed)) {
        // Allow dynamic direction like direction: direction or dir === 'rtl'
        if (!/direction\s*:\s*direction/i.test(trimmed) && !/direction\s*:\s*dir/i.test(trimmed)) {
          violations.push({
            file: path.relative(WEB_SRC, file),
            line: idx + 1,
            code: trimmed,
            reason: 'Static hardcoded inline style direction ("rtl"/"ltr") in TSX',
          });
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error(`\n❌ Found ${violations.length} direction-safety violations:`);
    violations.forEach((v) => {
      console.error(`   - [${v.file}:${v.line}] ${v.reason}\n     Snippet: ${v.code}`);
    });
    process.exit(1);
  }

  console.log('✅ check-rtl-css: All direction styles are strictly logical or scoped to [dir="..."]');
  process.exit(0);
}

checkRtlCss();
