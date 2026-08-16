-- Migration 0008: Biometric Attendance and Attendance Policies

-- 1. Add device_code to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS device_code VARCHAR(50);

-- Unique index per company when device_code is present
CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_company_device_code
ON employees (company_id, device_code)
WHERE device_code IS NOT NULL;

-- 2. Add source to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';

-- 3. Create attendance_policies table
CREATE TABLE IF NOT EXISTS attendance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES projects(id) ON DELETE CASCADE,
  shift_start_time TIME NOT NULL DEFAULT '08:00',
  shift_end_time TIME NOT NULL DEFAULT '17:00',
  grace_minutes INTEGER NOT NULL DEFAULT 15,
  break_minutes INTEGER NOT NULL DEFAULT 60,
  overtime_threshold_hours NUMERIC(5,2) NOT NULL DEFAULT 8.00,
  overtime_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.50,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on company_id and project_id and effective_from
CREATE INDEX IF NOT EXISTS idx_attendance_policies_lookup
ON attendance_policies (company_id, project_id, effective_from, is_active);

-- 4. Seed default company attendance policy for existing companies
INSERT INTO attendance_policies (
  company_id, project_id, shift_start_time, shift_end_time,
  grace_minutes, break_minutes, overtime_threshold_hours,
  overtime_multiplier, effective_from, is_active
)
SELECT id, NULL, '08:00', '17:00', 15, 60, 8.00, 1.50, '2020-01-01', true
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM attendance_policies ap WHERE ap.company_id = companies.id AND ap.project_id IS NULL
);
