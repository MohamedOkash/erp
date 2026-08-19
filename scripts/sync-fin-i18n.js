const fs = require('fs');
const path = require('path');

const arPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ar.json');
const enPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/en.json');
const urPath = path.resolve(__dirname, '../apps/web/src/i18n/locales/ur.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urPath, 'utf8'));

const finKeys = {
  title: {
    ar: "التقارير المالية ونقطة التعادل للمشاريع",
    en: "Financial Reports & Project Break-even",
    ur: "مالیاتی رپورٹس اور پراجیکٹ بریک ایون"
  },
  subtitle: {
    ar: "تحليل الإيرادات، التكاليف المباشرة والعمومية، وحساب كميات نقطة التعادل (Break-even)",
    en: "Analysis of revenue, direct & overhead costs, and break-even quantity calculations",
    ur: "آمدنی، براہ راست اور عمومی اخراجات، اور بریک ایون مقدار کا تجزیہ"
  },
  select_project: {
    ar: "اختر المشروع",
    en: "Select Project",
    ur: "پراجیکٹ منتخب کریں"
  },
  active: {
    ar: "نشط",
    en: "Active",
    ur: "فعال"
  },
  refresh: {
    ar: "تحديث",
    en: "Refresh",
    ur: "تازہ کریں"
  },
  loading: {
    ar: "جاري تحميل البيانات المالية...",
    en: "Loading financial data...",
    ur: "مالیاتی ڈیٹا لوڈ ہو رہا ہے..."
  },
  no_data: {
    ar: "لا توجد بيانات مالية متوفرة لهذا المشروع",
    en: "No financial data available for this project",
    ur: "اس پراجیکٹ کے لیے کوئی مالیاتی ڈیٹا دستیاب نہیں ہے"
  },
  total_revenue: {
    ar: "إجمالي الإيرادات التعاقدية",
    en: "Total Contract Revenue",
    ur: "کل معاہدہ آمدنی"
  },
  executed_revenue: {
    ar: "المنفذ فعلياً",
    en: "Executed Actual",
    ur: "اصل نافذ شدہ"
  },
  total_costs: {
    ar: "إجمالي التكاليف (مباشرة وعمومية)",
    en: "Total Costs (Direct & Overhead)",
    ur: "کل اخراجات (براہ راست اور عمومی)"
  },
  direct_cost: {
    ar: "مباشرة",
    en: "Direct",
    ur: "براہ راست"
  },
  gross_profit: {
    ar: "مجمل الربح الميداني",
    en: "Field Gross Profit",
    ur: "فیلڈ مجموعی منافع"
  },
  margin: {
    ar: "هامش الربح",
    en: "Profit Margin",
    ur: "منافع کا مارجن"
  },
  net_profit: {
    ar: "صافي الأرباح التقديرية",
    en: "Estimated Net Profit",
    ur: "تخمینی خالص منافع"
  },
  net_margin_pct: {
    ar: "نسبة صافي الربح",
    en: "Net Margin %",
    ur: "خالص منافع کا فیصد"
  },
  cost_structure: {
    ar: "هيكل توزيع التكاليف والمصروفات",
    en: "Cost Distribution & Structure",
    ur: "لاگت کی تقسیم اور ساخت"
  },
  material_cost: {
    ar: "تكلفة المواد والخامات",
    en: "Materials & Supplies Cost",
    ur: "سامان اور مواد کی لاگت"
  },
  labor_cost: {
    ar: "أجور العمالة والتشغيل",
    en: "Labor & Wages Cost",
    ur: "لیبر اور اجرت کی لاگت"
  },
  equipment_cost: {
    ar: "المعدات والآليات",
    en: "Equipment & Machinery",
    ur: "آلات اور مشینری"
  },
  overhead_cost: {
    ar: "المصاريف الإدارية والعمومية",
    en: "Administrative & General Overhead",
    ur: "انتظامی اور عمومی اخراجات"
  },
  of_total: {
    ar: "من الإجمالي",
    en: "of total",
    ur: "کل کا"
  },
  material_title: {
    ar: "مواد",
    en: "Materials",
    ur: "مواد"
  },
  labor_title: {
    ar: "عمالة",
    en: "Labor",
    ur: "مزدور"
  },
  equipment_title: {
    ar: "معدات",
    en: "Equipment",
    ur: "سامان"
  },
  overhead_title: {
    ar: "عمومية",
    en: "Overhead",
    ur: "عمومی"
  },
  break_even_table: {
    ar: "تحليل نقطة التعادل لكل بند تشطيبات",
    en: "Break-even Analysis per Finishing Item",
    ur: "ہر فنشنگ آئٹم کے لیے بریک ایون تجزیہ"
  },
  formula_desc: {
    ar: "كمية التعادل = المصاريف العمومية الموزعة ÷ (سعر الفئة - التكلفة المتغيرة للوحدة)",
    en: "Break-even Units = Allocated Overhead ÷ (Unit Price - Variable Cost per Unit)",
    ur: "بریک ایون یونٹس = مختص شدہ عمومی اخراجات ÷ (یونٹ قیمت - متغیر لاگت فی یونٹ)"
  },
  search_item: {
    ar: "بحث في البنود...",
    en: "Search items...",
    ur: "آئٹمز تلاش کریں..."
  },
  work_item: {
    ar: "بند التشطيب",
    en: "Finishing Item",
    ur: "فنشنگ آئٹم"
  },
  unit_price: {
    ar: "سعر الفئة",
    en: "Unit Price",
    ur: "یونٹ کی قیمت"
  },
  var_cost: {
    ar: "التكلفة المتغيرة / و",
    en: "Variable Cost / Unit",
    ur: "متغیر لاگت / یونٹ"
  },
  margin_unit: {
    ar: "هامش المساهمة",
    en: "Contribution Margin",
    ur: "شراکت کا مارجن"
  },
  boq_qty: {
    ar: "كمية المقايسة",
    en: "BOQ Qty",
    ur: "BOQ مقدار"
  },
  break_even_qty: {
    ar: "كمية التعادل",
    en: "Break-even Qty",
    ur: "بریک ایون مقدار"
  },
  executed_qty: {
    ar: "المنفذ",
    en: "Executed",
    ur: "مکمل شدہ"
  },
  be_progress: {
    ar: "نسبة التعادل",
    en: "BE Progress",
    ur: "بریک ایون پیش رفت"
  },
  status: {
    ar: "الحالة",
    en: "Status",
    ur: "حیثیت"
  },
  breakeven_reached: {
    ar: "تم تحقيق التعادل",
    en: "Break-even Reached",
    ur: "بریک ایون حاصل ہو گیا"
  },
  remaining: {
    ar: "متبقي",
    en: "Remaining",
    ur: "باقی"
  },
  no_items_found: {
    ar: "لم يتم العثور على بنود مطابقة",
    en: "No matching items found",
    ur: "کوئی مماثل آئٹمز نہیں ملے"
  }
};

if (!ar.fin) ar.fin = {};
if (!en.fin) en.fin = {};
if (!ur.fin) ur.fin = {};

for (const [k, v] of Object.entries(finKeys)) {
  ar.fin[k] = v.ar;
  en.fin[k] = v.en;
  ur.fin[k] = v.ur;
}

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(urPath, JSON.stringify(ur, null, 2), 'utf8');

console.log('Successfully synchronized financial translation keys!');
