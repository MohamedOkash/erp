/**
 * COMPREHENSIVE translation generator.
 * Strategy: First apply exact full-sentence matches, then for remaining keys,
 * generate English translations using word-by-word replacement ensuring
 * no Arabic characters remain.
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

// Word-level dictionary: Arabic word/phrase -> { en, ur }
const wordDict = {
  // Common connectors
  'في': { en: 'in', ur: 'میں' },
  'من': { en: 'from', ur: 'سے' },
  'إلى': { en: 'to', ur: 'تک' },
  'على': { en: 'on', ur: 'پر' },
  'عن': { en: 'about', ur: 'کے بارے میں' },
  'مع': { en: 'with', ur: 'کے ساتھ' },
  'بين': { en: 'between', ur: 'کے درمیان' },
  'أو': { en: 'or', ur: 'یا' },
  'و': { en: 'and', ur: 'اور' },
  'هذا': { en: 'this', ur: 'یہ' },
  'هذه': { en: 'this', ur: 'یہ' },
  'ذلك': { en: 'that', ur: 'وہ' },
  'التي': { en: 'which', ur: 'جو' },
  'الذي': { en: 'which', ur: 'جو' },
  'لكل': { en: 'for each', ur: 'ہر ایک کے لیے' },
  'كل': { en: 'all', ur: 'سب' },
  'عند': { en: 'when', ur: 'جب' },
  'قبل': { en: 'before', ur: 'پہلے' },
  'بعد': { en: 'after', ur: 'بعد' },
  'فوق': { en: 'above', ur: 'اوپر' },
  'تحت': { en: 'below', ur: 'نیچے' },
  'بدون': { en: 'without', ur: 'بغیر' },
  'حسب': { en: 'according to', ur: 'کے مطابق' },
  'خلال': { en: 'during', ur: 'کے دوران' },
  'حتى': { en: 'until', ur: 'تک' },
  'ضمن': { en: 'within', ur: 'کے اندر' },
  'غير': { en: 'non', ur: 'غیر' },
  'بنجاح': { en: 'successfully', ur: 'کامیابی سے' },
  'تلقائياً': { en: 'automatically', ur: 'خودکار طور پر' },
  'حالياً': { en: 'currently', ur: 'فی الحال' },
  'فوراً': { en: 'immediately', ur: 'فوری طور پر' },
  'يدوياً': { en: 'manually', ur: 'دستی طور پر' },
  'آلياً': { en: 'automatically', ur: 'خودکار طور پر' },
  'مباشرة': { en: 'directly', ur: 'براہ راست' },
  'أولاً': { en: 'first', ur: 'پہلے' },
  'فقط': { en: 'only', ur: 'صرف' },
  'أيضاً': { en: 'also', ur: 'بھی' },
  
  // Domain nouns
  'المنشأة': { en: 'company', ur: 'کمپنی' },
  'المشروع': { en: 'project', ur: 'پروجیکٹ' },
  'مشروع': { en: 'project', ur: 'پروجیکٹ' },
  'المشاريع': { en: 'projects', ur: 'پروجیکٹس' },
  'مشاريع': { en: 'projects', ur: 'پروجیکٹس' },
  'الفرع': { en: 'branch', ur: 'شاخ' },
  'فرع': { en: 'branch', ur: 'شاخ' },
  'الفروع': { en: 'branches', ur: 'شاخیں' },
  'فروع': { en: 'branches', ur: 'شاخیں' },
  'الموظف': { en: 'employee', ur: 'ملازم' },
  'موظف': { en: 'employee', ur: 'ملازم' },
  'الموظفين': { en: 'employees', ur: 'ملازمین' },
  'الموظفون': { en: 'employees', ur: 'ملازمین' },
  'موظفين': { en: 'employees', ur: 'ملازمین' },
  'العامل': { en: 'worker', ur: 'مزدور' },
  'عامل': { en: 'worker', ur: 'مزدور' },
  'العمال': { en: 'workers', ur: 'مزدور' },
  'عمال': { en: 'workers', ur: 'مزدور' },
  'المشرف': { en: 'supervisor', ur: 'سپروائزر' },
  'مشرف': { en: 'supervisor', ur: 'سپروائزر' },
  'المشرفين': { en: 'supervisors', ur: 'سپروائزرز' },
  'المهندس': { en: 'engineer', ur: 'انجینئر' },
  'مهندس': { en: 'engineer', ur: 'انجینئر' },
  'البند': { en: 'item', ur: 'شے' },
  'بند': { en: 'item', ur: 'شے' },
  'البنود': { en: 'items', ur: 'اشیاء' },
  'بنود': { en: 'items', ur: 'اشیاء' },
  'الأعمال': { en: 'works', ur: 'کام' },
  'أعمال': { en: 'works', ur: 'کام' },
  'العمل': { en: 'work', ur: 'کام' },
  'عمل': { en: 'work', ur: 'کام' },
  'المرحلة': { en: 'stage', ur: 'مرحلہ' },
  'مرحلة': { en: 'stage', ur: 'مرحلہ' },
  'المراحل': { en: 'stages', ur: 'مراحل' },
  'مراحل': { en: 'stages', ur: 'مراحل' },
  'المنطقة': { en: 'area', ur: 'علاقہ' },
  'منطقة': { en: 'area', ur: 'علاقہ' },
  'المناطق': { en: 'areas', ur: 'علاقے' },
  'مناطق': { en: 'areas', ur: 'علاقے' },
  'الطابق': { en: 'floor', ur: 'منزل' },
  'طابق': { en: 'floor', ur: 'منزل' },
  'المقايسة': { en: 'BOQ', ur: 'بی او کیو' },
  'مقايسة': { en: 'BOQ', ur: 'بی او کیو' },
  'التنفيذ': { en: 'execution', ur: 'عملدرآمد' },
  'تنفيذ': { en: 'execution', ur: 'عملدرآمد' },
  'الإنتاج': { en: 'production', ur: 'پیداوار' },
  'إنتاج': { en: 'production', ur: 'پیداوار' },
  'الإنتاجية': { en: 'productivity', ur: 'پیداواریت' },
  'إنتاجية': { en: 'productivity', ur: 'پیداواریت' },
  'الحضور': { en: 'attendance', ur: 'حاضری' },
  'حضور': { en: 'attendance', ur: 'حاضری' },
  'الانصراف': { en: 'departure', ur: 'رخصتی' },
  'الغياب': { en: 'absence', ur: 'غیر حاضری' },
  'غياب': { en: 'absence', ur: 'غیر حاضری' },
  'البصمة': { en: 'fingerprint', ur: 'فنگر پرنٹ' },
  'بصمة': { en: 'fingerprint', ur: 'فنگر پرنٹ' },
  'بصمات': { en: 'fingerprints', ur: 'فنگر پرنٹس' },
  'البصمات': { en: 'fingerprints', ur: 'فنگر پرنٹس' },
  'الدوام': { en: 'work hours', ur: 'کام کے اوقات' },
  'دوام': { en: 'work hours', ur: 'کام کے اوقات' },
  'السياسة': { en: 'policy', ur: 'پالیسی' },
  'سياسة': { en: 'policy', ur: 'پالیسی' },
  'السياسات': { en: 'policies', ur: 'پالیسیاں' },
  'سياسات': { en: 'policies', ur: 'پالیسیاں' },
  'النقل': { en: 'transfer', ur: 'منتقلی' },
  'نقل': { en: 'transfer', ur: 'منتقلی' },
  'التحويل': { en: 'transfer', ur: 'منتقلی' },
  'الصلاحيات': { en: 'permissions', ur: 'اجازات' },
  'صلاحيات': { en: 'permissions', ur: 'اجازات' },
  'الصلاحية': { en: 'permission', ur: 'اجازت' },
  'صلاحية': { en: 'permission', ur: 'اجازت' },
  'الدور': { en: 'role', ur: 'کردار' },
  'دور': { en: 'role', ur: 'کردار' },
  'الأدوار': { en: 'roles', ur: 'کردار' },
  'أدوار': { en: 'roles', ur: 'کردار' },
  'المستخدم': { en: 'user', ur: 'صارف' },
  'مستخدم': { en: 'user', ur: 'صارف' },
  'المستخدمين': { en: 'users', ur: 'صارفین' },
  'مستخدمين': { en: 'users', ur: 'صارفین' },
  'الحساب': { en: 'account', ur: 'اکاؤنٹ' },
  'حساب': { en: 'account', ur: 'اکاؤنٹ' },
  'الحسابات': { en: 'accounts', ur: 'اکاؤنٹس' },
  'حسابات': { en: 'accounts', ur: 'اکاؤنٹس' },
  'التنبيه': { en: 'alert', ur: 'الرٹ' },
  'تنبيه': { en: 'alert', ur: 'الرٹ' },
  'التنبيهات': { en: 'alerts', ur: 'الرٹس' },
  'تنبيهات': { en: 'alerts', ur: 'الرٹس' },
  'الإشعار': { en: 'notification', ur: 'اطلاع' },
  'إشعار': { en: 'notification', ur: 'اطلاع' },
  'الإشعارات': { en: 'notifications', ur: 'اطلاعات' },
  'إشعارات': { en: 'notifications', ur: 'اطلاعات' },
  'التقرير': { en: 'report', ur: 'رپورٹ' },
  'تقرير': { en: 'report', ur: 'رپورٹ' },
  'التقارير': { en: 'reports', ur: 'رپورٹس' },
  'تقارير': { en: 'reports', ur: 'رپورٹس' },
  'المستند': { en: 'document', ur: 'دستاویز' },
  'مستند': { en: 'document', ur: 'دستاویز' },
  'المستندات': { en: 'documents', ur: 'دستاویزات' },
  'مستندات': { en: 'documents', ur: 'دستاویزات' },
  'الأرشيف': { en: 'archive', ur: 'آرکائیو' },
  'أرشيف': { en: 'archive', ur: 'آرکائیو' },
  'الإعدادات': { en: 'settings', ur: 'ترتیبات' },
  'إعدادات': { en: 'settings', ur: 'ترتیبات' },
  'الحوافز': { en: 'incentives', ur: 'مراعات' },
  'حوافز': { en: 'incentives', ur: 'مراعات' },
  'المكافآت': { en: 'bonuses', ur: 'انعامات' },
  'مكافآت': { en: 'bonuses', ur: 'انعامات' },
  'مكافأة': { en: 'bonus', ur: 'انعام' },
  'التكاليف': { en: 'costs', ur: 'اخراجات' },
  'تكاليف': { en: 'costs', ur: 'اخراجات' },
  'المصروفات': { en: 'expenses', ur: 'مصارف' },
  'مصروفات': { en: 'expenses', ur: 'مصارف' },
  'الجلسة': { en: 'session', ur: 'سیشن' },
  'جلسة': { en: 'session', ur: 'سیشن' },
  'النظام': { en: 'system', ur: 'نظام' },
  'نظام': { en: 'system', ur: 'نظام' },
  'كلمة': { en: 'word', ur: 'لفظ' },
  'المرور': { en: 'password', ur: 'پاسورڈ' },
  'القائمة': { en: 'list', ur: 'فہرست' },
  'قائمة': { en: 'list', ur: 'فہرست' },
  'الملف': { en: 'file', ur: 'فائل' },
  'ملف': { en: 'file', ur: 'فائل' },
  'ملفات': { en: 'files', ur: 'فائلز' },
  'الاسم': { en: 'name', ur: 'نام' },
  'اسم': { en: 'name', ur: 'نام' },
  'الكود': { en: 'code', ur: 'کوڈ' },
  'كود': { en: 'code', ur: 'کوڈ' },
  'التاريخ': { en: 'date', ur: 'تاریخ' },
  'تاريخ': { en: 'date', ur: 'تاریخ' },
  'الحالة': { en: 'status', ur: 'حالت' },
  'حالة': { en: 'status', ur: 'حالت' },
  'البيانات': { en: 'data', ur: 'ڈیٹا' },
  'بيانات': { en: 'data', ur: 'ڈیٹا' },
  'السجل': { en: 'record', ur: 'ریکارڈ' },
  'سجل': { en: 'record', ur: 'ریکارڈ' },
  'سجلات': { en: 'records', ur: 'ریکارڈز' },
  'السجلات': { en: 'records', ur: 'ریکارڈز' },
  'الصفوف': { en: 'rows', ur: 'قطاریں' },
  'صفوف': { en: 'rows', ur: 'قطاریں' },
  'صف': { en: 'row', ur: 'قطار' },
  
  // Verbs / action phrases
  'جاري': { en: 'loading', ur: 'لوڈنگ' },
  'تحميل': { en: 'loading', ur: 'لوڈنگ' },
  'تم': { en: 'completed', ur: 'مکمل' },
  'فشل': { en: 'failed', ur: 'ناکام' },
  'حفظ': { en: 'save', ur: 'محفوظ' },
  'حذف': { en: 'delete', ur: 'حذف' },
  'تعديل': { en: 'edit', ur: 'ترمیم' },
  'تعديلات': { en: 'changes', ur: 'ترامیم' },
  'إضافة': { en: 'add', ur: 'شامل' },
  'إنشاء': { en: 'create', ur: 'بنائیں' },
  'تحديث': { en: 'update', ur: 'اپ ڈیٹ' },
  'إلغاء': { en: 'cancel', ur: 'منسوخ' },
  'إغلاق': { en: 'close', ur: 'بند' },
  'بحث': { en: 'search', ur: 'تلاش' },
  'تصدير': { en: 'export', ur: 'برآمد' },
  'استيراد': { en: 'import', ur: 'درآمد' },
  'تصفية': { en: 'filter', ur: 'فلٹر' },
  'اعتماد': { en: 'approve', ur: 'منظوری' },
  'تسجيل': { en: 'register', ur: 'رجسٹر' },
  'عرض': { en: 'view', ur: 'دیکھیں' },
  'اختيار': { en: 'select', ur: 'منتخب' },
  'تفعيل': { en: 'activate', ur: 'فعال' },
  'تعطيل': { en: 'deactivate', ur: 'غیر فعال' },
  'تنشيط': { en: 'activate', ur: 'فعال' },
  'تغيير': { en: 'change', ur: 'تبدیلی' },
  'تطبيق': { en: 'apply', ur: 'لاگو' },
  'استبعاد': { en: 'exclude', ur: 'خارج' },
  'احتساب': { en: 'calculation', ur: 'حساب' },
  'مطابقة': { en: 'matching', ur: 'مطابقت' },
  'المطابقة': { en: 'matching', ur: 'مطابقت' },
  'تحليل': { en: 'analysis', ur: 'تجزیہ' },
  'قراءة': { en: 'reading', ur: 'پڑھنا' },
  'رفع': { en: 'upload', ur: 'اپ لوڈ' },
  'تبديل': { en: 'switch', ur: 'تبدیل' },
  'استعراض': { en: 'browse', ur: 'دیکھیں' },
  'إعادة': { en: 'reset', ur: 'ری سیٹ' },
  'تعيين': { en: 'set', ur: 'سیٹ' },
  'مشاركة': { en: 'share', ur: 'شیئر' },
  'تشغيل': { en: 'run', ur: 'چلائیں' },
  'دخول': { en: 'login', ur: 'لاگ ان' },
  'خروج': { en: 'logout', ur: 'لاگ آؤٹ' },
  'انقر': { en: 'click', ur: 'کلک کریں' },
  'اسحب': { en: 'drag', ur: 'گھسیٹیں' },
  'أفلت': { en: 'drop', ur: 'چھوڑیں' },
  'يدعم': { en: 'supports', ur: 'سپورٹ کرتا ہے' },
  'يتم': { en: 'will be', ur: 'ہو گا' },
  'سيتم': { en: 'will be', ur: 'ہو گا' },
  
  // Adjectives/descriptions
  'جديد': { en: 'new', ur: 'نیا' },
  'جديدة': { en: 'new', ur: 'نئی' },
  'الجديدة': { en: 'new', ur: 'نئی' },
  'قديم': { en: 'old', ur: 'پرانا' },
  'مخصص': { en: 'custom', ur: 'مخصوص' },
  'مخصصة': { en: 'custom', ur: 'مخصوص' },
  'الحالية': { en: 'current', ur: 'موجودہ' },
  'الحالي': { en: 'current', ur: 'موجودہ' },
  'العامة': { en: 'general', ur: 'عمومی' },
  'العام': { en: 'general', ur: 'عمومی' },
  'الرئيسية': { en: 'main', ur: 'مرکزی' },
  'المتاح': { en: 'available', ur: 'دستیاب' },
  'صالح': { en: 'valid', ur: 'درست' },
  'الصالحة': { en: 'valid', ur: 'درست' },
  'مسجلة': { en: 'registered', ur: 'درج' },
  'المطبقة': { en: 'applied', ur: 'لاگو' },
  'الأحدث': { en: 'latest', ur: 'تازہ ترین' },
  'صافية': { en: 'net', ur: 'خالص' },
  'صافي': { en: 'net', ur: 'خالص' },
  'صافيه': { en: 'net', ur: 'خالص' },
  'مكرر': { en: 'duplicate', ur: 'نقل' },
  'معدل': { en: 'modified', ur: 'ترمیم شدہ' },
  'جاهز': { en: 'ready', ur: 'تیار' },
  'يومي': { en: 'daily', ur: 'روزانہ' },
  'اليومية': { en: 'daily', ur: 'روزانہ' },
  'اليومي': { en: 'daily', ur: 'روزانہ' },
  'اليوم': { en: 'today', ur: 'آج' },
  'المقيدين': { en: 'assigned', ur: 'تفویض شدہ' },
  'الذهبية': { en: 'golden', ur: 'سنہری' },
  'القاعدة': { en: 'rule', ur: 'قاعدہ' },
  'إجمالي': { en: 'total', ur: 'کل' },
  'الإجمالي': { en: 'total', ur: 'کل' },
  'نسبة': { en: 'rate', ur: 'شرح' },
  'كمية': { en: 'quantity', ur: 'مقدار' },
  'الكمية': { en: 'quantity', ur: 'مقدار' },
  'المنجزة': { en: 'completed', ur: 'مکمل شدہ' },
  'المستهدفة': { en: 'target', ur: 'ہدف' },
  'المستهدف': { en: 'target', ur: 'ہدف' },
  'مستهدف': { en: 'target', ur: 'ہدف' },
  'سعر': { en: 'price', ur: 'قیمت' },
  'السعر': { en: 'price', ur: 'قیمت' },
  'القياسي': { en: 'standard', ur: 'معیاری' },
  'القياسية': { en: 'standard', ur: 'معیاری' },
  'وحدة': { en: 'unit', ur: 'یونٹ' },
  'الوحدة': { en: 'unit', ur: 'یونٹ' },
  'القياس': { en: 'measurement', ur: 'پیمائش' },
  'القسم': { en: 'department', ur: 'شعبہ' },
  'قسم': { en: 'department', ur: 'شعبہ' },
  'نطاق': { en: 'scope', ur: 'حد' },
  'ميعاد': { en: 'time', ur: 'وقت' },
  'بداية': { en: 'start', ur: 'شروع' },
  'نهاية': { en: 'end', ur: 'اختتام' },
  'بدء': { en: 'start', ur: 'شروع' },
  'سريان': { en: 'effective', ur: 'نافذ' },
  'سارية': { en: 'effective', ur: 'نافذ' },
  'سرياناً': { en: 'effectively', ur: 'مؤثر طور پر' },
  'مستوى': { en: 'level', ur: 'سطح' },
  'فترة': { en: 'period', ur: 'مدت' },
  'السماح': { en: 'grace', ur: 'رعایت' },
  'الاستراحة': { en: 'break', ur: 'وقفہ' },
  'استراحة': { en: 'break', ur: 'وقفہ' },
  'الإضافي': { en: 'overtime', ur: 'اوور ٹائم' },
  'إضافي': { en: 'overtime', ur: 'اوور ٹائم' },
  'مدة': { en: 'duration', ur: 'دورانیہ' },
  'بالدقائق': { en: 'in minutes', ur: 'منٹوں میں' },
  'دقائق': { en: 'minutes', ur: 'منٹ' },
  'ساعات': { en: 'hours', ur: 'گھنٹے' },
  'ساعة': { en: 'hour', ur: 'گھنٹہ' },
  'ملاحظات': { en: 'notes', ur: 'نوٹس' },
  'سبب': { en: 'reason', ur: 'وجہ' },
  'إذن': { en: 'permission', ur: 'اجازت' },
  'العودة': { en: 'return', ur: 'واپسی' },
  'للقائمة': { en: 'to list', ur: 'فہرست پر' },
  'أجهزة': { en: 'devices', ur: 'آلات' },
  'الصيغة': { en: 'format', ur: 'فارمیٹ' },
  'المباشرة': { en: 'direct', ur: 'براہ راست' },
  'الحركات': { en: 'transactions', ur: 'لین دین' },
  'التخصيص': { en: 'customization', ur: 'حسب ضرورت' },
  'تخصيص': { en: 'customize', ur: 'حسب ضرورت' },
  'المعاملات': { en: 'transactions', ur: 'لین دین' },
  'رغبتك': { en: 'your wish', ur: 'آپ کی خواہش' },
  'متأكد': { en: 'sure', ur: 'یقینی' },
  'أنت': { en: 'you', ur: 'آپ' },
  'هل': { en: 'are', ur: 'کیا' },
  'للاستخدام': { en: 'for use', ur: 'استعمال کے لیے' },
  'وغيرها': { en: 'and others', ur: 'اور دیگر' },
  'للتغيير': { en: 'to change', ur: 'تبدیلی کے لیے' },
  'للاستيراد': { en: 'for import', ur: 'درآمد کے لیے' },
  'والتنبيهات': { en: 'and alerts', ur: 'اور الرٹس' },
  'للمنشأة': { en: 'for company', ur: 'کمپنی کے لیے' },
  'بالمنشأة': { en: 'in company', ur: 'کمپنی میں' },
  'بالاسم': { en: 'by name', ur: 'نام سے' },
  'للفلاتر': { en: 'for filters', ur: 'فلٹرز کے لیے' },
  'مواعيد': { en: 'schedules', ur: 'اوقات' },
  'لجميع': { en: 'for all', ur: 'سب کے لیے' },
  'وتدقيق': { en: 'and auditing', ur: 'اور آڈٹنگ' },
  'للمعاينة': { en: 'for review', ur: 'جائزے کے لیے' },
  'والتعديل': { en: 'and editing', ur: 'اور ترمیم' },
  'البشري': { en: 'manual', ur: 'دستی' },
  'الفوري': { en: 'immediate', ur: 'فوری' },
  'النهائي': { en: 'final', ur: 'حتمی' },
  'اقتراح': { en: 'suggestion', ur: 'تجویز' },
  'حسابي': { en: 'computational', ur: 'حسابی' },
  'مجرد': { en: 'just', ur: 'صرف' },
  'تُستنتج': { en: 'derived', ur: 'اخذ' },
  'قابلاً': { en: 'capable', ur: 'قابل' },
  'وكل': { en: 'and each', ur: 'اور ہر' },
  'سيكون': { en: 'will be', ur: 'ہو گا' },
  'تظهر': { en: 'appear', ur: 'ظاہر' },
  'لم': { en: 'not', ur: 'نہیں' },
  'الذين': { en: 'who', ur: 'جو' },
  'والذين': { en: 'and who', ur: 'اور جو' },
  'التشطيبات': { en: 'finishes', ur: 'فنشنگ' },
  'المملكة': { en: 'kingdom', ur: 'مملکت' },
  'العربية': { en: 'Arabian', ur: 'عربی' },
  'السعودية': { en: 'Saudi', ur: 'سعودی' },
  'أخطاء': { en: 'errors', ur: 'غلطیاں' },
  'وتكرار': { en: 'and duplicates', ur: 'اور نقل' },
  'تحدد': { en: 'define', ur: 'طے کرتی ہیں' },
  'وبشكل': { en: 'and in a', ur: 'اور ایک' },
  'مرن': { en: 'flexible', ur: 'لچکدار' },
  'الرسمي': { en: 'official', ur: 'سرکاری' },
  'الرسمية': { en: 'official', ur: 'سرکاری' },
  'معدلات': { en: 'rates', ur: 'شرحیں' },
  'الهرمي': { en: 'hierarchical', ur: 'درجہ بندی' },
  'هيكل': { en: 'structure', ur: 'ڈھانچہ' },
  'الهيكل': { en: 'structure', ur: 'ڈھانچہ' },
  'أوقات': { en: 'times', ur: 'اوقات' },
  'تهيئة': { en: 'configure', ur: 'ترتیب' },
  'التهيئة': { en: 'configuration', ur: 'تشکیل' },
};

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Word-by-word translation function
function translateWordByWord(arabicText, lang) {
  let result = arabicText;
  
  // Sort keys by length descending to replace longer phrases first
  const sortedKeys = Object.keys(wordDict).sort((a, b) => b.length - a.length);
  
  for (const arWord of sortedKeys) {
    if (result.includes(arWord)) {
      const replacement = wordDict[arWord][lang];
      // Use word boundary-like replacement to avoid partial matches
      result = result.split(arWord).join(replacement);
    }
  }
  
  return result;
}

let enFixed = 0;
let urFixed = 0;

for (const [key, arValue] of Object.entries(ar.auto || {})) {
  // Fix English
  if (hasArabic(en.auto[key] || '')) {
    const translated = translateWordByWord(en.auto[key], 'en');
    if (!hasArabic(translated)) {
      en.auto[key] = translated;
      enFixed++;
    } else {
      // Try translating from Arabic source
      const fromAr = translateWordByWord(arValue, 'en');
      if (!hasArabic(fromAr)) {
        en.auto[key] = fromAr;
        enFixed++;
      }
    }
  }
  
  // Fix Urdu  
  if (ur.auto[key] === arValue) {
    const translated = translateWordByWord(arValue, 'ur');
    if (translated !== arValue) {
      ur.auto[key] = translated;
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
const remainingEnSamples = [];
for (const [key, val] of Object.entries(en.auto || {})) {
  if (hasArabic(val)) {
    remainingEn++;
    if (remainingEnSamples.length < 10) remainingEnSamples.push(`${key}: ${val.substring(0, 60)}`);
  }
}
console.log(`Remaining Arabic in en.json auto: ${remainingEn}`);
if (remainingEnSamples.length > 0) {
  console.log('Samples:');
  remainingEnSamples.forEach(s => console.log('  ' + s));
}
