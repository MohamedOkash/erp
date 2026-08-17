-- ============================================================================
-- Migration: 0009_comprehensive_finishing_catalog.sql
-- Description: Comprehensive Finishing Catalog (15 Departments + Full Sub-Items + Stages + Prices)
-- ============================================================================

DO $$
DECLARE
    v_company RECORD;
    v_unit_m2 UUID;
    v_unit_m UUID;
    v_unit_pc UUID;
    v_unit_point UUID;

    -- Department IDs
    v_dept_plaster UUID;
    v_dept_paint UUID;
    v_dept_gypsum UUID;
    v_dept_ceramic UUID;
    v_dept_porcelain UUID;
    v_dept_marble UUID;
    v_dept_block UUID;
    v_dept_woodwork UUID;
    v_dept_aluminum UUID;
    v_dept_electrical UUID;
    v_dept_plumbing UUID;
    v_dept_hvac UUID;
    v_dept_waterproof UUID;
    v_dept_fairfaced UUID;
    v_dept_epoxy UUID;

    v_item_id UUID;
BEGIN
    FOR v_company IN SELECT id FROM companies LOOP
        -- 1. Ensure units exist
        SELECT id INTO v_unit_m2 FROM units WHERE company_id = v_company.id AND name = 'متر مربع' LIMIT 1;
        IF v_unit_m2 IS NULL THEN
            INSERT INTO units (company_id, name, symbol) VALUES (v_company.id, 'متر مربع', 'م2') RETURNING id INTO v_unit_m2;
        END IF;

        SELECT id INTO v_unit_m FROM units WHERE company_id = v_company.id AND name = 'متر طولي' LIMIT 1;
        IF v_unit_m IS NULL THEN
            INSERT INTO units (company_id, name, symbol) VALUES (v_company.id, 'متر طولي', 'م.ط') RETURNING id INTO v_unit_m;
        END IF;

        SELECT id INTO v_unit_pc FROM units WHERE company_id = v_company.id AND name = 'عدد' LIMIT 1;
        IF v_unit_pc IS NULL THEN
            INSERT INTO units (company_id, name, symbol) VALUES (v_company.id, 'عدد', 'عدد') RETURNING id INTO v_unit_pc;
        END IF;

        SELECT id INTO v_unit_point FROM units WHERE company_id = v_company.id AND name = 'نقطة / مخرج' LIMIT 1;
        IF v_unit_point IS NULL THEN
            INSERT INTO units (company_id, name, symbol) VALUES (v_company.id, 'نقطة / مخرج', 'نقطة') RETURNING id INTO v_unit_point;
        END IF;

        -- 2. Ensure 15 Main Departments in work_categories
        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال المحارة واللياسة', 'DEPT-PLASTER', 1)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_plaster;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال الدهانات والتشطيبات', 'DEPT-PAINT', 2)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_paint;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال الجبس والأسقف المعلقة', 'DEPT-GYPSUM', 3)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_gypsum;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال السيراميك والبورسلين', 'DEPT-CERAMIC', 4)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_ceramic;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال البورسلين الفاخر', 'DEPT-PORCELAIN', 5)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_porcelain;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال الرخام والجرانيت', 'DEPT-MARBLE', 6)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_marble;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال البلوك والمباني', 'DEPT-BLOCK', 7)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_block;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال النجارة والأبواب', 'DEPT-WOOD', 8)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_woodwork;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال الألومنيوم والواجهات', 'DEPT-ALUM', 9)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_aluminum;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال التأسيسات والتركيبات الكهربائية', 'DEPT-ELEC', 10)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_electrical;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال السباكة والصرف الصحي', 'DEPT-PLUMB', 11)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_plumbing;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال التكييف والتهوية', 'DEPT-HVAC', 12)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_hvac;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال العزل المائي والحراري', 'DEPT-INSUL', 13)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_waterproof;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال الخرسانة المكشوفة واللياسة المعمارية', 'DEPT-FAIR', 14)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_fairfaced;

        INSERT INTO work_categories (company_id, parent_id, level, name, code, sort_order)
        VALUES (v_company.id, NULL, 1, 'أعمال الإيبوكسي والأرضيات الصناعية', 'DEPT-EPOXY', 15)
        ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_dept_epoxy;

        -- =====================================================================
        -- 3. DEPARTMENT 1: PLASTERING (أعمال المحارة واللياسة) - Detailed Stages
        -- =====================================================================
        -- Item 1: Internal Plastering with Screeds & Accessories
        SELECT id INTO v_item_id FROM work_items WHERE company_id = v_company.id AND code = 'PLS-01' LIMIT 1;
        IF v_item_id IS NULL THEN
            v_item_id := gen_random_uuid();
            INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target, description)
            VALUES (v_item_id, v_company.id, v_unit_m2, v_dept_plaster, 'محارة داخلية بالبؤج والأوتار والإكسسوارات', 'PLS-01', 'أعمال المحارة واللياسة', 45.00, 35.00, 'أعمال لياسة حوائط وأسقف متكاملة بالبؤج والأوتار وشبك التمدد وزوايا الحماية المعدنية');
        ELSE
            UPDATE work_items SET category_id = v_dept_plaster, category = 'أعمال المحارة واللياسة', name = 'محارة داخلية بالبؤج والأوتار والإكسسوارات', default_unit_rate = 45.00, default_daily_target = 35.00 WHERE id = v_item_id;
        END IF;

        DELETE FROM work_item_stages WHERE work_item_id = v_item_id;
        INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
            (v_company.id, v_item_id, 'طرطشة مسمارية وتثبيت شبك فايبر/معدني (SPATTERDASH & MESH)', 'PLS-STG-01', 0.20, 80.00, v_unit_m2, 1),
            (v_company.id, v_item_id, 'زفرة وعمل البؤج والأوتار واسترباع الحوائط (DOTS & SCREEDS)', 'PLS-STG-02', 0.25, 50.00, v_unit_m2, 2),
            (v_company.id, v_item_id, 'تركيب زوايا معمارية وإكسسوارات الفواصل (BEADS & ACCESSORIES)', 'PLS-STG-03', 0.15, 70.00, v_unit_m2, 3),
            (v_company.id, v_item_id, 'ملء المحارة والمس والتخشين والإنهاء (RENDER COAT & FLOAT)', 'PLS-STG-04', 0.40, 40.00, v_unit_m2, 4);

        INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
        VALUES (v_company.id, v_item_id, 45.00, 18.00, 224.00, 208.00)
        ON CONFLICT DO NOTHING;

        -- Item 2: Exterior Facade Plastering
        SELECT id INTO v_item_id FROM work_items WHERE company_id = v_company.id AND code = 'PLS-02' LIMIT 1;
        IF v_item_id IS NULL THEN
            v_item_id := gen_random_uuid();
            INSERT INTO work_items (id, company_id, unit_id, category_id, name, code, category, default_unit_rate, default_daily_target, description)
            VALUES (v_item_id, v_company.id, v_unit_m2, v_dept_plaster, 'لياسة خارجية للواجهات بالقدة والميزان', 'PLS-02', 'أعمال المحارة واللياسة', 65.00, 25.00, 'لياسة واجهات وسقالات مقاومة للعوامل الجوية مع معالجة الشروخ والشبك المجلفن');
        ELSE
            UPDATE work_items SET category_id = v_dept_plaster, category = 'أعمال المحارة واللياسة' WHERE id = v_item_id;
        END IF;

        DELETE FROM work_item_stages WHERE work_item_id = v_item_id;
        INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order) VALUES
            (v_company.id, v_item_id, 'طرطشة مسمارية معالجة بالسيكا وشبك ممدد', 'PLS-STG-21', 0.20, 60.00, v_unit_m2, 1),
            (v_company.id, v_item_id, 'تأكيس وبؤج وأوتار خارجية وزوايا حماية', 'PLS-STG-22', 0.25, 40.00, v_unit_m2, 2),
            (v_company.id, v_item_id, 'بطانة لياسة أسمنتية مقاومة للأملاح', 'PLS-STG-23', 0.30, 35.00, v_unit_m2, 3),
            (v_company.id, v_item_id, 'ضهارة وتخشين نهائي لاستقبال الدهان', 'PLS-STG-24', 0.25, 40.00, v_unit_m2, 4);

        INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
        VALUES (v_company.id, v_item_id, 65.00, 25.00, 224.00, 208.00)
        ON CONFLICT DO NOTHING;

        -- =====================================================================
        -- 4. Sync all existing items with their proper categories
        -- =====================================================================
        UPDATE work_items SET category_id = v_dept_gypsum, category = 'أعمال الجبس والأسقف المعلقة' WHERE company_id = v_company.id AND code IN ('GYP-01', 'GYP-02', 'GYP-03');
        UPDATE work_items SET category_id = v_dept_block, category = 'أعمال البلوك والمباني' WHERE company_id = v_company.id AND code = 'BLK-01';
        UPDATE work_items SET category_id = v_dept_epoxy, category = 'أعمال الإيبوكسي والأرضيات الصناعية' WHERE company_id = v_company.id AND code = 'EPX-01';
        UPDATE work_items SET category_id = v_dept_paint, category = 'أعمال الدهانات والتشطيبات' WHERE company_id = v_company.id AND code = 'PNT-01';
        UPDATE work_items SET category_id = v_dept_ceramic, category = 'أعمال السيراميك والبورسلين' WHERE company_id = v_company.id AND code = 'CRM-01';
        UPDATE work_items SET category_id = v_dept_marble, category = 'أعمال الرخام والجرانيت' WHERE company_id = v_company.id AND code = 'MRB-01';
        UPDATE work_items SET category_id = v_dept_woodwork, category = 'أعمال النجارة والأبواب' WHERE company_id = v_company.id AND code = 'WOD-01';
        UPDATE work_items SET category_id = v_dept_waterproof, category = 'أعمال العزل المائي والحراري' WHERE company_id = v_company.id AND code = 'INS-01';

    END LOOP;
END $$;
