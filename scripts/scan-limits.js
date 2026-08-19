const fs = require('fs');
const path = require('path');

let violationsCount = 0;
let totalLimitCalls = 0;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      scanDir(full);
    } else if (/\.(tsx?|jsx?)$/.test(f)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const matches = line.matchAll(/limit\s*[:=]\s*(\d+)/gi);
        for (const m of matches) {
          totalLimitCalls++;
          const val = parseInt(m[1], 10);
          if (val > 100) {
            violationsCount++;
            console.log(`VIOLATION: ${path.relative(process.cwd(), full)}:${idx + 1} -> limit = ${val}`);
          }
        }
      });
    }
  }
}

console.log('=== SCANNING FOR LIMIT > 100 IN apps/web/src ===');
scanDir(path.resolve('apps/web/src'));
console.log(`\nAudit complete: ${totalLimitCalls} total limit parameters checked.`);
console.log(`Violations (limit > 100): ${violationsCount}`);
if (violationsCount > 0) {
  process.exit(1);
} else {
  console.log('✅ All limits in apps/web/src are strictly <= 100.');
}
