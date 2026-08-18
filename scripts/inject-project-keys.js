const fs = require('fs');
const path = require('path');

const arPath = path.resolve('apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve('apps/web/src/i18n/locales/en.json');
const urPath = path.resolve('apps/web/src/i18n/locales/ur.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urPath, 'utf8'));

if (!ar.auto) ar.auto = {};
if (!en.auto) en.auto = {};
if (!ur.auto) ur.auto = {};

const newKeys = {
  'اسم_العميل_أو_المالك_33a1e2': { ar: 'العميل / المالك', en: 'Client / Owner', ur: 'گاہک / مالک' },
  'مثال_شركة_التطوير_العقاري_31f0b2': { ar: 'مثال: شركة التطوير العقاري', en: 'e.g. Real Estate Development Co.', ur: 'مثال: ریئل اسٹیٹ ڈویلپمنٹ کمپنی' },
  'موقع_المشروع_وملاحظات_الموقع_32e18d': { ar: 'موقع المشروع / تفاصيل العقد', en: 'Project Location / Contract Details', ur: 'منصوبے کا مقام / معاہدے کی تفصیلات' },
  'مؤرشف_Archived_14a22b': { ar: 'مؤرشف (Archived)', en: 'Archived', ur: 'محفوظ شدہ (Archived)' },
  'مؤرشف_Archived_1400b7': { ar: 'مؤرشف (Archived)', en: 'Archived', ur: 'محفوظ شدہ (Archived)' },
  'العميل_المالك_7a5dc8': { ar: 'العميل / المالك', en: 'Client / Owner', ur: 'گاہک / مالک' },
  'مثال_شركة_التطوير_العقاري_792d61': { ar: 'مثال: شركة التطوير العقاري', en: 'e.g. Real Estate Development Co.', ur: 'مثال: ریئل اسٹیٹ ڈویلپمنٹ کمپنی' },
  'موقع_المشروع_تفاصيل_العقد_295cda': { ar: 'موقع المشروع / تفاصيل العقد', en: 'Project Location / Contract Details', ur: 'منصوبے کا مقام / معاہدے کی تفصیلات' }
};

for (const [key, val] of Object.entries(newKeys)) {
  ar.auto[key] = val.ar;
  en.auto[key] = val.en;
  ur.auto[key] = val.ur;
}

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(urPath, JSON.stringify(ur, null, 2), 'utf8');

console.log('Successfully injected project keys into ar.json, en.json, ur.json');
