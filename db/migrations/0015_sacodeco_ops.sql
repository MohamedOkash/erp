-- ============================================================
-- Migration: 0015_sacodeco_ops.sql
-- Description: Operational schema for crews, room BOQ, and cost distribution
-- ============================================================

-- 1.1 Update employees table with corporate and project employee IDs
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS company_employee_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS project_employee_id VARCHAR(50);

-- Backfill company_employee_id from code or identity_number if null
UPDATE employees 
SET company_employee_id = COALESCE(code, identity_number, SUBSTRING(id::text FROM 1 FOR 8)) 
WHERE company_employee_id IS NULL;

-- Add Unique constraint on (company_id, company_employee_id) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_employees_company_emp_id'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT uq_employees_company_emp_id UNIQUE (company_id, company_employee_id);
  END IF;
END $$;

-- 1.2 Create crews table
CREATE TABLE IF NOT EXISTS crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  crew_type VARCHAR(10) NOT NULL CHECK (crew_type IN ('A', 'B')),
  work_area_id UUID REFERENCES work_areas(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_crews_project_code UNIQUE (project_id, code)
);

CREATE INDEX IF NOT EXISTS idx_crews_company ON crews(company_id);
CREATE INDEX IF NOT EXISTS idx_crews_project ON crews(project_id);

-- 1.3 Create crew_members table
CREATE TABLE IF NOT EXISTS crew_members (
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('skilled_1', 'skilled_2', 'helper')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMPTZ NULL,
  PRIMARY KEY (crew_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_members_emp ON crew_members(employee_id);

-- 1.4 Update work_item_stages table
ALTER TABLE work_item_stages
  ADD COLUMN IF NOT EXISTS cost_distribution_mode VARCHAR(20) NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS material_price_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0.00;

-- 1.5 Create room_boq_items table
CREATE TABLE IF NOT EXISTS room_boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_area_id UUID NOT NULL REFERENCES work_areas(id) ON DELETE CASCADE,
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  work_item_stage_id UUID REFERENCES work_item_stages(id) ON DELETE SET NULL,
  total_quantity NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_boq_project ON room_boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_room_boq_area ON room_boq_items(work_area_id);
CREATE INDEX IF NOT EXISTS idx_room_boq_item ON room_boq_items(work_item_id);

-- 1.6 Update production_records table
ALTER TABLE production_records
  ADD COLUMN IF NOT EXISTS crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS foreman_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS engineer_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS engineer_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS engineer_notes TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_production_crew ON production_records(crew_id);
CREATE INDEX IF NOT EXISTS idx_production_foreman ON production_records(foreman_id);
CREATE INDEX IF NOT EXISTS idx_production_approval ON production_records(engineer_approved_at);

-- 1.7 Update attendance_policies table
ALTER TABLE attendance_policies
  ADD COLUMN IF NOT EXISTS work_hours_per_day NUMERIC NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS hourly_calculation_enabled BOOLEAN NOT NULL DEFAULT true;
