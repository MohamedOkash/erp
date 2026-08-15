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
