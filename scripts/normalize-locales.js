const fs = require('fs');
const path = require('path');

const LOCALES = ['ar', 'en', 'ur'];
const LOCALES_DIR = path.resolve(__dirname, '../apps/web/src/i18n/locales');

function normalizeObject(obj, stats) {
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed !== obj) {
      stats.valuesTrimmed++;
    }
    return trimmed;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeObject(item, stats));
  }

  if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const trimmedKey = key.trim();
      if (trimmedKey !== key) {
        stats.keysTrimmed++;
      }

      const normalizedVal = normalizeObject(value, stats);

      if (Object.prototype.hasOwnProperty.call(newObj, trimmedKey)) {
        stats.collisions++;
        // If current is empty and incoming is non-empty, prefer incoming
        if (!newObj[trimmedKey] && normalizedVal) {
          newObj[trimmedKey] = normalizedVal;
        }
      } else {
        newObj[trimmedKey] = normalizedVal;
      }
    }
    return newObj;
  }

  return obj;
}

function run() {
  console.log('🧹 Running normalize-locales: Deep-trimming keys and values in locale files...\n');
  const summary = {};

  for (const lang of LOCALES) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    const stats = { keysTrimmed: 0, valuesTrimmed: 0, collisions: 0 };
    const rawData = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(rawData);
    } catch (e) {
      console.error(`❌ Error parsing ${filePath}:`, e.message);
      continue;
    }

    const normalized = normalizeObject(parsed, stats);
    fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2) + '\n', 'utf8');

    summary[lang] = stats;
    console.log(`[${lang}.json] Keys trimmed: ${stats.keysTrimmed} | Values trimmed: ${stats.valuesTrimmed} | Collisions: ${stats.collisions}`);
  }

  console.log('\n✅ normalize-locales complete. All locale files formatted with 2-spaces.');
  return summary;
}

if (require.main === module) {
  run();
}

module.exports = { run };
