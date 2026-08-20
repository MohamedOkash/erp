const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urPath, 'utf8'));

// Add missing sidebar navigation keys
if (!ar.nav) ar.nav = {};
if (!ar.nav.links) ar.nav.links = {};
ar.nav.links.financial_reports = 'التقارير المالية ونقطة التعادل';
ar.nav.links.financial_accounts = 'الحسابات المالية وسجل المصروفات';

if (!en.nav) en.nav = {};
if (!en.nav.links) en.nav.links = {};
en.nav.links.financial_reports = 'Financial Reports & Break-Even';
en.nav.links.financial_accounts = 'Financial Accounts & Expenses';

if (!ur.nav) ur.nav = {};
if (!ur.nav.links) ur.nav.links = {};
ur.nav.links.financial_reports = 'مالیاتی رپورٹس اور بریک ایون کے حسابات';
ur.nav.links.financial_accounts = 'مالیاتی اکاؤنٹس اور اخراجات کے ریکارڈز';

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(urPath, JSON.stringify(ur, null, 2) + '\n', 'utf8');

console.log('✅ Added nav.links.financial_reports and nav.links.financial_accounts to all 3 locales.');
