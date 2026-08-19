const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urPath, 'utf8'));

// 1. Precise Domain Mappings for English and Urdu
const REPLACEMENTS = {
  // Craft/Trade names
  'auto.محارة_5b3fe8': { en: 'Plastering', ur: 'پلاسٹر کا کام' },
  'auto.لياسة_5b3f00': { en: 'Rendering', ur: 'لیسائی اور پلستر' },
  'auto.دهان_2e7ecf': { en: 'Painting', ur: 'رنگ و روغن کا کام' },
  'auto.جبس_17f037': { en: 'Gypsum', ur: 'جپسم بورڈ کا کام' },
  'auto.سيراميك_4bf785': { en: 'Ceramics', ur: 'سیرامک ٹائل کا کام' },
  'auto.بورسلين_448954': { en: 'Porcelain', ur: 'پورسلین ٹائل کا کام' },
  'auto.رخام_2e877d': { en: 'Marble', ur: 'سنگ مرمر کا کام' },
  'auto.بلك_17e4a7': { en: 'Blockwork', ur: 'بلاک چنائی کا کام' },
  'auto.مباني_5b3da5': { en: 'Masonry', ur: 'دیواروں کی چنائی' },
  'auto.نجار_2f1fc1': { en: 'Carpentry', ur: 'بڑھئی و لکڑی کا کام' },
  'auto.ألمنيوم_52b94f': { en: 'Aluminum', ur: 'ایلومینیم کا کام' },
  'auto.المنيوم_7f2062': { en: 'Aluminum', ur: 'ایلومینیم کا کام' },
  'auto.سباك_2e94a1': { en: 'Plumbing', ur: 'پلمبنگ و سینیٹری کا کام' },
  'auto.صحي_1812b2': { en: 'Plumbing & Sanitary', ur: 'سینیٹری و پلمبنگ کا کام' },
  'auto.تكييف_59cdf5': { en: 'HVAC', ur: 'ایئر کنڈیشننگ و وینٹیلیشن' },
  'auto.عزل_18224b': { en: 'Waterproofing & Insulation', ur: 'واٹر پروفنگ و انسولیشن' },
  'auto.إيبوكسي_1fb85d': { en: 'Epoxy', ur: 'ایپوکسی فلورنگ کا کام' },
  'auto.ايبوكسي_767b2c': { en: 'Epoxy', ur: 'ایپوکسی فلورنگ کا کام' },

  // Key Domain Expressions
  'auto.نظرة_عامة_والقيادة_76d0a0': { en: 'Overview & Leadership', ur: 'عمومی جائزہ اور قیادت' },
  'auto.لوحة_التحكم_والقيادة_64413a': { en: 'Dashboard & Control', ur: 'کنٹرول پینل اور انتظامی ڈیش بورڈ' },
  'auto.بطاقات_التحكم_والبحثية_7a9360': { en: 'Control Cards & Profitability', ur: 'کنٹرول کارڈز اور منافع بخش تجزیہ' },
  'auto.بطاقات_التحكم_والربحية_Control_568f9c': { en: 'Control Cards & Profitability', ur: 'کنٹرول کارڈز اور منافع بخش تجزیہ' },
  'auto.التقرير_اليومي_الموحد_e2181c': { en: 'Unified Daily Report', ur: 'متحدہ یومیہ رپورٹ' },
  'auto.عمليات_الموقع_والتنفيذ_4c2577': { en: 'Site Operations & Execution', ur: 'سائٹ کے آپریشنز اور عمل درآمد' },
  'auto.مناطق_العمل_والمباني_7a9fc4': { en: 'Work Areas & Buildings', ur: 'کام کے زونز اور عمارتیں' },

  // Additional auto keys with natural translations
  'auto.مثال_البؤج_والأوتار_الطرطشة_ال_1dec57': { en: 'Example: Screeds, Level dots, Spatterdash, Plastering...', ur: 'مثال کے طور پر لیول پٹیاں، چھینٹے، پلستر...' },
  'auto.مثال_محارة_طرطشة_بؤج_PLS_01_3af384': { en: 'Example: Plastering, Spatterdash, Screeds, PLS-01...', ur: 'مثال کے طور پر پلاسٹر، چھینٹے، لیول پٹیاں، PLS-01...' },
  'auto.مثال_بياض_محارة_ولياسة_داخلية__56e86e': { en: 'Example: Interior plastering and rendering for rooms and corridors', ur: 'مثال کے طور پر کمروں اور راہداریوں کے لیے اندرونی پلاسٹر اور لیسائی' },
  'auto.مثال_TEAM_PLASTER_01_5bf081': { en: 'Example: TEAM-PLASTER-01', ur: 'مثال: ٹیم-پلاسٹر-01' },
  'auto.تعذر_تحميل_التقرير_اليومي_7b0f98': { en: 'Failed to load daily report', ur: 'روزنامچہ رپورٹ لوڈ کرنے میں ناکامی' },
  'auto.جاري_تجميع_بيانات_التقرير_اليو_2e6a05': { en: 'Compiling daily report data...', ur: 'روزنامچہ رپورٹ کا ڈیٹا مرتب کیا جا رہا ہے...' },
  'auto.طلب_تصحيح_Correction_Request_71634a': { en: 'Correction Request', ur: 'تصحیح کی درخواست' },
  'auto.تقديم_طلب_التصحيح_727105': { en: 'Submit Correction Request', ur: 'تصحیح کی درخواست جمع کروائیں' },
  'auto.تم_تقديم_طلب_التصحيح_بنجاح_2e852b': { en: 'Correction request submitted successfully!', ur: 'تصحیح کی درخواست کامیابی سے جمع ہو گئی!' },
  'auto.طلب_تعديل_تصحيح_إنتاج_مغلق_4b35d6': { en: 'Closed Production Edit / Correction Request', ur: 'بند شدہ پیداوار میں ترمیم / تصحیح کی درخواست' },
  'auto.السجل_معتمد_ومغلق_التصحيح_يضاف_5637e0': { en: 'Record is approved and closed. Correction is added as a cumulative entry after approval.', ur: 'ریکارڈ منظور اور بند ہے۔ تصحیح کو منظوری کے بعد اضافی اندراج کے طور پر شامل کیا جائے گا۔' },
  'auto.نوع_التصحيح_المطلوب_17c5e0': { en: 'Required Correction Type *', ur: 'درکار تصحیح کی قسم *' },
  'auto.إضافة_ملاحظة_تصحيحية_Note_60fa29': { en: 'Add Correction Note', ur: 'تصحیحی نوٹ شامل کریں' },
  'auto.سبب_طلب_التصحيح_والمبرر_الهندس_7d1712': { en: 'Correction Request Reason & Engineering Justification *', ur: 'تصحیح کی وجہ اور انجینئرنگ جواز *' },
  'auto.0_خانات_أرقام_صحيحة_فقط_35008c': { en: '0 decimals (integers only)', ur: '0 اعشاریہ (صرف مکمل اعداد)' },
  'auto.ت_حدد_دقة_تقريب_تكاليف_الوحدة__990b84': { en: 'Determines rounding precision for unit costs, profit margins, quantities and completion rates in control cards and reports.', ur: 'کنٹرول کارڈز اور رپورٹس میں فی یونٹ لاگت، منافع کے مارجن، مقدار اور تکمیلی شرح کے لیے درستگی کا تعین کرتا ہے۔' },
  'auto.التركيبة_الافتراضية_لطاقم_العم_5d7d72': { en: 'Default crew composition for control cards when no custom configuration is set for the execution stage.', ur: 'کنٹرول کارڈز میں ورک کریو کی طے شدہ تشکیل جب ایگزیکیوشن اسٹیج کے لیے کوئی مخصوص تشکیل نہ ہو۔' },
};

function runEnRefinement() {
  console.log('🔧 Running Task 3: Professional English Review (en.json)...\n');

  let enReplacedCount = 0;

  for (const [key, rep] of Object.entries(REPLACEMENTS)) {
    if (rep.en) {
      if (en[key] !== rep.en) {
        en[key] = rep.en;
        enReplacedCount++;
      }
    }
  }

  // Scan and clean any remaining "System Item"
  for (const [key, val] of Object.entries(en)) {
    if (typeof val === 'string' && val.toLowerCase().includes('system item')) {
      const arVal = ar[key] || '';
      console.log(`[!] Found remaining System Item at [${key}] (AR: "${arVal}")`);
      // Replace with clean translation or fallback
      en[key] = arVal || 'Item';
      enReplacedCount++;
    }
  }

  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
  console.log(`✅ Task 3 Complete: ${enReplacedCount} keys updated in en.json.`);
  return enReplacedCount;
}

if (require.main === module) {
  runEnRefinement();
}

module.exports = { runEnRefinement, REPLACEMENTS };
