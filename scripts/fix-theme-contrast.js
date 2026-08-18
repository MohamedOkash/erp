const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      results = results.concat(walk(p));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(p);
    }
  }
  return results;
}

const files = walk('apps/web/src');
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace hardcoded color: '#fff' in elements where background is not explicitly colored
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    if (line.includes("color: '#fff'") && !line.includes('background: \'#') && !line.includes('btn-') && !line.includes('linear-gradient')) {
      return line.replace(/color:\s*'#fff'/g, "color: 'var(--text-heading)'");
    }
    if (line.includes('color: "#fff"') && !line.includes('background: "#') && !line.includes('btn-') && !line.includes('linear-gradient')) {
      return line.replace(/color:\s*"#fff"/g, "color: 'var(--text-heading)'");
    }
    return line;
  });

  content = newLines.join('\n');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed #fff in:', file);
  }
}

console.log('Total files cleaned of #fff:', count);
