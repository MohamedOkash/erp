const fs = require('fs');
const path = require('path');
const ts = require(path.resolve(__dirname, '../apps/api/node_modules/typescript'));

const SRC_DIR = path.resolve(__dirname, '../apps/web/src');

// Allowlist for brand names, acronyms, technical identifiers, currencies, units
const ALLOWLIST = new Set([
  'SACODECO',
  'ERP',
  'SAR',
  'USD',
  'AED',
  'EGP',
  'QAR',
  'BHD',
  'KWD',
  'OMR',
  'Vite',
  'React',
  'PDF',
  'XLSX',
  'CSV',
  'JSON',
  'PNG',
  'JPG',
  'JPEG',
  'MB',
  'GB',
  'KB',
  'DEV-101',
  'ID',
  'URL',
  'API',
  'UI',
  'UX',
  'OK',
  'v1',
  'v2',
  'LTR',
  'RTL',
]);

const ALLOWED_REGEX = /^(SACODECO|ERP|SAR|USD|AED|EGP|QAR|BHD|KWD|OMR|m²|m³|m|cm|mm|kg|%|\d+(\.\d+)?|\+|\-|\/|\*|÷|×|=|:|#|\s|\.|,|;|\||•|—|–|&|\(|\)|\[|\]|<|>|\{|\}|_|\uD83C[\uDDE6-\uDDFF]){1,}$/i;

// Returns true if string is non-displayable, symbols only, css class, or allowed identifier
function isIgnored(str) {
  const trimmed = str.trim();
  if (!trimmed) return true;
  if (ALLOWED_REGEX.test(trimmed)) return true;
  if (ALLOWLIST.has(trimmed)) return true;
  // Code patterns like BR-01, WI-05, etc.
  if (/^[A-Z0-9_\-]+$/i.test(trimmed) && trimmed.length <= 20) return true;
  return false;
}

// Find files recursively
function getFiles(dir, exts = ['.ts', '.tsx']) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === 'dist' || item.name === 'locales') continue;
      files = files.concat(getFiles(fullPath, exts));
    } else if (exts.some(ext => item.name.endsWith(ext)) && !item.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const findings = [];

  function checkText(text, node, type) {
    const trimmed = text.trim();
    if (!trimmed || isIgnored(trimmed)) return;

    // Check Arabic
    if (/[\u0600-\u06FF]/.test(trimmed)) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push({
        file: filePath,
        line: pos.line + 1,
        col: pos.character + 1,
        type: `${type} (Arabic)`,
        text: trimmed,
      });
      return;
    }

    // Check English (2 or more adjacent words)
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2 && !ALLOWED_REGEX.test(trimmed)) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push({
        file: filePath,
        line: pos.line + 1,
        col: pos.character + 1,
        type: `${type} (English)`,
        text: trimmed,
      });
    }
  }

  function walk(node) {
    // 1. JSX Text between tags: <div>Hello World</div>
    if (node.kind === ts.SyntaxKind.JsxText) {
      checkText(node.text, node, 'JSX Text');
    }

    // 2. JSX String Literals: <div>{'Hello World'}</div>
    if (
      (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) &&
      node.parent &&
      node.parent.kind === ts.SyntaxKind.JsxExpression &&
      node.parent.parent &&
      (node.parent.parent.kind === ts.SyntaxKind.JsxElement || node.parent.parent.kind === ts.SyntaxKind.JsxFragment)
    ) {
      checkText(node.text, node, 'JSX Expression String');
    }

    // 3. Target JSX Attributes: placeholder="Search here", title="...", label="..."
    if (node.kind === ts.SyntaxKind.JsxAttribute) {
      const attrName = node.name.escapedText;
      const targetAttrs = ['placeholder', 'title', 'label', 'aria-label', 'alt', 'helperText', 'emptyMessage'];
      
      if (targetAttrs.includes(attrName) && node.initializer) {
        if (node.initializer.kind === ts.SyntaxKind.StringLiteral) {
          checkText(node.initializer.text, node.initializer, `Attribute (${attrName})`);
        } else if (
          node.initializer.kind === ts.SyntaxKind.JsxExpression &&
          node.initializer.expression &&
          node.initializer.expression.kind === ts.SyntaxKind.StringLiteral
        ) {
          checkText(node.initializer.expression.text, node.initializer.expression, `Attribute (${attrName})`);
        }
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return findings;
}

function main() {
  const files = getFiles(SRC_DIR);
  let totalFindings = [];

  for (const file of files) {
    const findings = scanFile(file);
    if (findings.length > 0) {
      totalFindings = totalFindings.concat(findings);
    }
  }

  const rel = p => path.relative(path.resolve(__dirname, '..'), p).replace(/\\/g, '/');

  console.log(`\n=== SCAN HARDCODED STRINGS REPORT ===`);
  console.log(`Scanned ${files.length} source files in apps/web/src.`);

  if (totalFindings.length === 0) {
    console.log(`\n✅ 0 hardcoded strings found! 100% i18n coverage achieved.\n`);
    process.exit(0);
  } else {
    console.log(`\n❌ Found ${totalFindings.length} hardcoded strings:\n`);
    totalFindings.forEach(f => {
      console.log(`  ${rel(f.file)}:${f.line}:${f.col} [${f.type}] -> "${f.text}"`);
    });
    console.log(`\nTotal hardcoded instances detected: ${totalFindings.length}\n`);
    process.exit(1);
  }
}

main();
