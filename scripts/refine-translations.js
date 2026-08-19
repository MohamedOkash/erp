const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urPath, 'utf8'));

// Specific translations map for core domain terms and key items
const DOMAIN_REPLACEMENTS = {
  // Key items
  'wheel_picker.day': { en: 'Day', ur: 'دن' },
  'wheel_picker.month': { en: 'Month', ur: 'مہینہ' },
  'wheel_picker.year': { en: 'Year', ur: 'سال' },
  'wheel_picker.today': { en: 'Today', ur: 'آج' },
  'wheel_picker.placeholder_date': { en: 'Select Date (YYYY-MM-DD)', ur: 'تاریخ منتخب کریں (YYYY-MM-DD)' },
  'wheel_picker.placeholder_month': { en: 'Select Month (YYYY-MM)', ur: 'مہینہ منتخب کریں (YYYY-MM)' },

  // Auto keys for core domain concepts
  'auto.محارة_طرطشة_بؤج_PLS_01_3af384': { en: 'e.g. Plastering, Spatterdash, Screeds, PLS-01', ur: 'مثال کے طور پر پلاسٹر، چھینٹے، پٹیاں، PLS-01' },
  'auto.مراجعة_واعتماد_الإنتاجية_الميد_15964b': { en: 'Field Productivity Review & Approval', ur: 'میدانی پیداواری صلاحیت کا جائزہ اور منظوری' },
  'auto.اعتماد_اليومية_هندسيا_3f2804': { en: 'Engineer Approval for Daily Log', ur: 'روزنامچے کی انجینئرنگ منظوری' },
  'auto.تأكيد_الاعتماد_الهندسي_4ac2d9': { en: 'Confirm Engineer Approval', ur: 'انجینئرنگ منظوری کی تصدیق کریں' },
  'auto.بانتظار_اعتماد_المهندس_29853d': { en: 'Pending Engineer Approval', ur: 'انجینئر کی منظوری کا انتظار' },
  'auto.السجلات_المعتمدة_3d6e33': { en: 'Approved Records', ur: 'منظور شدہ ریکارڈز' },
  'auto.معتمدة_نهائيا_4f7aa9': { en: 'Final Approved', ur: 'حتمی طور پر منظور شدہ' },
  'auto.جاري_تحميل_بنود_ومراحل_التشطيب_48a57e': { en: 'Loading finishing work items & stages...', ur: 'فنشنگ کے کام اور مراحل لوڈ ہو رہے ہیں...' },
  'auto.طرطشة_مسمارية_وتثبيت_شبك_فاي_b508f7': { en: 'Spatterdash & fiber/wire mesh installation', ur: 'چھینٹے اور فائیبر میش کی تنصیب' },
  'auto.زفرة_وعمل_البؤج_والأوتار_واست_e7428f': { en: 'Wall squaring, screeds & level dots', ur: 'دیواروں کی چوکور پیمائش اور لیول پٹیاں' },
  'auto.أمس_cf159e': { en: 'Yesterday', ur: 'گزشتہ کل' },
  'auto.اليوم_104a37': { en: 'Today', ur: 'آج' },
};

function runRefinement() {
  console.log('🔧 Running translation refinement (Phase 3)...\n');

  let enReplacedCount = 0;
  let urReplacedCount = 0;
  const sample10 = [];

  for (const [key, replacement] of Object.entries(DOMAIN_REPLACEMENTS)) {
    const arVal = ar[key] || key;
    const oldEn = en[key];
    const oldUr = ur[key];

    let enChanged = false;
    let urChanged = false;

    if (replacement.en && en[key] !== replacement.en) {
      en[key] = replacement.en;
      enReplacedCount++;
      enChanged = true;
    }

    if (replacement.ur && ur[key] !== replacement.ur) {
      ur[key] = replacement.ur;
      urReplacedCount++;
      urChanged = true;
    }

    if (sample10.length < 10) {
      sample10.push({
        key,
        arabic: arVal,
        enBefore: oldEn || '—',
        enAfter: en[key],
        urBefore: oldUr || '—',
        urAfter: ur[key],
      });
    }
  }

  // Ensure all values are deep trimmed
  for (const k in en) {
    if (typeof en[k] === 'string') en[k] = en[k].trim();
  }
  for (const k in ur) {
    if (typeof ur[k] === 'string') ur[k] = ur[k].trim();
  }

  // Save files
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
  fs.writeFileSync(urPath, JSON.stringify(ur, null, 2) + '\n', 'utf8');

  console.log(`✅ Refined EN translations: ${enReplacedCount} values updated.`);
  console.log(`✅ Refined UR translations: ${urReplacedCount} values updated.\n`);

  console.log('--- Sample 10 Refined Keys (AR -> EN -> UR) ---');
  sample10.forEach((s, idx) => {
    console.log(`\n${idx + 1}. [${s.key}]`);
    console.log(`   AR:  "${s.arabic}"`);
    console.log(`   EN:  "${s.enBefore}" -> "${s.enAfter}"`);
    console.log(`   UR:  "${s.urBefore}" -> "${s.urAfter}"`);
  });

  return { enReplacedCount, urReplacedCount, sample10 };
}

if (require.main === module) {
  runRefinement();
}

module.exports = { runRefinement, DOMAIN_REPLACEMENTS };
