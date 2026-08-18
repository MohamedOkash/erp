const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../apps/web/src');

function getFiles(dir, list = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) getFiles(p, list);
    else if (f.name.endsWith('.tsx')) list.push(p);
  }
  return list;
}

const files = getFiles(srcDir);
const results = [];

for (const file of files) {
  if (file.includes('i18n') || file.includes('locales') || file.includes('LanguageSwitcher')) continue;
  const rel = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    let cleaned = line.replace(/\bt\([^)]+\)/g, '');
    cleaned = cleaned.replace(/\/\/.*/, '').replace(/\/\*.*?\*\//g, '');
    cleaned = cleaned.replace(/defaultLabel:\s*['"][^'"]+['"]/g, '');
    cleaned = cleaned.replace(/defaultTitle:\s*['"][^'"]+['"]/g, '');
    cleaned = cleaned.replace(/\|\|\s*['"][^'"]+['"]/g, '');

    if (/[\u0600-\u06FF]/.test(cleaned)) {
      results.push({
        file: rel,
        line: idx + 1,
        raw: trimmed,
      });
    }
  });
}

console.log(`Total strings found: ${results.length}`);
fs.writeFileSync(path.resolve(__dirname, 'extracted_hardcoded.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('Saved to scripts/extracted_hardcoded.json');
