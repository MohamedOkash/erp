-- ============================================================================
-- Migration 0011: Company Settings & Editable Calculation Parameters
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    data_type VARCHAR(50) NOT NULL DEFAULT 'number',
    category VARCHAR(50) NOT NULL DEFAULT 'calculation',
    display_name_ar VARCHAR(255) NOT NULL DEFAULT '',
    description_ar TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, key)
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company_key ON company_settings(company_id, key);

-- Seed default calculation & operational parameters for all existing companies
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
