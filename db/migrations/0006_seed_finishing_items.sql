-- ============================================================================
-- Migration: 0006_seed_finishing_items.sql
-- Description: Complete Finishing Catalog for SACODECO (15 Departments + Items + Stages + Prices)
-- ============================================================================

DO $$
DECLARE
    v_company_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_unit_m2 UUID;
    v_unit_m UUID;
    v_unit_pc UUID;
    v_unit_kg UUID;

    -- Department IDs
    v_dept_plaster UUID := gen_random_uuid();
    v_dept_paint UUID := gen_random_uuid();
    v_dept_gypsum UUID := gen_random_uuid();
    v_dept_ceramic UUID := gen_random_uuid();
    v_dept_porcelain UUID := gen_random_uuid();
    v_dept_marble UUID := gen_random_uuid();
    v_dept_block UUID := gen_random_uuid();
    v_dept_woodwork UUID := gen_random_uuid();
    v_dept_aluminum UUID := gen_random_uuid();
    v_dept_electrical UUID := gen_random_uuid();
    v_dept_plumbing UUID := gen_random_uuid();
    v_dept_hvac UUID := gen_random_uuid();
    v_dept_waterproof UUID := gen_random_uuid();
    v_dept_fairfaced UUID := gen_random_uuid();
    v_dept_epoxy UUID := gen_random_uuid();

    -- Item IDs
    v_item_id UUID;
BEGIN
    -- Ensure units exist
    SELECT id INTO v_unit_m2 FROM units WHERE company_id = v_company_id AND name = 'متر مربع' LIMIT 1;
    IF v_unit_m2 IS NULL THEN
        INSERT INTO units (company_id, name, symbol) VALUES (v_company_id, 'متر مربع', 'م2') RETURNING id INTO v_unit_m2;
    END IF;

    SELECT id INTO v_unit_m FROM units WHERE company_id = v_company_id AND name = 'متر طولي' LIMIT 1;
    IF v_unit_m IS NULL THEN
        INSERT INTO units (company_id, name, symbol) VALUES (v_company_id, 'متر طولي', 'م.ط') RETURNING id INTO v_unit_m;
    END IF;

    SELECT id INTO v_unit_pc FROM units WHERE company_id = v_company_id AND name = 'عدد' LIMIT 1;
    IF v_unit_pc IS NULL THEN
        INSERT INTO units (company_id, name, symbol) VALUES (v_company_id, 'عدد', 'عدد') RETURNING id INTO v_unit_pc;
    END IF;

    -- 1. Insert 15 Main Departments in work_categories (level = 1)
    INSERT INTO work_categories (id, company_id, parent_id, level, name, code, sort_order) VALUES
        (v_dept_plaster, v_company_id, NULL, 1, 'أعمال المحارة واللياسة', 'DEPT-PLASTER', 1),
        (v_dept_paint, v_company_id, NULL, 1, 'أعمال الدهانات والتشطيبات', 'DEPT-PAINT', 2),
        (v_dept_gypsum, v_company_id, NULL, 1, 'أعمال الجبس والأسقف المعلقة', 'DEPT-GYPSUM', 3),
        (v_dept_ceramic, v_company_id, NULL, 1, 'أعمال السيراميك والبورسلين', 'DEPT-CERAMIC', 4),
        (v_dept_porcelain, v_company_id, NULL, 1, 'أعمال البورسلين الفاخر', 'DEPT-PORCELAIN', 5),
        (v_dept_marble, v_company_id, NULL, 1, 'أعمال الرخام والجرانيت', 'DEPT-MARBLE', 6),
        (v_dept_block, v_company_id, NULL, 1, 'أعمال البلوك والمباني', 'DEPT-BLOCK', 7),
        (v_dept_woodwork, v_company_id, NULL, 1, 'أعمال النجارة والأبواب', 'DEPT-WOOD', 8),
        (v_dept_aluminum, v_company_id, NULL, 1, 'أعمال الألومنيوم والواجهات', 'DEPT-ALUM', 9),
        (v_dept_electrical, v_company_id, NULL, 1, 'أعمال التأسيسات والتركيبات الكهربائية', 'DEPT-ELEC', 10),
        (v_dept_plumbing, v_company_id, NULL, 1, 'أعمال السباكة والصرف الصحي', 'DEPT-PLUMB', 11),
        (v_dept_hvac, v_company_id, NULL, 1, 'أعمال التكييف والتهوية', 'DEPT-HVAC', 12),
        (v_dept_waterproof, v_company_id, NULL, 1, 'أعمال العزل المائي والحراري', 'DEPT-INSUL', 13),
        (v_dept_fairfaced, v_company_id, NULL, 1, 'أعمال الخرسانة المكشوفة واللياسة المعمارية', 'DEPT-FAIR', 14),
        (v_dept_epoxy, v_company_id, NULL, 1, 'أعمال الإيبوكسي والأرضيات الصناعية', 'DEPT-EPOXY', 15)
    ON CONFLICT (company_id, code) DO NOTHING;

    -- =========================================================================
    -- Items & Stages: GYPSUM DEPARTMENT
    -- =========================================================================
    -- Item: Gypsum Board Ceiling
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_gypsum, 'أسقف جبس بورد مستوية (GP CEILING)', 'GYP-01', 'جبس', 235.00, 20.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'مرحلة تركيب الهيكل والشاسيه (SYSTEM STAGE)', 'STG-01', 0.70, 25.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'مرحلة المعجون والتشطيب (FINISH STAGE)', 'STG-02', 0.30, 40.00, v_unit_m2, 2)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
    VALUES (v_company_id, v_item_id, 235.00, 0.00, 224.00, 208.00)
    ON CONFLICT DO NOTHING;

    -- Item: Gypsum Board Walls
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_gypsum, 'قواطع جدران جبس بورد (GPC)', 'GYP-02', 'جبس', 150.00, 27.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'مرحلة الشاسيه والعزل (SYSTEM STAGE)', 'STG-01', 0.50, 30.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'مرحلة الألواح والتشطيب (FINISH STAGE)', 'STG-02', 0.50, 30.00, v_unit_m2, 2)
    ON CONFLICT DO NOTHING;

    -- Item: Ceiling Tunnel
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_gypsum, 'أسقف ديكورية معقدة (CEILING TUNNEL)', 'GYP-03', 'جبس', 3000.00, 2.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'نظام الهيكل الحامل (CEILING SYSTEM)', 'STG-01', 0.50, 3.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'تركيب الألواح التخصصية (CEILING PANEL)', 'STG-02', 0.50, 3.00, v_unit_m2, 2)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
    VALUES (v_company_id, v_item_id, 3000.00, 2100.00, 224.00, 208.00)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- Items & Stages: BLOCK DEPARTMENT
    -- =========================================================================
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_block, 'مباني حوائط بلوك أسمنتي (BLOCK WALLS)', 'BLK-01', 'بلوك', 220.00, 65.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'المدماك الأول والتأكيس (FIRST CORSE)', 'STG-01', 0.15, 50.00, v_unit_pc, 1),
        (v_company_id, v_item_id, 'بناء كامل الارتفاع والتشريك (FULL HEIGHT)', 'STG-02', 0.85, 80.00, v_unit_pc, 2)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
    VALUES (v_company_id, v_item_id, 220.00, 95.00, 224.00, 208.00)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- Items & Stages: EPOXY DEPARTMENT
    -- =========================================================================
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_epoxy, 'أرضيات إيبوكسي صناعية متكاملة (EPOXY SCREED)', 'EPX-01', 'إيبوكسي', 295.00, 33.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'تجهيز وتنظيف السطح (SURFACE PREPARATION)', 'STG-01', 0.08, 100.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'معالجة الشروخ والبادجات (BADGES)', 'STG-02', 0.04, 80.00, v_unit_m2, 2),
        (v_company_id, v_item_id, 'مونة ملء الفراغات (FILLING MORTER)', 'STG-03', 0.21, 50.00, v_unit_m2, 3),
        (v_company_id, v_item_id, 'سنفرة المرحلة الأولى (SANDING 1)', 'STG-04', 0.08, 120.00, v_unit_m2, 4),
        (v_company_id, v_item_id, 'سكينة معجون أولى (PUTTY 1)', 'STG-05', 0.08, 90.00, v_unit_m2, 5),
        (v_company_id, v_item_id, 'سنفرة المرحلة الثانية (SANDING 2)', 'STG-06', 0.08, 120.00, v_unit_m2, 6),
        (v_company_id, v_item_id, 'سكينة معجون ثانية (PUTTY 2)', 'STG-07', 0.08, 90.00, v_unit_m2, 7),
        (v_company_id, v_item_id, 'طبقة إيبوكسي أولى (F.EPOXY)', 'STG-08', 0.17, 70.00, v_unit_m2, 8),
        (v_company_id, v_item_id, 'طبقة إيبوكسي نهائية (S.EPOXY)', 'STG-09', 0.18, 70.00, v_unit_m2, 9)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
    VALUES (v_company_id, v_item_id, 295.00, 108.00, 224.00, 208.00)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- Items & Stages: PLASTERING (محارة)
    -- =========================================================================
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_plaster, 'محارة داخلية بالبؤج والأوتار', 'PLS-01', 'محارة', 45.00, 35.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'طرطشة مسمارية وشبك ممدد', 'STG-01', 0.20, 80.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'عمل البؤج والأوتار وضبط الاستقامة', 'STG-02', 0.30, 50.00, v_unit_m2, 2),
        (v_company_id, v_item_id, 'ملء المحارة والمس والتخشين', 'STG-03', 0.50, 40.00, v_unit_m2, 3)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- Items & Stages: PAINTING (دهانات)
    -- =========================================================================
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_paint, 'دهانات داخلية فاخرة 3 سكاكين معجون + وجهين', 'PNT-01', 'دهانات', 35.00, 45.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'سيلر حراري وتأسيس المعجون (سكينة 1 و 2)', 'STG-01', 0.40, 60.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'سنفرة وسكينة ثالثة وبطانة', 'STG-02', 0.30, 50.00, v_unit_m2, 2),
        (v_company_id, v_item_id, 'وجهين دهان نهائي (Finish Coats)', 'STG-03', 0.30, 70.00, v_unit_m2, 3)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- Items & Stages: CERAMIC & PORCELAIN (سيراميك وبورسلين)
    -- =========================================================================
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_ceramic, 'تركيب سيراميك أرضيات بالمونة', 'CRM-01', 'سيراميك', 55.00, 25.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'فرش الدفان وضبط الميول', 'STG-01', 0.25, 40.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'رص البلاط وتثبيت الفواصل', 'STG-02', 0.60, 25.00, v_unit_m2, 2),
        (v_company_id, v_item_id, 'الترويبة والنظافة والتسليم', 'STG-03', 0.15, 80.00, v_unit_m2, 3)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- Items & Stages: MARBLE (رخام)
    -- =========================================================================
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_marble, 'تركيب رخام أرضيات وجلي وتلميع', 'MRB-01', 'رخام', 180.00, 15.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'تركيب ألواح الرخام بالمونة والأكسيد', 'STG-01', 0.60, 15.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'جلي وتسوية الفواصل بأحجار الماس', 'STG-02', 0.25, 30.00, v_unit_m2, 2),
        (v_company_id, v_item_id, 'تلميع بالكريستال وتشميع نهائي', 'STG-03', 0.15, 50.00, v_unit_m2, 3)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- Items & Stages: WOODWORK (نجارة)
    -- =========================================================================
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_pc, v_dept_woodwork, 'تركيب أبواب خشب قشرة أرو متكاملة', 'WOD-01', 'نجارة', 450.00, 6.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'تثبيت الحلوق الخشبية وضبط الزوايا', 'STG-01', 0.40, 10.00, v_unit_pc, 1),
        (v_company_id, v_item_id, 'تسكيك الدلف وتركيب الكوالين والمفصلات', 'STG-02', 0.40, 8.00, v_unit_pc, 2),
        (v_company_id, v_item_id, 'تركيب البراوير والتشطيب النهائي', 'STG-03', 0.20, 15.00, v_unit_pc, 3)
    ON CONFLICT DO NOTHING;

    -- =========================================================================
    -- Items & Stages: WATERPROOFING (عزل)
    -- =========================================================================
    v_item_id := gen_random_uuid();
    INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target)
    VALUES (v_item_id, v_company_id, v_unit_m2, v_dept_waterproof, 'عزل مائي لفائف ممبرين 4 مم مع الاختبار', 'INS-01', 'عزل', 65.00, 50.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
        (v_company_id, v_item_id, 'دهان برايمر وتجهيز الرقبة والزوايا', 'STG-01', 0.30, 90.00, v_unit_m2, 1),
        (v_company_id, v_item_id, 'فرد ولحام اللفائف بالأوفرلاب 10 سم', 'STG-02', 0.50, 50.00, v_unit_m2, 2),
        (v_company_id, v_item_id, 'اختبار الغمر بالمياه 48 ساعة والتسليم', 'STG-03', 0.20, 150.00, v_unit_m2, 3)
    ON CONFLICT DO NOTHING;

END $$;
