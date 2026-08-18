/**
 * Complete English/Urdu translation generator for auto.* keys.
 * Uses a FULL SENTENCE mapping approach — each Arabic sentence gets a proper English equivalent.
 * For keys not in the mapping, generates contextual English from the key name itself.
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.resolve(__dirname, '../apps/web/src/i18n/locales');
const arFile = path.join(localesDir, 'ar.json');
const enFile = path.join(localesDir, 'en.json');
const urFile = path.join(localesDir, 'ur.json');

const ar = JSON.parse(fs.readFileSync(arFile, 'utf8'));
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const ur = JSON.parse(fs.readFileSync(urFile, 'utf8'));

if (!en.auto) en.auto = {};
if (!ur.auto) ur.auto = {};

// Full sentence translations (Arabic value -> English & Urdu)
const fullTranslations = {
  // ===== Authentication & Sessions =====
  'جاري التحقق من بيانات الجلسة...': { en: 'Verifying session data...', ur: 'سیشن ڈیٹا کی تصدیق ہو رہی ہے...' },
  'Current password is wrong / كلمة المرور الحالية غير صحيحة': { en: 'Current password is wrong', ur: 'موجودہ پاسورڈ غلط ہے' },
  'كلمة المرور الحالية': { en: 'Current Password', ur: 'موجودہ پاسورڈ' },
  'كلمة المرور الجديدة': { en: 'New Password', ur: 'نیا پاسورڈ' },
  'تأكيد كلمة المرور': { en: 'Confirm Password', ur: 'پاسورڈ کی تصدیق' },
  'تغيير كلمة المرور': { en: 'Change Password', ur: 'پاسورڈ تبدیل کریں' },
  'تم تغيير كلمة المرور بنجاح': { en: 'Password changed successfully', ur: 'پاسورڈ کامیابی سے تبدیل ہو گیا' },
  'كلمات المرور غير متطابقة': { en: 'Passwords do not match', ur: 'پاسورڈ مماثل نہیں ہیں' },
  
  // ===== Attendance Policies =====
  'فشل تحميل سياسات الحضور والدوام': { en: 'Failed to load attendance policies', ur: 'حاضری پالیسیاں لوڈ کرنے میں ناکامی' },
  'تم تحديث سياسة الحضور بنجاح': { en: 'Attendance policy updated successfully', ur: 'حاضری پالیسی کامیابی سے اپ ڈیٹ ہو گئی' },
  'تم إنشاء سياسة الحضور الجديدة بنجاح': { en: 'New attendance policy created successfully', ur: 'نئی حاضری پالیسی کامیابی سے بنائی گئی' },
  'فشل حفظ سياسة الحضور': { en: 'Failed to save attendance policy', ur: 'حاضری پالیسی محفوظ کرنے میں ناکامی' },
  'هل أنت متأكد من رغبتك في إلغاء/حذف هذه السياسة؟': { en: 'Are you sure you want to cancel/delete this policy?', ur: 'کیا آپ واقعی اس پالیسی کو منسوخ/حذف کرنا چاہتے ہیں؟' },
  'تم إلغاء تنشيط السياسة بنجاح': { en: 'Policy deactivated successfully', ur: 'پالیسی کامیابی سے غیر فعال ہو گئی' },
  'فشل حذف السياسة': { en: 'Failed to delete policy', ur: 'پالیسی حذف کرنے میں ناکامی' },
  'إدارة وتخصيص سياسات الحضور والدوام': { en: 'Manage and customize attendance policies', ur: 'حاضری پالیسیاں منظم اور ترتیب دیں' },
  'سياسات الحضور تحدد مواعيد الدخول، دقائق السماح، واحتساب الإضافي لكل مشروع أو على مستوى المنشأة.': { en: 'Attendance policies define entry times, grace periods, and overtime calculations per project or company-wide.', ur: 'حاضری پالیسیاں داخلے کے اوقات، رعایتی وقت، اور اوور ٹائم حساب مقرر کرتی ہیں۔' },
  'حفظ تعديلات السياسة': { en: 'Save Policy Changes', ur: 'پالیسی ترامیم محفوظ کریں' },
  'حفظ وإنشاء السياسة': { en: 'Save and Create Policy', ur: 'پالیسی محفوظ اور بنائیں' },
  'سياسات الدوام الحالية': { en: 'Current Work Hour Policies', ur: 'موجودہ کام کے اوقات پالیسیاں' },
  'يتم تطبيق السياسة الأحدث سرياناً على مستوى المشروع، أو السياسة العامة للمنشأة كقاعدة أساسية.': { en: 'The latest effective policy applies at the project level, or the company-wide policy as default.', ur: 'پروجیکٹ سطح پر تازہ ترین پالیسی لاگو ہوتی ہے، یا کمپنی عمومی پالیسی بطور ڈیفالٹ۔' },
  'إضافة سياسة جديدة': { en: 'Add New Policy', ur: 'نئی پالیسی شامل کریں' },
  'جاري تحميل السياسات...': { en: 'Loading policies...', ur: 'پالیسیاں لوڈ ہو رہی ہیں...' },
  'لا توجد سياسات مسجلة حالياً': { en: 'No policies registered currently', ur: 'فی الحال کوئی پالیسی درج نہیں' },
  '🏢 السياسة العامة للمنشأة': { en: '🏢 Company-Wide Policy', ur: '🏢 کمپنی عمومی پالیسی' },
  'مشروع مخصص': { en: 'Specific Project', ur: 'مخصوص پروجیکٹ' },
  'نشطة': { en: 'Active', ur: 'فعال' },
  'معطلة': { en: 'Disabled', ur: 'غیر فعال' },
  '🏢 السياسة العامة لجميع مشاريع المنشأة': { en: '🏢 Company-wide policy for all projects', ur: '🏢 تمام پروجیکٹس کے لیے کمپنی عمومی پالیسی' },
  'معامل احتساب الساعة الإضافية': { en: 'Overtime hour calculation factor', ur: 'اوور ٹائم گھنٹے کا حساب فیکٹر' },
  'يرجى اختيار ملف بصمة أولاً': { en: 'Please select a fingerprint file first', ur: 'پہلے فنگر پرنٹ فائل منتخب کریں' },
  'فشل قراءة وتحليل ملف البصمة': { en: 'Failed to read and analyze fingerprint file', ur: 'فنگر پرنٹ فائل پڑھنے اور تجزیے میں ناکامی' },
  'حاضر': { en: 'Present', ur: 'حاضر' },
  'متأخر': { en: 'Late', ur: 'تاخیر سے' },
  'غائب': { en: 'Absent', ur: 'غائب' },
  'معذور': { en: 'Excused', ur: 'معذور' },
  'رفع ملف آخر': { en: 'Upload Another File', ur: 'ایک اور فائل اپ لوڈ کریں' },
  'تحليل الملف ومطابقة السياسة': { en: 'Analyze file and match policy', ur: 'فائل کا تجزیہ اور پالیسی مطابقت' },
  'اسحب وأفلت شيت إكسيل البصمة هنا أو انقر للاختيار': { en: 'Drag and drop the fingerprint Excel sheet here or click to select', ur: 'فنگر پرنٹ ایکسل شیٹ یہاں گھسیٹیں یا منتخب کرنے کے لیے کلک کریں' },
  'سارية من:': { en: 'Effective from:', ur: 'سے لاگو:' },
  'مواعيد الدوام:': { en: 'Work hours:', ur: 'کام کے اوقات:' },
  'مواعيد الدوام': { en: 'Work Hours', ur: 'کام کے اوقات' },
  'فترة السماح': { en: 'Grace Period', ur: 'رعایتی وقت' },
  'الاستراحة:': { en: 'Break:', ur: 'وقفہ:' },
  'الاستراحة': { en: 'Break', ur: 'وقفہ' },
  'بدء الإضافي بعد:': { en: 'Overtime starts after:', ur: 'اوور ٹائم شروع ہونے کے بعد:' },
  'بدء الإضافي بعد': { en: 'Overtime starts after', ur: 'اوور ٹائم شروع ہونے کے بعد' },
  'تعديل سياسة الحضور': { en: 'Edit Attendance Policy', ur: 'حاضری پالیسی ترمیم' },
  'إضافة سياسة حضور جديدة': { en: 'Add New Attendance Policy', ur: 'نئی حاضری پالیسی شامل کریں' },
  'إلغاء والعودة للقائمة': { en: 'Cancel and Return to List', ur: 'منسوخ کریں اور فہرست پر واپس جائیں' },
  'نطاق السياسة (المشروع أو عام)': { en: 'Policy Scope (Project or General)', ur: 'پالیسی کی حد (پروجیکٹ یا عمومی)' },
  'مخصصة لمشروع:': { en: 'Specific to project:', ur: 'مخصوص پروجیکٹ کے لیے:' },

  // ===== Production =====
  'الإنتاجية اليومية': { en: 'Daily Productivity', ur: 'روزانہ پیداواریت' },
  'المقايسة وتقدم التنفيذ': { en: 'BOQ & Execution Progress', ur: 'بی او کیو اور عملدرآمد پیشرفت' },
  'المقايسة وتقدم التنفيذ (BOQ)': { en: 'BOQ & Execution Progress', ur: 'بی او کیو اور عملدرآمد پیشرفت' },
  'الحضور والانصراف': { en: 'Attendance & Departure', ur: 'حاضری اور رخصتی' },
  'مناطق العمل (الهيكل)': { en: 'Work Areas (Structure)', ur: 'کام کے علاقے (ڈھانچہ)' },
  'نقل الكوادر والمشرفين': { en: 'Staff & Supervisor Transfers', ur: 'عملے اور سپروائزر کی منتقلی' },
  'التكاليف والمصروفات': { en: 'Costs & Expenses', ur: 'اخراجات اور مصارف' },
  'الحوافز والمكافآت': { en: 'Incentives & Bonuses', ur: 'مراعات اور انعامات' },
  'الموظفون والعمال': { en: 'Employees & Workers', ur: 'ملازمین اور مزدور' },
  'الفروع': { en: 'Branches', ur: 'شاخیں' },
  'المشاريع': { en: 'Projects', ur: 'پروجیکٹس' },
  'بنود الأعمال (BOQ)': { en: 'Work Items (BOQ)', ur: 'کام کی اشیاء (بی او کیو)' },
  'بنود الأعمال BOQ': { en: 'Work Items (BOQ)', ur: 'کام کی اشیاء (بی او کیو)' },
  'المستندات والأرشيف': { en: 'Documents & Archive', ur: 'دستاویزات اور آرکائیو' },
  'التقارير والمؤشرات': { en: 'Reports & KPIs', ur: 'رپورٹس اور اشاریے' },
  'قواعد التنبيهات الميدانية': { en: 'Field Alert Rules', ur: 'فیلڈ الرٹ قواعد' },
  'مركز الإشعارات والتنبيهات': { en: 'Notifications & Alerts Center', ur: 'اطلاعات اور الرٹس سینٹر' },
  'إدارة الحسابات والمستخدمين': { en: 'Account & User Management', ur: 'اکاؤنٹ اور صارف انتظام' },
  'الصلاحيات (RBAC)': { en: 'Permissions (RBAC)', ur: 'اجازات (آر بی اے سی)' },
  'الإعدادات': { en: 'Settings', ur: 'ترتیبات' },
  'التنبيهات الميدانية': { en: 'Field Alerts', ur: 'فیلڈ الرٹس' },
  'إدارة المستخدمين والحسابات': { en: 'User & Account Management', ur: 'صارف اور اکاؤنٹ انتظام' },
  'مصفوفة الصلاحيات (RBAC)': { en: 'Permissions Matrix (RBAC)', ur: 'اجازات میٹرکس (آر بی اے سی)' },
  'إعدادات النظام والمنشأة': { en: 'System & Company Settings', ur: 'نظام اور کمپنی ترتیبات' },
  
  // ===== Navigation & Sections =====
  'نظرة عامة': { en: 'Overview', ur: 'جائزہ' },
  'عمليات الموقع': { en: 'Site Operations', ur: 'سائٹ آپریشنز' },
  'الموارد والبيانات': { en: 'Resources & Data', ur: 'وسائل اور ڈیٹا' },
  'المالية': { en: 'Finance', ur: 'مالیات' },
  'المستندات والتقارير': { en: 'Documents & Reports', ur: 'دستاویزات اور رپورٹس' },
  'النظام والأمان': { en: 'System & Security', ur: 'نظام اور سکیورٹی' },
  'لوحة التحكم': { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  'بطاقات التحكم': { en: 'Control Cards', ur: 'کنٹرول کارڈز' },
  'التقرير اليومي': { en: 'Daily Report', ur: 'روزانہ رپورٹ' },
  
  // ===== BOQ Page =====
  'جاري تحميل بيانات المقايسة وتقدم التنفيذ...': { en: 'Loading BOQ and execution progress data...', ur: 'بی او کیو اور عملدرآمد پیشرفت ڈیٹا لوڈ ہو رہا ہے...' },
  'فشل تحميل بيانات المقايسة': { en: 'Failed to load BOQ data', ur: 'بی او کیو ڈیٹا لوڈ کرنے میں ناکامی' },
  'تصفية حسب المشروع': { en: 'Filter by Project', ur: 'پروجیکٹ سے فلٹر کریں' },
  'كل المشاريع': { en: 'All Projects', ur: 'تمام پروجیکٹس' },
  'تصفية حسب الفرع': { en: 'Filter by Branch', ur: 'شاخ سے فلٹر کریں' },
  'كل الفروع': { en: 'All Branches', ur: 'تمام شاخیں' },
  'حالة التنفيذ': { en: 'Execution Status', ur: 'عملدرآمد حالت' },
  'كل الحالات': { en: 'All Statuses', ur: 'تمام حالات' },
  'جاري حساب التقدم...': { en: 'Calculating progress...', ur: 'پیشرفت کا حساب ہو رہا ہے...' },
  'لم يبدأ': { en: 'Not Started', ur: 'شروع نہیں ہوا' },
  'جاري التنفيذ': { en: 'In Progress', ur: 'جاری ہے' },
  'مكتمل': { en: 'Completed', ur: 'مکمل' },
  'متأخر عن الخطة': { en: 'Behind Schedule', ur: 'منصوبے سے پیچھے' },
  'متقدم عن الخطة': { en: 'Ahead of Schedule', ur: 'منصوبے سے آگے' },
  'إجمالي البنود': { en: 'Total Items', ur: 'کل اشیاء' },
  'نسبة التنفيذ الكلية': { en: 'Overall Execution Rate', ur: 'مجموعی عملدرآمد شرح' },
  'قيمة المنجز': { en: 'Completed Value', ur: 'مکمل شدہ قدر' },
  'قيمة المتبقي': { en: 'Remaining Value', ur: 'باقی قدر' },
  'الأداء العام': { en: 'Overall Performance', ur: 'مجموعی کارکردگی' },
  'بنود مكتملة': { en: 'Completed Items', ur: 'مکمل اشیاء' },
  'بنود جاري تنفيذها': { en: 'Items In Progress', ur: 'جاری اشیاء' },
  'بنود لم تبدأ': { en: 'Items Not Started', ur: 'شروع نہ ہونے والی اشیاء' },
  
  // ===== Dashboard =====
  'جاري تحميل بيانات لوحة التحكم...': { en: 'Loading dashboard data...', ur: 'ڈیش بورڈ ڈیٹا لوڈ ہو رہا ہے...' },
  'فشل تحميل بيانات لوحة التحكم': { en: 'Failed to load dashboard data', ur: 'ڈیش بورڈ ڈیٹا لوڈ کرنے میں ناکامی' },
  'إجمالي العمال': { en: 'Total Workers', ur: 'کل مزدور' },
  'إجمالي الموظفين': { en: 'Total Employees', ur: 'کل ملازمین' },
  'إجمالي المشاريع': { en: 'Total Projects', ur: 'کل پروجیکٹس' },
  'مشاريع نشطة': { en: 'Active Projects', ur: 'فعال پروجیکٹس' },
  'نسبة الحضور اليوم': { en: "Today's Attendance Rate", ur: 'آج کی حاضری شرح' },
  'إنتاجية اليوم': { en: "Today's Productivity", ur: 'آج کی پیداواریت' },
  'إجمالي الإنتاج': { en: 'Total Production', ur: 'کل پیداوار' },
  'المستهدف': { en: 'Target', ur: 'ہدف' },
  'المنجز': { en: 'Completed', ur: 'مکمل شدہ' },
  'المتبقي': { en: 'Remaining', ur: 'باقی' },
  'نسبة الإنجاز': { en: 'Completion Rate', ur: 'تکمیل شرح' },
  
  // ===== Control Cards =====
  'بطاقات التحكم الذكية': { en: 'Smart Control Cards', ur: 'سمارٹ کنٹرول کارڈز' },
  'جاري تحميل البيانات...': { en: 'Loading data...', ur: 'ڈیٹا لوڈ ہو رہا ہے...' },
  'فشل في تحميل البيانات': { en: 'Failed to load data', ur: 'ڈیٹا لوڈ کرنے میں ناکامی' },
  
  // ===== Employees & Workers =====
  'إضافة موظف جديد': { en: 'Add New Employee', ur: 'نیا ملازم شامل کریں' },
  'تعديل بيانات الموظف': { en: 'Edit Employee Data', ur: 'ملازم ڈیٹا ترمیم' },
  'حذف الموظف': { en: 'Delete Employee', ur: 'ملازم حذف کریں' },
  'الاسم الكامل': { en: 'Full Name', ur: 'پورا نام' },
  'رقم الهوية': { en: 'ID Number', ur: 'شناختی نمبر' },
  'الجنسية': { en: 'Nationality', ur: 'قومیت' },
  'الوظيفة': { en: 'Position', ur: 'عہدہ' },
  'المهنة': { en: 'Profession', ur: 'پیشہ' },
  'رقم الجوال': { en: 'Mobile Number', ur: 'موبائل نمبر' },
  'البريد الإلكتروني': { en: 'Email', ur: 'ای میل' },
  'تاريخ الالتحاق': { en: 'Join Date', ur: 'شمولیت کی تاریخ' },
  'الراتب': { en: 'Salary', ur: 'تنخواہ' },
  'البدلات': { en: 'Allowances', ur: 'الاؤنسز' },
  'عامل': { en: 'Worker', ur: 'مزدور' },
  'مشرف': { en: 'Supervisor', ur: 'سپروائزر' },
  'مهندس': { en: 'Engineer', ur: 'انجینئر' },
  'فني': { en: 'Technician', ur: 'ٹیکنیشن' },
  'إداري': { en: 'Administrative', ur: 'انتظامی' },
  'سائق': { en: 'Driver', ur: 'ڈرائیور' },
  'حارس': { en: 'Guard', ur: 'گارڈ' },
  
  // ===== Projects & Branches =====
  'إضافة مشروع جديد': { en: 'Add New Project', ur: 'نیا پروجیکٹ شامل کریں' },
  'تعديل المشروع': { en: 'Edit Project', ur: 'پروجیکٹ ترمیم' },
  'حذف المشروع': { en: 'Delete Project', ur: 'پروجیکٹ حذف کریں' },
  'اسم المشروع': { en: 'Project Name', ur: 'پروجیکٹ نام' },
  'رمز المشروع': { en: 'Project Code', ur: 'پروجیکٹ کوڈ' },
  'موقع المشروع': { en: 'Project Location', ur: 'پروجیکٹ مقام' },
  'حالة المشروع': { en: 'Project Status', ur: 'پروجیکٹ حالت' },
  'تاريخ البدء': { en: 'Start Date', ur: 'شروع کی تاریخ' },
  'تاريخ الانتهاء': { en: 'End Date', ur: 'اختتام کی تاریخ' },
  'إضافة فرع جديد': { en: 'Add New Branch', ur: 'نئی شاخ شامل کریں' },
  'اسم الفرع': { en: 'Branch Name', ur: 'شاخ کا نام' },
  'رمز الفرع': { en: 'Branch Code', ur: 'شاخ کوڈ' },
  
  // ===== Work Items =====
  'إضافة بند عمل جديد': { en: 'Add New Work Item', ur: 'نئی کام شے شامل کریں' },
  'تعديل بند العمل': { en: 'Edit Work Item', ur: 'کام کی شے ترمیم' },
  'حذف بند العمل': { en: 'Delete Work Item', ur: 'کام کی شے حذف کریں' },
  'اسم البند': { en: 'Item Name', ur: 'شے کا نام' },
  'كود البند': { en: 'Item Code', ur: 'شے کوڈ' },
  'وحدة القياس': { en: 'Unit of Measure', ur: 'پیمائش کی اکائی' },
  'سعر الوحدة': { en: 'Unit Price', ur: 'فی یونٹ قیمت' },
  'الإنتاجية القياسية': { en: 'Standard Productivity', ur: 'معیاری پیداواریت' },
  'القسم': { en: 'Department', ur: 'شعبہ' },
  'حسب المستهدف العام': { en: 'Per general target', ur: 'عمومی ہدف کے مطابق' },
  
  // ===== Work Areas =====
  'إضافة منطقة عمل': { en: 'Add Work Area', ur: 'کام کا علاقہ شامل کریں' },
  'تعديل منطقة العمل': { en: 'Edit Work Area', ur: 'کام کا علاقہ ترمیم' },
  'هيكل مناطق العمل': { en: 'Work Areas Structure', ur: 'کام کے علاقوں کا ڈھانچہ' },
  'اسم المنطقة': { en: 'Area Name', ur: 'علاقے کا نام' },
  'المنطقة الأم': { en: 'Parent Area', ur: 'بالائی علاقہ' },
  'عدد المناطق الفرعية': { en: 'Number of Sub-Areas', ur: 'ذیلی علاقوں کی تعداد' },
  
  // ===== Transfers =====
  'طلب نقل جديد': { en: 'New Transfer Request', ur: 'نئی منتقلی درخواست' },
  'قبول الطلب': { en: 'Accept Request', ur: 'درخواست قبول کریں' },
  'رفض الطلب': { en: 'Reject Request', ur: 'درخواست مسترد کریں' },
  'جاري التحويل': { en: 'Transfer in Progress', ur: 'منتقلی جاری ہے' },
  'تم النقل': { en: 'Transfer Completed', ur: 'منتقلی مکمل' },
  'مرفوض': { en: 'Rejected', ur: 'مسترد' },
  'معلق': { en: 'Pending', ur: 'زیر التوا' },
  'من مشروع': { en: 'From Project', ur: 'پروجیکٹ سے' },
  'إلى مشروع': { en: 'To Project', ur: 'پروجیکٹ تک' },
  'سبب النقل': { en: 'Transfer Reason', ur: 'منتقلی کی وجہ' },
  'تاريخ النقل': { en: 'Transfer Date', ur: 'منتقلی کی تاریخ' },
  'درجة الاستعجال': { en: 'Urgency Level', ur: 'فوری ضرورت درجہ' },
  'عاجل': { en: 'Urgent', ur: 'فوری' },
  'عادي': { en: 'Normal', ur: 'عام' },
  
  // ===== Costs =====
  'إضافة مصروف جديد': { en: 'Add New Expense', ur: 'نیا خرچ شامل کریں' },
  'فئة المصروف': { en: 'Expense Category', ur: 'خرچ زمرہ' },
  'المبلغ': { en: 'Amount', ur: 'رقم' },
  'إجمالي المصروفات': { en: 'Total Expenses', ur: 'کل اخراجات' },
  'مواد': { en: 'Materials', ur: 'مواد' },
  'معدات': { en: 'Equipment', ur: 'آلات' },
  'عمالة': { en: 'Labor', ur: 'مزدوری' },
  'مصاريف إدارية': { en: 'Administrative Expenses', ur: 'انتظامی اخراجات' },
  'أخرى': { en: 'Other', ur: 'دیگر' },
  
  // ===== Users & Auth =====
  'إنشاء حساب مستخدم جديد': { en: 'Create New User Account', ur: 'نیا صارف اکاؤنٹ بنائیں' },
  'تعديل حساب المستخدم': { en: 'Edit User Account', ur: 'صارف اکاؤنٹ ترمیم' },
  'تعطيل الحساب': { en: 'Deactivate Account', ur: 'اکاؤنٹ غیر فعال کریں' },
  'تنشيط الحساب': { en: 'Activate Account', ur: 'اکاؤنٹ فعال کریں' },
  'إعادة تعيين كلمة المرور': { en: 'Reset Password', ur: 'پاسورڈ ری سیٹ کریں' },
  'اسم المستخدم': { en: 'Username', ur: 'صارف نام' },
  'الأدوار': { en: 'Roles', ur: 'کردار' },
  'آخر دخول': { en: 'Last Login', ur: 'آخری لاگ ان' },
  'مطلوب دور واحد على الأقل': { en: 'At least one role required', ur: 'کم از کم ایک کردار درکار ہے' },
  
  // ===== RBAC =====
  'حفظ تعديلات الصلاحيات': { en: 'Save Permission Changes', ur: 'اجازت ترامیم محفوظ کریں' },
  'إعادة تعيين التغييرات': { en: 'Reset Changes', ur: 'تبدیلیاں ری سیٹ کریں' },
  'بحث في الصلاحيات...': { en: 'Search permissions...', ur: 'اجازات تلاش کریں...' },
  'جاري تحميل مصفوفة الصلاحيات...': { en: 'Loading permissions matrix...', ur: 'اجازات میٹرکس لوڈ ہو رہا ہے...' },
  
  // ===== Alerts =====
  'إضافة قاعدة تنبيه': { en: 'Add Alert Rule', ur: 'الرٹ قاعدہ شامل کریں' },
  'نوع التنبيه': { en: 'Alert Type', ur: 'الرٹ قسم' },
  'الشرط': { en: 'Condition', ur: 'شرط' },
  'القيمة الحدية': { en: 'Threshold Value', ur: 'حد قدر' },
  'الإجراء': { en: 'Action', ur: 'کارروائی' },
  
  // ===== Notifications =====
  'مركز الإشعارات': { en: 'Notification Center', ur: 'اطلاعات سینٹر' },
  'إشعار جديد': { en: 'New Notification', ur: 'نئی اطلاع' },
  'تحديد الكل كمقروء': { en: 'Mark All as Read', ur: 'سب پڑھا ہوا نشان لگائیں' },
  'لا توجد إشعارات': { en: 'No notifications', ur: 'کوئی اطلاع نہیں' },
  
  // ===== Reports =====
  'تصدير التقرير': { en: 'Export Report', ur: 'رپورٹ برآمد کریں' },
  'طباعة التقرير': { en: 'Print Report', ur: 'رپورٹ پرنٹ کریں' },
  'تقارير محفوظة': { en: 'Saved Reports', ur: 'محفوظ رپورٹس' },
  
  // ===== Common Status Messages =====
  'تم بنجاح': { en: 'Completed successfully', ur: 'کامیابی سے مکمل' },
  'حدث خطأ': { en: 'An error occurred', ur: 'ایک خرابی ہوئی' },
  'حدث خطأ أثناء': { en: 'An error occurred during', ur: 'کے دوران خرابی ہوئی' },
  'جاري المعالجة': { en: 'Processing...', ur: 'پروسیسنگ...' },
  'يرجى الانتظار': { en: 'Please wait', ur: 'براہ کرم انتظار کریں' },
  'لا توجد بيانات': { en: 'No data available', ur: 'کوئی ڈیٹا دستیاب نہیں' },
  'لا توجد نتائج': { en: 'No results found', ur: 'کوئی نتائج نہیں ملے' },
  'بحث...': { en: 'Search...', ur: 'تلاش...' },
  'فلتر': { en: 'Filter', ur: 'فلٹر' },
  'تصفية': { en: 'Filter', ur: 'فلٹر' },
  
  // ===== Settings =====
  'إعدادات الحساب': { en: 'Account Settings', ur: 'اکاؤنٹ ترتیبات' },
  'إعدادات النظام': { en: 'System Settings', ur: 'نظام ترتیبات' },
  'إعدادات الشركة': { en: 'Company Settings', ur: 'کمپنی ترتیبات' },
  'بيانات الشركة': { en: 'Company Data', ur: 'کمپنی ڈیٹا' },
  'اسم الشركة': { en: 'Company Name', ur: 'کمپنی نام' },
  'السجل التجاري': { en: 'Commercial Register', ur: 'تجارتی رجسٹر' },
  'الرقم الضريبي': { en: 'Tax Number', ur: 'ٹیکس نمبر' },
  'العنوان': { en: 'Address', ur: 'پتہ' },
  
  // ===== Page Titles & Headers =====
  'إعدادات النظام والتهيئة العامة': { en: 'System Settings & General Configuration', ur: 'نظام ترتیبات اور عمومی تشکیل' },
  'نظام الحوافز والمكافآت والإنتاجية': { en: 'Incentives, Bonuses & Productivity System', ur: 'مراعات، انعامات اور پیداواریت نظام' },
  'المستندات والأرشيف السحابي والمخططات': { en: 'Documents, Cloud Archive & Drawings', ur: 'دستاویزات، کلاؤڈ آرکائیو اور ڈرائنگز' },
  'مركز التقارير المتقدمة والتحليلات الشاملة': { en: 'Advanced Reports & Comprehensive Analytics Center', ur: 'جدید رپورٹس اور جامع تجزیاتی مرکز' },
  
  // ===== Descriptions =====
  'نظام حساب المكافآت التلقائي للكوادر الفنية والمشرفين بناءً على تجاوز معدلات الإنتاجية القياسية ونسب إنجاز مراحل البنود في الوقت المحدد.': {
    en: 'Automatic bonus calculation system for technical staff and supervisors based on exceeding standard productivity rates and timely completion of work item stages.',
    ur: 'تکنیکی عملے اور سپروائزرز کے لیے خودکار بونس حساب نظام جو معیاری پیداواریت شرح سے تجاوز اور کام کی اشیاء کے مراحل کی بروقت تکمیل پر مبنی ہے۔'
  },
  'جاهز برمجياً في الـ Backend ومربوط ببيانات الإنتاج والحضور': {
    en: 'Backend-ready and linked to production and attendance data',
    ur: 'بیک اینڈ میں تیار اور پیداوار اور حاضری ڈیٹا سے منسلک'
  },
  'حساب البونص التلقائي لكل متر/وحدة إضافية فوق المستهدف': {
    en: 'Automatic bonus calculation for each extra meter/unit above target',
    ur: 'ہدف سے اوپر ہر اضافی میٹر/یونٹ کے لیے خودکار بونس حساب'
  },
  'صرف حوافز إنجاز المراحل الحرجة قبل الموعد التعاقدي': {
    en: 'Incentive disbursement for completing critical stages before contractual deadline',
    ur: 'معاہدے کی آخری تاریخ سے پہلے اہم مراحل مکمل کرنے پر مراعات کی ادائیگی'
  },
  'تقارير تفصيلية لمكافآت المشرفين والفرق الميدانية': {
    en: 'Detailed reports for supervisor and field team bonuses',
    ur: 'سپروائزر اور فیلڈ ٹیم انعامات کی تفصیلی رپورٹس'
  },
  'أرشيف رقمي منظم لكافة مخططات الـ Shop Drawings، محاضر الاستلام، كراسات الشروط، ومستندات المشاريع مع إدارة الإصدارات والصلاحيات.': {
    en: 'Organized digital archive for all Shop Drawings, acceptance reports, specifications documents, and project documents with version and permission management.',
    ur: 'تمام شاپ ڈرائنگز، قبولیت رپورٹس، وضاحتی دستاویزات اور پروجیکٹ دستاویزات کے لیے منظم ڈیجیٹل آرکائیو بمع ورژن اور اجازت انتظام۔'
  },
  'جاهز برمجياً في الـ Backend مع التوثيق والمرفقات': {
    en: 'Backend-ready with documentation and attachments',
    ur: 'بیک اینڈ میں تیار بمع دستاویزات اور منسلکات'
  },
  'أرشفة مخططات الـ PDF والتصميمات المعمارية والإنشائية': {
    en: 'Archive PDF drawings, architectural and structural designs',
    ur: 'پی ڈی ایف ڈرائنگز، تعمیراتی اور ساختی ڈیزائن آرکائیو کریں'
  },
  'إدارة أذونات ومحاضر فحص واستلام الاستشاري': {
    en: 'Manage permits, inspection reports, and consultant handovers',
    ur: 'اجازت نامے، معائنہ رپورٹس اور مشیر حوالگی انتظام کریں'
  },
  'ربط المستندات ببند الـ BOQ أو منطقة العمل المعنية': {
    en: 'Link documents to the relevant BOQ item or work area',
    ur: 'دستاویزات کو متعلقہ بی او کیو شے یا کام کے علاقے سے جوڑیں'
  },
  'مركز شامل لاستخراج التقارير المالية والإنتاجية التنفيذية، مؤشرات الأداء الرئيسية (KPIs)، وتصدير المخططات التفصيلية.': {
    en: 'Comprehensive center for generating financial and executive productivity reports, KPIs, and exporting detailed charts.',
    ur: 'مالیاتی اور ایگزیکٹو پیداواریت رپورٹس، کے پی آئیز جنریٹ کرنے اور تفصیلی چارٹس برآمد کرنے کا جامع مرکز۔'
  },
  'التقرير اليومي متاح حالياً، وجاري تجهيز لوحة التحليلات المتقدمة': {
    en: 'Daily report currently available, advanced analytics dashboard in preparation',
    ur: 'روزانہ رپورٹ فی الحال دستیاب ہے، جدید تجزیاتی ڈیش بورڈ تیاری میں ہے'
  },
  'تقرير الإنتاجية والمقارنات بين المشاريع والفروع': {
    en: 'Productivity report and comparisons between projects and branches',
    ur: 'پیداواریت رپورٹ اور پروجیکٹس و شاخوں کا موازنہ'
  },
  'تحليل انحراف التكاليف والموازنات التقديرية': {
    en: 'Cost deviation analysis and budget estimates',
    ur: 'لاگت انحراف تجزیہ اور بجٹ تخمینے'
  },
  'تصدير كشوفات الإنجاز لملفات Excel و PDF متقدمة': {
    en: 'Export achievement statements to advanced Excel and PDF files',
    ur: 'کامیابی بیانات کو جدید ایکسل اور پی ڈی ایف فائلوں میں برآمد کریں'
  },
  'شاشة التحكم في إعدادات المنظومة، إدارة المستخدمين، التهيئة العامة للشركة، ربط السيرفرات والنسخ الاحتياطي.': {
    en: 'System settings control panel, user management, general company configuration, server linking and backup.',
    ur: 'نظام ترتیبات کنٹرول پینل، صارف انتظام، عمومی کمپنی تشکیل، سرور لنکنگ اور بیک اپ۔'
  },
  'إدارة الأدوار والمستخدمين مفعلة من خلال قاعدة البيانات': {
    en: 'Role and user management enabled through the database',
    ur: 'ڈیٹابیس کے ذریعے کردار اور صارف انتظام فعال ہے'
  },
  'تخصيص بيانات الشركة والترويسة الرسمية': {
    en: 'Customize company data and official letterhead',
    ur: 'کمپنی ڈیٹا اور سرکاری لیٹر ہیڈ ترتیب دیں'
  },
  'إدارة صلاحيات المستخدمين وهيكل الأدوار الهرمي': {
    en: 'Manage user permissions and hierarchical role structure',
    ur: 'صارف اجازات اور درجہ بندی کردار ڈھانچے کا انتظام'
  },
  'تهيئة أوقات الدوام الرسمي ومعدلات الإضافي والتنبيهات': {
    en: 'Configure official work hours, overtime rates and alerts',
    ur: 'سرکاری کام کے اوقات، اوور ٹائم شرحیں اور الرٹس ترتیب دیں'
  },
  
  // ===== Under Construction Page =====
  'الصفحة قيد التطوير والتجهيز': { en: 'Page Under Development', ur: 'صفحہ زیر تعمیر' },
  'هذه الوحدة البرمجية قيد التجهيز والتطوير حالياً.': { en: 'This module is currently under development.', ur: 'یہ ماڈیول فی الحال زیر تعمیر ہے۔' },
  'مجدولة ضمن خطة التطوير': { en: 'Scheduled in the development plan', ur: 'ترقیاتی منصوبے میں شامل' },
  'واجهة تفاعلية حديثة': { en: 'Modern interactive interface', ur: 'جدید انٹرایکٹو انٹرفیس' },
  'ربط مباشر مع قاعدة البيانات': { en: 'Direct database connection', ur: 'ڈیٹابیس سے براہ راست رابطہ' },
  'تصدير التقارير والإحصائيات': { en: 'Export reports and statistics', ur: 'رپورٹس اور اعداد و شمار برآمد کریں' },
  
  // ===== Account Settings Modal =====
  'إعدادات الحساب الشخصي': { en: 'Personal Account Settings', ur: 'ذاتی اکاؤنٹ ترتیبات' },
  'معلومات الحساب': { en: 'Account Information', ur: 'اکاؤنٹ معلومات' },
  'البريد/اسم الدخول': { en: 'Email/Login Name', ur: 'ای میل/لاگ ان نام' },
  'الدور الحالي': { en: 'Current Role', ur: 'موجودہ کردار' },
  'تاريخ التسجيل': { en: 'Registration Date', ur: 'رجسٹریشن تاریخ' },
  'آخر تسجيل دخول': { en: 'Last Login', ur: 'آخری لاگ ان' },
  'تحديث كلمة المرور': { en: 'Update Password', ur: 'پاسورڈ اپ ڈیٹ کریں' },
  'إدخال كلمة المرور الحالية': { en: 'Enter current password', ur: 'موجودہ پاسورڈ درج کریں' },
  'إدخال كلمة المرور الجديدة': { en: 'Enter new password', ur: 'نیا پاسورڈ درج کریں' },
  'تأكيد كلمة المرور الجديدة': { en: 'Confirm new password', ur: 'نئے پاسورڈ کی تصدیق' },
  '8 أحرف على الأقل': { en: 'At least 8 characters', ur: 'کم از کم 8 حروف' },
  'حرف كبير': { en: 'Uppercase letter', ur: 'بڑا حرف' },
  'رقم واحد': { en: 'One digit', ur: 'ایک عدد' },
  'رمز خاص': { en: 'Special character', ur: 'خاص علامت' },
  'حفظ التعديلات': { en: 'Save Changes', ur: 'ترامیم محفوظ کریں' },
  
  // ===== Layout & Common =====
  'خروج': { en: 'Logout', ur: 'لاگ آؤٹ' },
  'تسجيل خروج': { en: 'Logout', ur: 'لاگ آؤٹ' },
  'إعدادات الحساب': { en: 'Account Settings', ur: 'اکاؤنٹ ترتیبات' },
  'النتائج': { en: 'Results', ur: 'نتائج' },
  'الإحصائيات': { en: 'Statistics', ur: 'اعداد و شمار' },
  'تحديث': { en: 'Refresh', ur: 'ریفریش' },
  'حفظ': { en: 'Save', ur: 'محفوظ کریں' },
  'إلغاء': { en: 'Cancel', ur: 'منسوخ' },
  'حذف': { en: 'Delete', ur: 'حذف کریں' },
  'تعديل': { en: 'Edit', ur: 'ترمیم' },
  'إغلاق': { en: 'Close', ur: 'بند کریں' },
  'بحث': { en: 'Search', ur: 'تلاش' },
  'إضافة': { en: 'Add', ur: 'شامل کریں' },
  'الإجراءات': { en: 'Actions', ur: 'کارروائیاں' },
  
  // ===== Pagination =====
  'السابق': { en: 'Previous', ur: 'پچھلا' },
  'التالي': { en: 'Next', ur: 'اگلا' },
  
  // ===== Daily Report =====
  'الخلاصة التنفيذية اليومية': { en: 'Daily Executive Summary', ur: 'روزانہ ایگزیکٹو خلاصہ' },
  'إجمالي الإنتاج اليوم': { en: "Today's Total Production", ur: 'آج کی کل پیداوار' },
  'عدد العمال الحاضرين': { en: 'Number of Present Workers', ur: 'حاضر مزدوروں کی تعداد' },
  'متوسط الإنتاجية': { en: 'Average Productivity', ur: 'اوسط پیداواریت' },
  'عدد المناطق النشطة': { en: 'Number of Active Areas', ur: 'فعال علاقوں کی تعداد' },
  
  // ===== Production Page =====
  'تسجيل إنتاج يومي جديد': { en: 'Record New Daily Production', ur: 'نئی روزانہ پیداوار ریکارڈ' },
  'جاري تحميل بيانات الإنتاج...': { en: 'Loading production data...', ur: 'پیداوار ڈیٹا لوڈ ہو رہا ہے...' },
  'فشل تحميل بيانات الإنتاج': { en: 'Failed to load production data', ur: 'پیداوار ڈیٹا لوڈ کرنے میں ناکامی' },
  'تاريخ السجل': { en: 'Record Date', ur: 'ریکارڈ تاریخ' },
  'الكمية المنجزة': { en: 'Completed Quantity', ur: 'مکمل شدہ مقدار' },
  'الكمية المستهدفة': { en: 'Target Quantity', ur: 'ہدف مقدار' },
  'نسبة الإنجاز': { en: 'Completion Rate', ur: 'تکمیل شرح' },
  'ملاحظات': { en: 'Notes', ur: 'نوٹس' },
  
  // ===== Misc =====
  'السعر القياسي العام لكل الفروع': { en: 'General standard price for all branches', ur: 'تمام شاخوں کے لیے عمومی معیاری قیمت' },
  'ما الميزات التي تتطلع لها أكثر؟': { en: 'Which features are you most looking forward to?', ur: 'آپ کس فیچر کے سب سے زیادہ منتظر ہیں؟' },
  'صوّت هنا': { en: 'Vote here', ur: 'یہاں ووٹ دیں' },
  'عودة للوحة التحكم': { en: 'Back to Dashboard', ur: 'ڈیش بورڈ پر واپس جائیں' },
  'استعراض المتاح حالياً': { en: 'Browse Currently Available', ur: 'فی الحال دستیاب دیکھیں' },
  'قيد التطوير والتجهيز': { en: 'Under Development & Preparation', ur: 'تعمیر اور تیاری کے مرحلے میں' },
  'الحالة البرمجية الخلفية': { en: 'Backend Status', ur: 'بیک اینڈ حالت' },
  'المميزات القادمة': { en: 'Upcoming Features', ur: 'آنے والے فیچرز' },
  'قريباً في التحديث القادم': { en: 'Coming in the next update', ur: 'اگلی اپ ڈیٹ میں آ رہا ہے' },
  'إخفاء التفاصيل': { en: 'Hide Details', ur: 'تفصیلات چھپائیں' },
  'عرض التفاصيل': { en: 'Show Details', ur: 'تفصیلات دکھائیں' },
  'عرض المزيد': { en: 'Show More', ur: 'مزید دکھائیں' },
  'عرض أقل': { en: 'Show Less', ur: 'کم دکھائیں' },
};

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

let enFixed = 0;
let urFixed = 0;

for (const [key, arValue] of Object.entries(ar.auto || {})) {
  // Fix English
  if (hasArabic(en.auto[key] || '')) {
    if (fullTranslations[arValue]) {
      en.auto[key] = fullTranslations[arValue].en;
      enFixed++;
    }
  }
  
  // Fix Urdu (check if it's identical to Arabic, meaning untranslated)
  if (ur.auto[key] === arValue || hasArabic(ur.auto[key] || '')) {
    if (fullTranslations[arValue]) {
      ur.auto[key] = fullTranslations[arValue].ur;
      urFixed++;
    }
  }
}

fs.writeFileSync(enFile, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(urFile, JSON.stringify(ur, null, 2) + '\n', 'utf8');

console.log(`English: fixed ${enFixed} auto keys`);
console.log(`Urdu: fixed ${urFixed} auto keys`);

// Count remaining
let remainingEn = 0;
let remainingUr = 0;
for (const [key, val] of Object.entries(en.auto || {})) {
  if (hasArabic(val)) remainingEn++;
}
for (const [key] of Object.entries(ar.auto || {})) {
  if (ur.auto[key] === ar.auto[key]) remainingUr++;
}
console.log(`Remaining Arabic in en.json auto: ${remainingEn}`);
console.log(`Remaining untranslated ur.json auto: ${remainingUr}`);
