-- ============================================================================
-- Migration: 0012_bootstrap_first_run.sql
-- Description: Idempotent first-run bootstrap for fresh production installations.
--              Ensures a default company, super admin user, and system linkage exist
--              without introducing any mock/demo operational data.
-- ============================================================================

BEGIN;

-- 1. Default Company (if no company exists)
INSERT INTO companies (
    id,
    name,
    code,
    is_active,
    created_at,
    updated_at
)
SELECT 
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'شركتي للمقاولات',
    'CMP-001',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM companies
);

-- 2. System Super Admin User (if no admin user exists)
-- Default initial password: Admin@2026!Secure (Must be changed upon initial deployment)
INSERT INTO users (
    id,
    company_id,
    employee_id,
    username,
    email,
    password_hash,
    full_name,
    is_active,
    created_at,
    updated_at
)
SELECT 
    '00000000-0000-0000-0003-000000000001'::uuid,
    (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1),
    NULL,
    'admin',
    'admin@company.com',
    '$2b$10$.Y5UTIAwK/yJ9i/T5vLn2Oeg2jwocSCGx.tkmWM2WkE./K5alLO0u',
    'مدير النظام',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin'
);

-- 3. Link Admin User to Company Admin Role
INSERT INTO user_roles (
    user_id,
    role_id,
    scope_type,
    scope_id
)
SELECT 
    u.id,
    r.id,
    'company',
    NULL
FROM users u
CROSS JOIN roles r
WHERE u.username = 'admin'
  AND r.code = 'company_admin'
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- 4. Default Company Attendance Policy (if none exists)
INSERT INTO attendance_policies (
    id,
    company_id,
    project_id,
    shift_start_time,
    shift_end_time,
    grace_minutes,
    break_minutes,
    overtime_threshold_hours,
    overtime_multiplier,
    effective_from,
    is_active
)
SELECT
    '00000000-0000-0000-0008-000000000001'::uuid,
    c.id,
    NULL,
    '08:00:00'::time,
    '17:00:00'::time,
    15,
    60,
    8.00,
    1.50,
    '2020-01-01'::date,
    true
FROM companies c
ORDER BY c.created_at ASC
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 5. Default Company Settings / Calculation Parameters (if none exist)
INSERT INTO company_settings (company_id, key, value, data_type, category, display_name_ar, description_ar)
SELECT 
    c.id,
    defaults.key,
    defaults.value,
    defaults.data_type,
    defaults.category,
    defaults.display_name_ar,
    defaults.description_ar
FROM companies c
CROSS JOIN (
    VALUES
        ('hours_per_work_day', '8', 'number', 'calculation', 'ساعات العمل اليومية القياسية', 'عدد ساعات يوم العمل المعتمدة في حساب إنتاجية الساعة وتكلفة الأجور'),
        ('overtime_multiplier', '1.5', 'number', 'calculation', 'معامل احتساب الوقت الإضافي', 'مضاعف أجر الساعة لساعات العمل الإضافية في حساب تكاليف العمالة'),
        ('rounding_decimals', '2', 'number', 'calculation', 'دقة التقريب العشري', 'عدد الخانات العشرية في احتساب المبالغ والكميات ونسب الإنجاز'),
        ('default_crew_skilled', '1', 'number', 'calculation', 'العدد الافتراضي للفنيين في الفرقة', 'عدد الفنيين (المعلمين) الافتراضي في طاقم العمل ببطاقات التحكم'),
        ('default_crew_unskilled', '1', 'number', 'calculation', 'العدد الافتراضي للمساعدين في الفرقة', 'عدد المساعدين (العمال) الافتراضي في طاقم العمل ببطاقات التحكم'),
        ('default_daily_productivity', '20', 'number', 'calculation', 'الإنتاجية اليومية القياسية للبند', 'معدل الإنتاج اليومي الافتراضي للبنود القياسية'),
        ('default_skilled_daily_wage', '224', 'number', 'calculation', 'أجر يومية الفني الافتراضي (ريال)', 'قيمة يومية المعلم / الفني الافتراضية في النظام'),
        ('default_unskilled_daily_wage', '208', 'number', 'calculation', 'أجر يومية المساعد الافتراضي (ريال)', 'قيمة يومية المساعد / العامل الافتراضية في النظام')
) AS defaults(key, value, data_type, category, display_name_ar, description_ar)
ON CONFLICT (company_id, key) DO NOTHING;

COMMIT;
