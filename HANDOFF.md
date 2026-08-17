# Construction ERP — Handoff (Source of Truth)

## 1) التعريف
- ERP لمقاول تشطيبات؛ عربي أول RTL + إنجليزي.
- فروع/بنود/وحدات/مناطق/حالات ديناميكية 100% — ممنوع الـ hard-coding.
- التسلسل: شركة → فرع → مشروع → مناطق (شجرة قابلة للإعداد) → بند → إنتاج → عمال.

## 2) الأدوار والصلاحيات
- أدوار: super_admin, company_admin, branch_manager, project_manager, engineer, supervisor, data_entry, viewer, worker.
- صلاحيات granular بصيغة module.action + نطاق بيانات (company/branch/project).
- حسابات المعاينة: supervisor / engineer / admin — كلمة المرور 123456.

## 3) قواعد عمل حرجة
- الرقم القومي فريد لكل شركة + بحث فوري منه من أي شاشة.
- الإنتاج: فردي/فريق/مختلط؛ في الفردي مجموع كميات العمال = الفعلي (تحقق إجباري).
- الاعتماد: draft→submitted→supervisor_approved→engineer_approved→final_approved؛ الرفض بسبب إجباري؛ النهائي مقفول.
- التصحيحات additive فقط على المقفول (quantity_adjust/annul/note) وتدخل التقدم بعد اعتمادها.
- الاستيراد: upload→parse→staging→validate→preview→commit؛ لا كتابة خام أبدًا.
- التدقيق append-only؛ التصدير async للملفات الكبيرة؛ الطباعة بترويسة وتوقيعات.
- Multi-tenant: company_id في كل جدول + RLS عبر current_setting('app.company_id') + composite FKs.

## 4) قواعد الحساب R1–R12 (مرجع لا يتغير إلا بطلب صريح)
R1 إنتاجية السجل = فعلي÷مستهدف×100 (مستهدف>0).
R2 إنتاجية الفترة مرجّحة = Σفعلي÷Σمستهدف×100 (مش متوسط نسب).
R3 المحسوب = مقدم+معتمدات فقط (مسودة/مرفوض/ملغي خارج).
R4 تقدم BOQ الرسمي = معتمد نهائياً + تصحيحات معتمدة فقط.
R5 مؤكد العامل = مجموع كمياته الفردية فقط.
R6 مشاركات الفريق تُعرض منفصلة وموسومة "تقديري".
R7 متوسط العامل اليومي = مؤكده ÷ أيام إنتاجه.
R8 لكل يوم-حضور = Σفعلي ÷ Σ حضور "حاضر".
R9 أي رقم تقديري موسوم دائمًا.
R10 إجمالي الفرع = Σ سجلات كل بنوده (بحدود R3).
R11 أعمدة الـ Pivot اليومية تُجمع عموديًا لتطابق إجمالي البند والفترة.
R12 زمن تقديري للبند = متبقي ÷ متوسط يومي معتمد (آخر 14 يوم) — موسوم تقديري.

## 5) قاعدة البيانات (قرارات ملزمة)
- PostgreSQL. الجداول: companies, branches, projects, work_areas, units, work_items, branch_work_items, employees, employee_assignments, employee_history, users, sessions, roles, permissions, role_permissions, user_roles, productivity_targets, boq, boq_items, boq_item_areas, boq_revisions, production_records, production_workers, production_attachments, production_corrections, attendance, attendance_statuses, approval_workflows, approval_steps, approval_actions, cost_entries, incentive_rules, incentive_ledger, documents, document_versions, document_categories, import_jobs, import_staging_rows, import_row_errors, export_jobs, notifications, notification_preferences, alert_rules, audit_logs, saved_reports.
- ممنوع subquery داخل predicate فهرس (كان فيه NOT EXISTS باطلة) → البديل عمود has_area_split + trigger صيانة + فهرس partial سليم.
- تحقق تقسيم الكميات على المناطق: CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED.
- آلة حالات الإنتاج + القفل: triggers BEFORE UPDATE (انتقال غير صالح = exception؛ المقفول لا يُعدّل).
- التدقيق: REVOKE UPDATE/DELETE/TRUNCATE + trigger immutable.
- منع تكرار الإنتاج: unique partial على (date,project,branch,item,COALESCE(area),COALESCE(team_code),supervisor) WHERE status ليس rejected/cancelled.
- view v_boq_progress = final_approved + approved corrections.

## 6) المسلم سابقًا
- preview/index.html (v6): كل الشاشات والقواعد شغالة client-side — مرجع UI/قواعد فقط.
- أجزاء SQL متفرقة في الشات القديم — تُستبدل بتوليد موحد من هذا المستند.

## 7) المتبقي بالأولوية
1 باك-إند حقيقي NestJS+PG+auth+RLS | 2 XLSX حقيقي | 3 مستندات/صور بإصدارات | 4 طباعة/PDF بهوية الشركة | 5 تكاليف وحوافز | 6 استيراد إنتاج/BOQ/حضور + restore | 7 Report Builder | 8 شاشة مستخدمين وصلاحيات | 9 offline (draft+queue+idempotency) | 10 تنبيهات مجدولة + مستهدف لكل عامل | 11 اختبارات/CI/CD/مراقبة.

## 8) Stack وهيكلة مقترحة
- apps/api: NestJS modules (auth, employees, projects, work-areas, work-items, units, boq, production, attendance, productivity, costs, incentives, documents, imports, exports, reports, approvals, notifications, audit).
- حسابات R1–R12 في domain services مستقلة (مثلاً productivity.service) — ممنوع داخل controllers أو مكونات واجهة.
- db/migrations مرقمة؛ packages/shared للأنواع؛ preview/ كما هي.

## 9) أول مهام الـ agent
1) توليد db/migrations/0001_init.sql موحّدة طبق قسم 5 (جداول+قيود+فهارس+RLS+seed أدوار/صلاحيات/حالات حضور).
2) توليد 0002_seed_demo.sql: 5 فروع، مشروعين، مناطق، 20 عامل+3 مشرفين+2 مهندسين، بنود لكل فرع، BOQ، إنتاج 14 يوم بحالات متفاوتة، حضور 3 أيام.
3) Scaffold باك-إند: tenant (set_config داخل transaction)، sessions+hashing، audit interceptor، module employees مع GET by-identity + اختبارات (تفريد هوية، انتقالات اعتماد).
4) عدم لمس preview/index.html.

## 10) دعم تعدد الدول والتركيز على المملكة العربية السعودية (Multi-Country & Saudi Arabia Localization)
تم تهيئة وتطوير نموذج البيانات لدعم المملكة العربية السعودية كدولة أساسية مع قابلية كاملة للتوسع والتوطين لأي دولة أخرى (مصر، الإمارات، قطر، إلخ):
- **جدول الشركات (`companies`):** تم إضافة حقول `country` (رمز ISO مثل 'SA')، `currency` (مثل 'SAR')، و `default_language` (مثل 'ar').
- **جدول الموظفين (`employees`):**
  - تعميم حقل الهوية إلى `identity_number` مع دعم الأنواع: `national_id` (هوية وطنية للسعوديين والمواطنين)، `iqama` (إقامة للمقيمين)، `passport` (جواز سفر).
  - إضافة `identity_expiry_date` (تاريخ انتهاء الهوية/الإقامة) و `nationality` (الجنسية).
- **الميزات المجهزة في الـ Schema وجاهزة للتفعيل البرمجي عند طلب موديول الرواتب (Payroll):**
  1. **نظام حماية الأجور (WPS - Wage Protection System):** تصدير ملفات مسيرات الرواتب بالصيغ المعتمدة من البنوك السعودية ووزارة الموارد البشرية.
  2. **برنامج نطاقات (Nitaqat / Saudization):** حساب نسبة التوطين آليًا بمقارنة عدد الموظفين السعوديين (`identity_type = 'national_id'`) بإجمالي القوى العاملة.
  3. **التأمينات الاجتماعية (GOSI):** دعم حساب استقطاعات التأمينات للسعوديين (9.75% للموظف) ولغير السعوديين (2% أخطار مهنية).
  4. **محرك تنبيهات انتهاء الإقامات (Iqama Expiry Engine):** قواعد تنبيهات مجدولة تفحص `identity_expiry_date` قبل 30 و 60 و 90 يومًا وترسل إشعارات للمشرفين ومديري الموارد البشرية.

## 11) إعادة هيكلة SACODECO الشاملة لمقاولات التشطيبات (SACODECO Restructuring)
تم تنفيذ وتثبيت المراحل الخمس (Phases 1–5) بنجاح:
1. **هرمية الأدوار وسلسلة الاعتماد (Roles & Approvals):**
   - إضافة دور `program_manager` (مدير المشاريع / أعلى سلطة تنفيذية) بجانب `project_manager`.
   - سلسلة الاعتماد الصارمة: المشرف يرفع مسودة (`draft` $\rightarrow$ `submitted`) ولا يعتمد $\leftarrow$ المهندس يعتمد الموقع (`submitted` $\rightarrow$ `engineer_approved`) $\leftarrow$ مدير المشروع أو الإدارة تعتمد نهائيًا وتغلق السجل (`engineer_approved` $\rightarrow$ `final_approved`).
   - تعديل المستهدفات ومعدلات الإنتاجية والأسعار مقتصر على مديري المشاريع والإدارة فقط.
2. **كتالوج الـ 15 قسم تشطيبات والمقايسة الهرمية (Finishing BOQ Catalog & Stages):**
   - بياض/محارة، دهانات داخلية وخارجية، جبس بورد، سيراميك، بورسلان، رخام وجرانيت، مباني وبلوك، نجارة وأبواب، ألومنيوم وواجهات، كهرباء، سباكة، تكييف، عزل مائي وحراري، خرسانة مطبوعة وفيرفيس، إيبوكسي وأرضيات صناعية.
   - تقسيم كل بند إلى مراحل تنفيذ بأوزان نسبية ومعدلات إنتاجية يومية قياسية وأسعار عقد ومواد وأجور عمالة (فني ومساعد).
3. **نظام تنقل الكوادر والمشرفين (Staff Transfers System):**
   - تقديم طلب نقل من المهندس/المدير مع تحديد السبب ودرجة الاستعجال (عادي / عاجل).
   - دورة حياة الطلب: `pending` $\rightarrow$ `approved` / `rejected` $\rightarrow$ `executed`.
   - عند التنفيذ الفعلي يتم تحديث وتعديل تعيين الموظف (`employee_assignments`) آلياً في المشروع الجديد.
4. **تسجيل الإنتاج المرحلي والتقدم التراكمي الموزون (Stage-based Production & Weighted Progress):**
   - حقل `work_item_stage_id` في سجل الإنتاج، واقتراح تلقائي لمعدل الإنتاج القياسي.
   - حقول إضافية للعامل: `overtime_hours`, `bonus_percentage`, `skill_level`.
   - View `v_boq_progress_weighted` لحساب التقدم الموزون وفق وزن المرحلة ونسبتها المعتمدة.
5. **واجهات المستخدم التفاعلية (Frontend UI):**
   - شاشة بنود الأعمال المحدثة مع تصفية الأقسام ونوافذ إدارة المراحل والأسعار (`WorkItemsPage.tsx`, `StagesManagementModal.tsx`, `PricesManagementModal.tsx`).
   - نافذة إدخال الإنتاج المرحلي مع إضافي وحوافز العمال (`ProductionFormModal.tsx`).
   - شاشة ونافذة طلبات النقل والاعتماد والتنفيذ الفعلي (`TransfersPage.tsx`, `TransferRequestModal.tsx`).

## 12) بروتوكول التحقق الحتمي وحظر المتصفح الآلي نهائيًا (Deterministic Verification & Strict Browser Ban)
- **قاعدة دائمة ملزمة:** يُحظر نهائيًا استخدام أي Browser tasks أو محاكاة متصفح آلي في التحقق من أي مهمة قادمة.
- **معايير التحقق الحتمية (Deterministic Standards):**
  1. `npm run build` في `apps/web` $\rightarrow$ أخضر بدون أي خطأ (Exit Code 0).
  2. `npm test` في `apps/api` $\rightarrow$ أخضر بدون أي خطأ (Exit Code 0).
  3. `node scripts/check-i18n.js` أو `npm run i18n:check` $\rightarrow$ صفر مفاتيح ناقصة في القواميس الثلاثة (`ar`, `en`, `ur`).
  4. `grep` موجه للتأكد من انعدام النصوص الحرفية خارج منظومة الترجمة `t()`.
