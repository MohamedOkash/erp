-- Migration 0004: Multi-Country Support (Saudi Arabia Priority & Country Extensibility)

-- 1. Extend companies table with country, currency and default_language
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS country VARCHAR(2) NOT NULL DEFAULT 'SA',
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'SAR',
    ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) NOT NULL DEFAULT 'ar';

-- 2. Extend and generalize employees identity fields
ALTER TABLE employees RENAME COLUMN national_id TO identity_number;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS uq_employees_company_national_id;

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS identity_type VARCHAR(20) NOT NULL DEFAULT 'national_id' CHECK (identity_type IN ('national_id', 'iqama', 'passport')),
    ADD COLUMN IF NOT EXISTS identity_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);

ALTER TABLE employees
    ADD CONSTRAINT uq_employees_company_identity_number UNIQUE (company_id, identity_number);

-- 3. Indexes for fast identity lookup and expiry date monitoring
CREATE INDEX IF NOT EXISTS idx_employees_identity_number ON employees (company_id, identity_number);
CREATE INDEX IF NOT EXISTS idx_employees_identity_expiry ON employees (company_id, identity_expiry_date) WHERE is_active = true;
