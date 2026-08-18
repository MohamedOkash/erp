-- ============================================================================
-- Migration: 0014_bootstrap.sql
-- Description: Production bootstrap migration ensuring core enterprise foundation
--              (Default Company 'شركتي للمقاولات', Super Admin user, and RBAC linkage).
--              Strictly zero operational demo/mock data.
-- ============================================================================

DO $$
DECLARE
    v_company_id UUID;
    v_admin_id UUID;
    v_role_id UUID;
BEGIN
    -- 1. Ensure Default Company exists
    SELECT id INTO v_company_id FROM companies WHERE code = 'CMP-001' OR name = 'شركتي للمقاولات' LIMIT 1;
    IF v_company_id IS NULL THEN
        v_company_id := 'c0000000-0000-0000-0000-000000000001'::uuid;
        IF NOT EXISTS (SELECT 1 FROM companies WHERE id = v_company_id) THEN
            INSERT INTO companies (id, name, code, is_active, created_at, updated_at)
            VALUES (v_company_id, 'شركتي للمقاولات', 'CMP-001', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        ELSE
            UPDATE companies SET name = 'شركتي للمقاولات', code = 'CMP-001' WHERE id = v_company_id;
        END IF;
    END IF;

    -- 2. Ensure Super Admin user exists with strong bcrypt password (Admin@2026!Secure)
    SELECT id INTO v_admin_id FROM users WHERE username = 'admin' LIMIT 1;
    IF v_admin_id IS NULL THEN
        v_admin_id := '00000000-0000-0000-0003-000000000001'::uuid;
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_admin_id) THEN
            INSERT INTO users (id, company_id, username, email, password_hash, full_name, is_active, created_at, updated_at)
            VALUES (
                v_admin_id,
                v_company_id,
                'admin',
                'admin@company.com',
                '$2b$10$.Y5UTIAwK/yJ9i/T5vLn2Oeg2jwocSCGx.tkmWM2WkE./K5alLO0u',
                'مدير النظام',
                true,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
        ELSE
            UPDATE users 
            SET username = 'admin',
                password_hash = '$2b$10$.Y5UTIAwK/yJ9i/T5vLn2Oeg2jwocSCGx.tkmWM2WkE./K5alLO0u',
                company_id = v_company_id,
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_admin_id;
        END IF;
    ELSE
        UPDATE users 
        SET password_hash = '$2b$10$.Y5UTIAwK/yJ9i/T5vLn2Oeg2jwocSCGx.tkmWM2WkE./K5alLO0u',
            company_id = v_company_id,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_admin_id;
    END IF;

    -- 3. Ensure Admin has 'company_admin' Role
    SELECT id INTO v_role_id FROM roles WHERE code = 'company_admin' LIMIT 1;
    IF v_role_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_admin_id AND role_id = v_role_id) THEN
            INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
            VALUES (v_admin_id, v_role_id, 'company', NULL);
        END IF;
    END IF;

END $$;
