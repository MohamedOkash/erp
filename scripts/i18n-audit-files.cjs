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
const fileCounts = {};

for (const file of files) {
  if (file.includes('i18n') || file.includes('locales') || file.includes('LanguageSwitcher')) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let c = 0;
  lines.forEach((l) => {
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return;
    let cleaned = l.replace(/\bt\([^)]+\)/g, '');
    cleaned = cleaned.replace(/\/\/.*/, '').replace(/\/\*.*?\*\//g, '');
    cleaned = cleaned.replace(/defaultLabel:\s*['"][^'"]+['"]/g, '');
    cleaned = cleaned.replace(/defaultTitle:\s*['"][^'"]+['"]/g, '');
    cleaned = cleaned.replace(/\|\|\s*['"][^'"]+['"]/g, '');
    if (/[\u0600-\u06FF]/.test(cleaned)) c++;
  });
  if (c > 0) fileCounts[path.relative(path.resolve(__dirname, '..'), file)] = c;
}

console.log(JSON.stringify(fileCounts, null, 2));
console.log('Total files with hardcoded:', Object.keys(fileCounts).length);
