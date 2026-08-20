const fs = require('fs');
const path = require('path');

const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const EN_REPLACEMENTS = {
  // Trade Names
  'auto.محارة_5b3fe8': 'Plastering',
  'auto.لياسة_5b3f00': 'Rendering',
  'auto.دهان_2e7ecf': 'Painting',
  'auto.جبس_17f037': 'Gypsum',
  'auto.سيراميك_4bf785': 'Ceramics',
  'auto.بورسلين_448954': 'Porcelain',
  'auto.رخام_2e877d': 'Marble',
  'auto.بلك_17e4a7': 'Blockwork',
  'auto.مباني_5b3da5': 'Masonry',
  'auto.نجار_2f1fc1': 'Carpentry',
  'auto.ألمنيوم_52b94f': 'Aluminum',
  'auto.المنيوم_7f2062': 'Aluminum',
  'auto.كهرباء_': 'Electrical',
  'auto.كهرب_2f1057': 'Electrical',
  'auto.سباك_2e94a1': 'Plumbing',
  'auto.صحي_1812b2': 'Plumbing & Sanitary',
  'auto.صح_c698': 'Plumbing & Sanitary',
  'auto.تكييف_59cdf5': 'HVAC',
  'auto.عزل_18224b': 'Waterproofing & Insulation',
  'auto.إيبوكسي_1fb85d': 'Epoxy',
  'auto.ايبوكسي_767b2c': 'Epoxy',

  // Blacklist fixes & Broken translations
  'auto.الكوادر_والعمالة_4bf087': 'Staff & Workforce',
  'auto.دليل_بنود_التشطيبات_والمراحل_7d4309': 'Finishing Items & Stages Catalog',
  'auto.الطابق_Floor_5aa1e7': 'Floor Level',
  'auto.الغرفة_الجناح_Room_e88a01': 'Room / Suite',
  'auto.اختيار_من_الطواقم_المسجلة_4cc592': '-- Select from Registered Crews --',
  'auto.الأجر_اليومي_7d17ee': 'Daily Wage:',
  'auto.حفظ_واعتماد_اليومية_55a091': 'Save & Approve Daily Log',
  'auto.جميع_الطواقم_41a8ec': '-- All Crews --',

  // Long Arabic / short English enhancements
  'auto.غير_صالح_Invalid_c51e31': 'Invalid Entry',
  'auto.معتمد_وموافق_عليه_1e88c0': 'Approved & Confirmed',
  'auto.نقل_وترحيل_الكوادر_6b26f7': 'Staff Transfer & Relocation',
  'auto.المالية_والرقابة_والأمان_18c741': 'Finance, Control & Security',
  'auto.التقارير_المحفوظة_والمؤشرات_6d80de': 'Saved Reports & Indicators',
  'auto.فشل_تحميل_البيانات_الأولية_3d3787': 'Failed to load initial data',
  'auto.يرجى_اختيار_المشروع_1370d6': 'Please select a project',
  'auto.الإدخال_اليومي_لإنتاجية_الطواق_791bd6': 'Daily Crew Productivity Entry',
  'auto.منظومة_تسجيل_إنتاجية_الأطقم_ال_33c4de': 'Field crew productivity logging system and automated equivalent meters calculation',
  'auto.SAR_يوزع_نصفين_3858cc': 'SAR (Split equally in half)',
  'auto.المعادلات_والحسابات_الفورية_106b22': 'Real-time Equations & Calculations',
  'auto.إجمالي_أجور_الطاقم_المقدرة_252524': 'Estimated Total Crew Wages',
  'auto.SAR_مضاف_لكل_معلم_569070': 'SAR added per master technician)',
  'auto.لا_توجد_سجلات_إنتاجية_مطابقة_ل_335a84': 'No productivity records matching the selected period',
  'auto.تم_اعتماد_السجل_الهندسي_بنجاح_23f167': 'Engineering record approved successfully',
  'auto.سجل_يومية_يحتاج_تدقيق_479120': 'Daily log requiring audit',
  'auto.محققة_للمستهدف_100_6ed2ef': 'Target Achieved (≥100%)',
  'auto.لا_توجد_سجلات_مطابقة_للشروط_ال_669d47': 'No records matching specified criteria',
  'auto.محقق_للإنتاجية_100_3fa80e': 'Productivity Met (≥100%)',
  'auto.اعتماد_اليومية_الهندسية_69da70': 'Engineering Daily Log Approval',
  'auto.أدخل_توجيهات_الجودة_الملاحظات__37aa24': 'Enter quality directives, technical notes, or approval reason...',
  'auto.ملاحظات_التعديل_الهندسي_696021': 'Engineering Edit Notes',
  'auto.الملاحظات_الهندسية_الفنية_7ccb8e': 'Technical Engineering Notes',
  'auto.أدخل_الملاحظات_الفنية_الخاصة_ب_5f02e3': 'Enter technical notes for this record...',

  // Production and Approval texts
  'auto.الصفحة_قيد_التطوير_والتجهيز_2a794f': 'Page under development and preparation',
  'auto.حالة_الاعتماد_6243e3': 'Approval Status',
  'auto.مجموع_الأمتار_المنفذة_35950f': 'Total Executed Meters:',
  'auto.الوزن_النسبي_للمرحلة_6b8152': 'Stage Relative Weight:',
  'auto.الأمتار_المكافئة_المعتمدة_25aee4': 'Approved Equivalent Meters',
  'auto.يمكنك_تغيير_الفلاتر_بالأعلى_أو_536a8c': 'You can change filters above or register a new daily entry',
  'auto.فشل_اعتماد_السجل_155e0f': 'Failed to approve record',
  'auto.فشل_تحديث_السجل_26f9fe': 'Failed to update record',
  'auto.منظومة_التدقيق_الهندسي_تقييم_م_2d38ad': 'Engineering audit system, performance targets assessment, and formal approval',
  'auto.إجمالي_الأمتار_المنجزة_24df9e': 'Total Completed Meters',
  'auto.للفترة_المحددة_287844': 'For Selected Period',
  'auto.أداء_قياسي_ممتاز_3683b5': 'Excellent Benchmark Performance',
  'auto.قيد_المراجعة_345943': 'Under Review (',
  'auto.المعتمدة_4002dc': 'Approved (',
  'auto.جميع_السجلات_69f12a': 'All Records',
  'auto.نسبة_الإنجاز_التقييم_2a04fc': 'Completion Rate (Assessment)',
  'auto.ملاحظات_المهندس_3c9bd0': 'Engineer Notes',
  'auto.لا_توجد_ملاحظات_4ef080': 'No notes available',
  'auto.ملاحظات_المهندس_وتوجيهات_الاعت_7a889c': 'Engineer Notes & Approval Directives (Optional)',
  'auto.جاري_الاعتماد_32811a': 'Approving...',
  'auto.أمس_17d1f1': 'Yesterday',
  'auto.قبل_أمس_1d79fe': 'Day Before Yesterday',
  'auto.فترة_مخصصة_466629': 'Custom Period',
  'auto.مخصص_2f190e': 'Custom',
};

function applyReplacements(obj, prefix = '') {
  if (typeof obj === 'string') {
    if (EN_REPLACEMENTS[prefix]) {
      return EN_REPLACEMENTS[prefix];
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item, idx) => applyReplacements(item, `${prefix}[${idx}]`));
  }
  if (typeof obj === 'object' && obj !== null) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      res[k] = applyReplacements(v, fullKey);
    }
    return res;
  }
  return obj;
}

const updatedEn = applyReplacements(en, '');
fs.writeFileSync(enPath, JSON.stringify(updatedEn, null, 2) + '\n', 'utf8');
console.log('✅ en.json professional terminology overhaul complete.');
