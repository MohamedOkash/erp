-- ============================================================================
-- Migration: 0013_correct_standards.sql
-- Description: Correct Standard Productivity Values, Stage Percentages, 
--              and Contract/Material Prices per original Excel/PDF Sheets:
--              1. GP CEILING (GYPSUM BOARD CEILING.pdf)
--              2. CEILING TUNNEL (CEILING TUNNEL.pdf)
--              3. BLOCK (BLOCK.SVB.DEC.pdf)
--              4. EPOXY.SCR (EBOXY.SCR.SOURCE.pdf)
--              5. GPC (GYPSUM BOARD WALLS.pdf)
-- ============================================================================

DO $$
DECLARE
    v_company RECORD;
    v_item_id UUID;
BEGIN
    FOR v_company IN SELECT id FROM companies LOOP

        -- =====================================================================
        -- 1. GP CEILING (GYP-01) - GYPSUM BOARD CEILING.pdf
        -- =====================================================================
        SELECT id INTO v_item_id FROM work_items WHERE company_id = v_company.id AND code = 'GYP-01' LIMIT 1;
        IF v_item_id IS NOT NULL THEN
            UPDATE work_items 
            SET default_daily_target = 20.00, 
                default_unit_rate = 235.00 
            WHERE id = v_item_id;

            -- Update stages: SYSTEM (0.70 / 20), FINISH (0.30 / 20)
            UPDATE work_item_stages
            SET percentage = 0.70, standard_productivity = 20.00
            WHERE work_item_id = v_item_id AND (code = 'STG-01' OR name ILIKE '%SYSTEM%');

            UPDATE work_item_stages
            SET percentage = 0.30, standard_productivity = 20.00
            WHERE work_item_id = v_item_id AND (code = 'STG-02' OR name ILIKE '%FINISH%');

            -- Update prices: Contract 235, Material 0
            IF EXISTS (SELECT 1 FROM work_item_prices WHERE work_item_id = v_item_id) THEN
                UPDATE work_item_prices 
                SET contract_price = 235.00, material_price = 0.00, labor_rate_skilled = 224.00, labor_rate_unskilled = 208.00 
                WHERE work_item_id = v_item_id;
            ELSE
                INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
                VALUES (v_company.id, v_item_id, 235.00, 0.00, 224.00, 208.00);
            END IF;
        END IF;

        -- =====================================================================
        -- 2. CEILING TUNNEL (GYP-03) - CEILING TUNNEL.pdf
        -- =====================================================================
        SELECT id INTO v_item_id FROM work_items WHERE company_id = v_company.id AND code = 'GYP-03' LIMIT 1;
        IF v_item_id IS NOT NULL THEN
            UPDATE work_items 
            SET default_daily_target = 2.00, 
                default_unit_rate = 3000.00 
            WHERE id = v_item_id;

            -- Update stages: SYSTEM (0.50 / 2), PANEL (0.50 / 2)
            UPDATE work_item_stages
            SET percentage = 0.50, standard_productivity = 2.00
            WHERE work_item_id = v_item_id AND (code = 'STG-01' OR name ILIKE '%SYSTEM%');

            UPDATE work_item_stages
            SET percentage = 0.50, standard_productivity = 2.00
            WHERE work_item_id = v_item_id AND (code = 'STG-02' OR name ILIKE '%PANEL%');

            -- Update prices: Contract 3000, Material 2100
            IF EXISTS (SELECT 1 FROM work_item_prices WHERE work_item_id = v_item_id) THEN
                UPDATE work_item_prices 
                SET contract_price = 3000.00, material_price = 2100.00, labor_rate_skilled = 224.00, labor_rate_unskilled = 208.00 
                WHERE work_item_id = v_item_id;
            ELSE
                INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
                VALUES (v_company.id, v_item_id, 3000.00, 2100.00, 224.00, 208.00);
            END IF;
        END IF;

        -- =====================================================================
        -- 3. BLOCK (BLK-01) - BLOCK.SVB.DEC.pdf
        -- =====================================================================
        SELECT id INTO v_item_id FROM work_items WHERE company_id = v_company.id AND code = 'BLK-01' LIMIT 1;
        IF v_item_id IS NOT NULL THEN
            UPDATE work_items 
            SET default_daily_target = 75.50, 
                default_unit_rate = 220.00 
            WHERE id = v_item_id;

            -- Update stages: FIRST CORSE (0.15 / 50), FULL HEIGHT (0.85 / 80)
            UPDATE work_item_stages
            SET percentage = 0.15, standard_productivity = 50.00
            WHERE work_item_id = v_item_id AND (code = 'STG-01' OR name ILIKE '%FIRST%');

            UPDATE work_item_stages
            SET percentage = 0.85, standard_productivity = 80.00
            WHERE work_item_id = v_item_id AND (code = 'STG-02' OR name ILIKE '%HEIGHT%');

            -- Update prices: Contract 220, Material 95
            IF EXISTS (SELECT 1 FROM work_item_prices WHERE work_item_id = v_item_id) THEN
                UPDATE work_item_prices 
                SET contract_price = 220.00, material_price = 95.00, labor_rate_skilled = 224.00, labor_rate_unskilled = 208.00 
                WHERE work_item_id = v_item_id;
            ELSE
                INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
                VALUES (v_company.id, v_item_id, 220.00, 95.00, 224.00, 208.00);
            END IF;
        END IF;

        -- =====================================================================
        -- 4. EPOXY.SCR (EPX-01) - EBOXY.SCR.SOURCE.pdf
        -- =====================================================================
        SELECT id INTO v_item_id FROM work_items WHERE company_id = v_company.id AND code = 'EPX-01' LIMIT 1;
        IF v_item_id IS NOT NULL THEN
            UPDATE work_items 
            SET default_daily_target = 33.00, 
                default_unit_rate = 295.00 
            WHERE id = v_item_id;

            -- 9 stages
            UPDATE work_item_stages SET percentage = 0.08, standard_productivity = 50.00 WHERE work_item_id = v_item_id AND (code = 'STG-01' OR name ILIKE '%SURFACE%');
            UPDATE work_item_stages SET percentage = 0.04, standard_productivity = 100.00 WHERE work_item_id = v_item_id AND (code = 'STG-02' OR name ILIKE '%BADGES%');
            UPDATE work_item_stages SET percentage = 0.21, standard_productivity = 20.00 WHERE work_item_id = v_item_id AND (code = 'STG-03' OR name ILIKE '%FILLING%');
            UPDATE work_item_stages SET percentage = 0.08, standard_productivity = 50.00 WHERE work_item_id = v_item_id AND (code = 'STG-04' OR name ILIKE '%SANDING 1%');
            UPDATE work_item_stages SET percentage = 0.08, standard_productivity = 50.00 WHERE work_item_id = v_item_id AND (code = 'STG-05' OR name ILIKE '%PUTTY 1%');
            UPDATE work_item_stages SET percentage = 0.08, standard_productivity = 50.00 WHERE work_item_id = v_item_id AND (code = 'STG-06' OR name ILIKE '%SANDING 2%');
            UPDATE work_item_stages SET percentage = 0.08, standard_productivity = 50.00 WHERE work_item_id = v_item_id AND (code = 'STG-07' OR name ILIKE '%PUTTY 2%');
            UPDATE work_item_stages SET percentage = 0.17, standard_productivity = 25.00 WHERE work_item_id = v_item_id AND (code = 'STG-08' OR name ILIKE '%F.EPOXY%' OR name ILIKE '%F.EBOXY%');
            UPDATE work_item_stages SET percentage = 0.18, standard_productivity = 25.00 WHERE work_item_id = v_item_id AND (code = 'STG-09' OR name ILIKE '%S.EPOXY%' OR name ILIKE '%S.EBOXY%');

            -- Update prices: Contract 295, Material 108
            IF EXISTS (SELECT 1 FROM work_item_prices WHERE work_item_id = v_item_id) THEN
                UPDATE work_item_prices 
                SET contract_price = 295.00, material_price = 108.00, labor_rate_skilled = 224.00, labor_rate_unskilled = 208.00 
                WHERE work_item_id = v_item_id;
            ELSE
                INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
                VALUES (v_company.id, v_item_id, 295.00, 108.00, 224.00, 208.00);
            END IF;
        END IF;

        -- =====================================================================
        -- 5. GPC (GYP-02) - GYPSUM BOARD WALLS.pdf
        -- =====================================================================
        SELECT id INTO v_item_id FROM work_items WHERE company_id = v_company.id AND code = 'GYP-02' LIMIT 1;
        IF v_item_id IS NOT NULL THEN
            UPDATE work_items 
            SET default_daily_target = 27.00, 
                default_unit_rate = 445.00 
            WHERE id = v_item_id;

            -- Update stages: SYSTEM (0.50 / 27), FINISH (0.50 / 27)
            UPDATE work_item_stages
            SET percentage = 0.50, standard_productivity = 27.00
            WHERE work_item_id = v_item_id AND (code = 'STG-01' OR name ILIKE '%SYSTEM%');

            UPDATE work_item_stages
            SET percentage = 0.50, standard_productivity = 27.00
            WHERE work_item_id = v_item_id AND (code = 'STG-02' OR name ILIKE '%FINISH%');

            -- Update prices: Contract 445, Material 150
            IF EXISTS (SELECT 1 FROM work_item_prices WHERE work_item_id = v_item_id) THEN
                UPDATE work_item_prices 
                SET contract_price = 445.00, material_price = 150.00, labor_rate_skilled = 224.00, labor_rate_unskilled = 208.00 
                WHERE work_item_id = v_item_id;
            ELSE
                INSERT INTO work_item_prices (company_id, work_item_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled)
                VALUES (v_company.id, v_item_id, 445.00, 150.00, 224.00, 208.00);
            END IF;
        END IF;

    END LOOP;
END $$;
