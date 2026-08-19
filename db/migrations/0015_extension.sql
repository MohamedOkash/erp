-- ============================================================
-- Migration: 0015_extension.sql
-- Description: Rooms with BOQ, crews templates, per-project IDs, hourly rates, and cascading KPIs schema
-- ============================================================

-- 1. Update employees table with profession and hourly_rate
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS profession VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);

-- Calculate default hourly_rate from daily_wage (daily_wage / 8) if daily_wage exists
UPDATE employees
SET hourly_rate = ROUND(daily_wage / 8.0, 2)
WHERE hourly_rate IS NULL AND daily_wage IS NOT NULL AND daily_wage > 0;

-- 2. Create employee_project_ids table for per-project custom employee codes
CREATE TABLE IF NOT EXISTS employee_project_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_employee_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_emp_proj_code UNIQUE (company_id, employee_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_emp_proj_employee ON employee_project_ids(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_proj_project ON employee_project_ids(project_id);

-- 3. Update work_areas table with area_m2 for room space size
ALTER TABLE work_areas
  ADD COLUMN IF NOT EXISTS area_m2 NUMERIC(10,2);

-- 4. Ensure room_boq_items table exists with full columns
CREATE TABLE IF NOT EXISTS room_boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_area_id UUID NOT NULL REFERENCES work_areas(id) ON DELETE CASCADE,
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  work_item_stage_id UUID REFERENCES work_item_stages(id) ON DELETE SET NULL,
  total_quantity NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  unit_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_room_boq_area_item UNIQUE (company_id, project_id, work_area_id, work_item_id)
);

CREATE INDEX IF NOT EXISTS idx_room_boq_project ON room_boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_room_boq_area ON room_boq_items(work_area_id);
CREATE INDEX IF NOT EXISTS idx_room_boq_item ON room_boq_items(work_item_id);

-- 5. Create crew_templates table
CREATE TABLE IF NOT EXISTS crew_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  skilled_count INT NOT NULL DEFAULT 1,
  unskilled_count INT NOT NULL DEFAULT 1,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_crew_tpl_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_crew_tpl_company ON crew_templates(company_id);

-- Seed default Crew A and Crew B templates for all existing companies
INSERT INTO crew_templates (company_id, name, code, skilled_count, unskilled_count, description)
SELECT 
  id AS company_id,
  'طاقم أ (Crew A - 2 صنايعي + 1 عامل)',
  'CREW_A',
  2,
  1,
  'طاقم مكون من عدد 2 معلمين وصنايعية بمهن مختلفة يخدمهما عامل مساعد واحد'
FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO crew_templates (company_id, name, code, skilled_count, unskilled_count, description)
SELECT 
  id AS company_id,
  'طاقم ب (Crew B - 1 صنايعي + 1 عامل)',
  'CREW_B',
  1,
  1,
  'طاقم مكون من معلم صنايعي واحد يخدمه عامل مساعد واحد'
FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

-- 6. Update crews table with template_id, foreman_id, crew_number
ALTER TABLE crews
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES crew_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS foreman_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crew_number VARCHAR(50);

-- 7. Update crew_members role check to support maallem, labor, skilled_1, skilled_2, helper
ALTER TABLE crew_members DROP CONSTRAINT IF EXISTS crew_members_role_check;
ALTER TABLE crew_members ADD CONSTRAINT crew_members_role_check 
  CHECK (role IN ('maallem', 'labor', 'skilled_1', 'skilled_2', 'helper'));

-- 8. Update production_records table with crew_type_id and crew_number
ALTER TABLE production_records
  ADD COLUMN IF NOT EXISTS crew_type_id UUID REFERENCES crew_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crew_number VARCHAR(50);

-- 9. Update production_workers table to support role_in_crew
ALTER TABLE production_workers
  ADD COLUMN IF NOT EXISTS role_in_crew VARCHAR(20) DEFAULT 'maallem';

