-- ============================================================================
-- Migration: 0005_sacodeco_restructure.sql
-- Description: Comprehensive Restructuring for SACODECO (Finishing Contractor)
-- 1. Roles & Permissions (program_manager, project_manager, engineer, supervisor, worker)
-- 2. Hierarchical BOQ Tables (work_categories, work_item_stages, work_item_prices, labor_rates)
-- 3. Staff Transfers System (staff_transfers)
-- 4. Stage-based production tracking & weighted progress view
-- ============================================================================

-- 1. Roles & Permissions
INSERT INTO roles (id, company_id, code, name, description, is_system) VALUES
    ('00000000-0000-0000-0001-000000000010', NULL, 'program_manager', 'مدير مشاريع (برامج)', 'إشراف كلي على المشاريع وإدارة التنقلات وتخصيص الموارد', true)
ON CONFLICT (id) DO NOTHING;

-- Extra Permissions Catalog
INSERT INTO permissions (code, module, action, description) VALUES
    ('staff_transfers.view', 'staff_transfers', 'view', 'استعراض طلبات النقل'),
    ('staff_transfers.request', 'staff_transfers', 'request', 'طلب نقل كادر أو مشرف'),
    ('staff_transfers.approve', 'staff_transfers', 'approve', 'الموافقة على طلب النقل'),
    ('staff_transfers.execute', 'staff_transfers', 'execute', 'تنفيذ النقل الفعلي في التعيينات'),
    ('resources.request', 'resources', 'request', 'طلب موارد من الإدارة العليا'),
    ('salaries.manage', 'salaries', 'manage', 'تحديد وتعديل رواتب وأجور العمالة')
ON CONFLICT (code) DO NOTHING;

-- Map permissions for roles in role_permissions
-- Clean existing mappings for standard demo roles to apply strict matrix
DELETE FROM role_permissions WHERE role_id IN (
    '00000000-0000-0000-0001-000000000002', -- company_admin
    '00000000-0000-0000-0001-000000000004', -- project_manager
    '00000000-0000-0000-0001-000000000005', -- engineer
    '00000000-0000-0000-0001-000000000006', -- supervisor
    '00000000-0000-0000-0001-000000000009', -- worker
    '00000000-0000-0000-0001-000000000010'  -- program_manager
);

-- Super admin & company_admin have all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0001-000000000002', id FROM permissions
ON CONFLICT DO NOTHING;

-- Program Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0001-000000000010', id FROM permissions
WHERE code IN (
    'auth.login', 'companies.view', 'branches.view', 'projects.view', 'projects.manage',
    'work_areas.view', 'work_areas.manage', 'units.view', 'work_items.view', 'work_items.manage',
    'employees.view', 'boq.view', 'boq.create', 'boq.update', 'boq.approve',
    'production.view', 'production.create', 'production.update', 'production.final_approve',
    'production.reject', 'production.correct', 'attendance.view', 'attendance.create', 'attendance.update',
    'productivity.view', 'productivity.manage_targets', 'costs.view', 'incentives.view',
    'documents.view', 'documents.upload', 'reports.view', 'reports.build',
    'staff_transfers.view', 'staff_transfers.request', 'staff_transfers.approve', 'staff_transfers.execute'
)
ON CONFLICT DO NOTHING;

-- Project Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0001-000000000004', id FROM permissions
WHERE code IN (
    'auth.login', 'branches.view', 'projects.view', 'work_areas.view', 'work_areas.manage',
    'units.view', 'work_items.view', 'employees.view', 'boq.view', 'boq.update',
    'production.view', 'production.create', 'production.update', 'production.engineer_approve',
    'production.final_approve', 'production.reject', 'production.correct',
    'attendance.view', 'attendance.create', 'attendance.update',
    'productivity.view', 'productivity.manage_targets', 'costs.view', 'incentives.view',
    'documents.view', 'documents.upload', 'reports.view',
    'staff_transfers.view', 'staff_transfers.request', 'staff_transfers.approve', 'resources.request'
)
ON CONFLICT DO NOTHING;

-- Engineer permissions (Cannot manage targets, cannot final approve, cannot manage salaries)
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0001-000000000005', id FROM permissions
WHERE code IN (
    'auth.login', 'branches.view', 'projects.view', 'work_areas.view', 'units.view', 'work_items.view',
    'employees.view', 'boq.view', 'production.view', 'production.create', 'production.update',
    'production.submit', 'production.engineer_approve', 'production.reject',
    'attendance.view', 'attendance.create', 'attendance.update',
    'productivity.view', 'documents.view', 'documents.upload', 'reports.view',
    'staff_transfers.view', 'staff_transfers.request', 'resources.request'
)
ON CONFLICT DO NOTHING;

-- Supervisor permissions (Can create/submit production, view attendance, NO approvals)
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0001-000000000006', id FROM permissions
WHERE code IN (
    'auth.login', 'projects.view', 'work_areas.view', 'work_items.view', 'employees.view',
    'production.view', 'production.create', 'production.submit',
    'attendance.view', 'attendance.create', 'documents.view'
)
ON CONFLICT DO NOTHING;

-- Worker permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0001-000000000009', id FROM permissions
WHERE code IN ('auth.login', 'production.view')
ON CONFLICT DO NOTHING;


-- 2. Hierarchical BOQ Tables (Categories, Stages, Prices, Labor Rates)

-- جدول الأقسام والفئات (department / category)
CREATE TABLE IF NOT EXISTS work_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    parent_id UUID REFERENCES work_categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1,  -- 1=Department, 2=Sub-Category
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_work_categories UNIQUE (company_id, code)
);

-- ربط work_items بـ category
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES work_categories(id);

-- جدول مراحل البند
CREATE TABLE IF NOT EXISTS work_item_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 1),
    standard_productivity NUMERIC(12,2) DEFAULT 0,
    unit_id UUID REFERENCES units(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_work_item_stages UNIQUE (company_id, work_item_id, code)
);

-- جدول الأسعار للبند
CREATE TABLE IF NOT EXISTS work_item_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    contract_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    material_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    labor_rate_skilled NUMERIC(12,2) DEFAULT 224,
    labor_rate_unskilled NUMERIC(12,2) DEFAULT 208,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_work_item_prices UNIQUE (company_id, work_item_id, branch_id, effective_from)
);

-- جدول أسعار العمالة على مستوى الشركة
CREATE TABLE IF NOT EXISTS labor_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    rate_type VARCHAR(50) NOT NULL,  -- 'skilled', 'unskilled'
    hourly_rate NUMERIC(12,2) NOT NULL,
    daily_rate NUMERIC(12,2) NOT NULL,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_labor_rates UNIQUE (company_id, rate_type, effective_from)
);


-- 3. Staff Transfers System

CREATE TABLE IF NOT EXISTS staff_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    from_project_id UUID REFERENCES projects(id),
    from_area_id UUID REFERENCES work_areas(id),
    to_project_id UUID NOT NULL REFERENCES projects(id),
    to_area_id UUID REFERENCES work_areas(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_role VARCHAR(50) NOT NULL,  -- 'engineer', 'project_manager', 'program_manager'
    reason TEXT,
    urgency VARCHAR(20) DEFAULT 'normal',  -- 'normal', 'urgent'
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'executed'
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    transfer_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- 4. Stage-based production tracking & weighted progress view

-- إضافة stage_id لـ production_records
ALTER TABLE production_records ADD COLUMN IF NOT EXISTS work_item_stage_id UUID REFERENCES work_item_stages(id);

-- إضافة حقل overtime و bonus و skill_level
ALTER TABLE production_workers ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5,2) DEFAULT 0;
ALTER TABLE production_workers ADD COLUMN IF NOT EXISTS bonus_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE production_workers ADD COLUMN IF NOT EXISTS skill_level VARCHAR(20);  -- 'skilled', 'unskilled'

-- Update Unique index on production_records to include stage_id
DROP INDEX IF EXISTS uq_production_no_duplicate;
CREATE UNIQUE INDEX uq_production_no_duplicate 
ON production_records (
    company_id,
    date,
    project_id,
    branch_id,
    work_item_id,
    COALESCE(work_item_stage_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(work_area_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(team_code, ''),
    supervisor_id
) 
WHERE status NOT IN ('rejected', 'cancelled');

-- View: v_boq_progress_weighted
CREATE OR REPLACE VIEW v_boq_progress_weighted AS
SELECT
    pr.company_id,
    pr.project_id,
    pr.work_item_id,
    pr.work_item_stage_id,
    w.name AS work_item_name,
    wis.name AS stage_name,
    wis.percentage AS stage_percentage,
    SUM(pr.actual_quantity) AS stage_done,
    SUM(pr.actual_quantity * COALESCE(wis.percentage, 1.0)) AS weighted_done,
    bi.total_quantity AS boq_quantity,
    CASE 
        WHEN bi.total_quantity > 0 
        THEN (SUM(pr.actual_quantity * COALESCE(wis.percentage, 1.0)) / bi.total_quantity) * 100 
        ELSE 0 
    END AS progress_percentage
FROM production_records pr
LEFT JOIN work_item_stages wis ON pr.work_item_stage_id = wis.id
JOIN work_items w ON pr.work_item_id = w.id
LEFT JOIN boq_items bi ON bi.work_item_id = pr.work_item_id AND bi.company_id = pr.company_id
WHERE pr.status = 'final_approved'
GROUP BY pr.company_id, pr.project_id, pr.work_item_id, pr.work_item_stage_id, 
         w.name, wis.name, wis.percentage, bi.total_quantity;

-- RLS Enablement on new tables
ALTER TABLE work_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_work_categories ON work_categories
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_isolation_work_item_stages ON work_item_stages
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_isolation_work_item_prices ON work_item_prices
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_isolation_labor_rates ON labor_rates
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

CREATE POLICY tenant_isolation_staff_transfers ON staff_transfers
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

-- Seed Project Manager & Program Manager users for demo
INSERT INTO users (id, company_id, employee_id, username, email, password_hash, full_name, is_active) VALUES
    ('00000000-0000-0000-0003-000000000004', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'pm_user', 'pm@sacodeco.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5LhQvW/7b7oP5s4iJzU9cM5K8v7qW', 'مدير المشروع - SACODECO', true),
    ('00000000-0000-0000-0003-000000000005', 'c0000000-0000-0000-0000-000000000001', NULL, 'pgm_user', 'pgm@sacodeco.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5LhQvW/7b7oP5s4iJzU9cM5K8v7qW', 'مدير المشاريع العام - SACODECO', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, scope_type, scope_id) VALUES
    ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0001-000000000004', 'project', 'f0000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0001-000000000010', 'company', NULL)
ON CONFLICT DO NOTHING;

-- Update Production State Machine Trigger for Phase 1 (Direct submitted -> engineer_approved)
CREATE OR REPLACE FUNCTION trg_fn_production_records_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Check if old record was final_approved (Locked)
    IF OLD.status = 'final_approved' THEN
        RAISE EXCEPTION 'Production record % is locked (final_approved) and cannot be modified directly. Use production_corrections.', OLD.id;
    END IF;

    -- 2. State transition validation
    IF NEW.status <> OLD.status THEN
        IF OLD.status = 'draft' AND NEW.status NOT IN ('submitted', 'cancelled') THEN
            RAISE EXCEPTION 'Invalid status transition from draft to %', NEW.status;
        ELSIF OLD.status = 'submitted' AND NEW.status NOT IN ('engineer_approved', 'supervisor_approved', 'rejected', 'draft') THEN
            RAISE EXCEPTION 'Invalid status transition from submitted to %', NEW.status;
        ELSIF OLD.status = 'supervisor_approved' AND NEW.status NOT IN ('engineer_approved', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition from supervisor_approved to %', NEW.status;
        ELSIF OLD.status = 'engineer_approved' AND NEW.status NOT IN ('final_approved', 'rejected') THEN
            RAISE EXCEPTION 'Invalid status transition from engineer_approved to %', NEW.status;
        ELSIF OLD.status = 'rejected' AND NEW.status NOT IN ('draft', 'submitted') THEN
            RAISE EXCEPTION 'Invalid status transition from rejected to %', NEW.status;
        ELSIF OLD.status = 'cancelled' THEN
            RAISE EXCEPTION 'Cancelled production records cannot be modified';
        END IF;

        -- Mandatory rejection reason
        IF NEW.status = 'rejected' AND (NEW.rejection_reason IS NULL OR TRIM(NEW.rejection_reason) = '') THEN
            RAISE EXCEPTION 'Rejection reason is mandatory when rejecting a production record';
        END IF;

        -- Record timestamps
        IF NEW.status = 'submitted' AND OLD.status <> 'submitted' THEN
            NEW.submitted_at = CURRENT_TIMESTAMP;
        ELSIF NEW.status = 'supervisor_approved' AND OLD.status <> 'supervisor_approved' THEN
            NEW.supervisor_approved_at = CURRENT_TIMESTAMP;
        ELSIF NEW.status = 'engineer_approved' AND OLD.status <> 'engineer_approved' THEN
            NEW.engineer_approved_at = CURRENT_TIMESTAMP;
        ELSIF NEW.status = 'final_approved' AND OLD.status <> 'final_approved' THEN
            NEW.final_approved_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Default Labor Rates Seed
INSERT INTO labor_rates (company_id, rate_type, hourly_rate, daily_rate) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'skilled', 28.00, 224.00),
    ('c0000000-0000-0000-0000-000000000001', 'unskilled', 26.00, 208.00)
ON CONFLICT DO NOTHING;
