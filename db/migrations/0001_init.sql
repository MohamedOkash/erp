-- ============================================================================
-- Migration: 0001_init.sql
-- Description: Unified Database Schema for Construction ERP (Section 5 HANDOFF.md)
-- ============================================================================

-- gen_random_uuid() is built-in in PostgreSQL 13+

-- ============================================================================
-- 1. Helper Trigger Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Core Tables
-- ============================================================================

-- Table 1: companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    tax_number VARCHAR(100),
    commercial_registration VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_companies_id UNIQUE (id)
);

-- Table 2: branches
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    location TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branches_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_branches_company_code UNIQUE (company_id, code)
);

-- Table 3: projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    client_name VARCHAR(255),
    location TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_projects_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_projects_company_code UNIQUE (company_id, code),
    CONSTRAINT fk_projects_branch FOREIGN KEY (company_id, branch_id) REFERENCES branches(company_id, id) ON DELETE RESTRICT
);

-- Table 4: work_areas (Dynamic hierarchical tree)
CREATE TABLE work_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    project_id UUID NOT NULL,
    parent_id UUID,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    path TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_work_areas_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_work_areas_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_work_areas_parent FOREIGN KEY (company_id, parent_id) REFERENCES work_areas(company_id, id) ON DELETE CASCADE
);

-- Table 5: units
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_units_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_units_company_name UNIQUE (company_id, name)
);

-- Table 6: work_items
CREATE TABLE work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    category VARCHAR(100),
    description TEXT,
    default_unit_rate NUMERIC(15,2) DEFAULT 0 CHECK (default_unit_rate >= 0),
    default_daily_target NUMERIC(15,2) DEFAULT 0 CHECK (default_daily_target >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_work_items_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_work_items_company_code UNIQUE (company_id, code),
    CONSTRAINT fk_work_items_unit FOREIGN KEY (company_id, unit_id) REFERENCES units(company_id, id) ON DELETE RESTRICT
);

-- Table 7: branch_work_items
CREATE TABLE branch_work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    work_item_id UUID NOT NULL,
    custom_unit_rate NUMERIC(15,2) CHECK (custom_unit_rate >= 0),
    custom_daily_target NUMERIC(15,2) CHECK (custom_daily_target >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_work_items_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_branch_work_items_unique UNIQUE (company_id, branch_id, work_item_id),
    CONSTRAINT fk_branch_work_items_branch FOREIGN KEY (company_id, branch_id) REFERENCES branches(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_branch_work_items_item FOREIGN KEY (company_id, work_item_id) REFERENCES work_items(company_id, id) ON DELETE CASCADE
);

-- Table 8: employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    national_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    phone VARCHAR(50),
    role_type VARCHAR(50) NOT NULL,
    primary_branch_id UUID,
    daily_wage NUMERIC(12,2) DEFAULT 0 CHECK (daily_wage >= 0),
    hire_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employees_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_employees_company_national_id UNIQUE (company_id, national_id),
    CONSTRAINT fk_employees_primary_branch FOREIGN KEY (company_id, primary_branch_id) REFERENCES branches(company_id, id) ON DELETE SET NULL
);

-- Table 9: employee_assignments
CREATE TABLE employee_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    project_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    assigned_role VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_assignments_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_employee_assignments_emp FOREIGN KEY (company_id, employee_id) REFERENCES employees(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_employee_assignments_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_employee_assignments_branch FOREIGN KEY (company_id, branch_id) REFERENCES branches(company_id, id) ON DELETE RESTRICT
);

-- Table 10: employee_history
CREATE TABLE employee_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    effective_date DATE NOT NULL,
    reason TEXT,
    changed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_history_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_employee_history_emp FOREIGN KEY (company_id, employee_id) REFERENCES employees(company_id, id) ON DELETE CASCADE
);

-- Table 11: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_users_employee FOREIGN KEY (company_id, employee_id) REFERENCES employees(company_id, id) ON DELETE SET NULL
);

-- Table 12: sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 13: roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_roles_id UNIQUE (id),
    CONSTRAINT uq_roles_company_code UNIQUE (company_id, code)
);

-- Table 14: permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_permissions_id UNIQUE (id)
);

-- Table 15: role_permissions
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_permissions_unique UNIQUE (role_id, permission_id)
);

-- Table 16: user_roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope_type VARCHAR(50) NOT NULL DEFAULT 'company' CHECK (scope_type IN ('company', 'branch', 'project')),
    scope_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_roles_unique UNIQUE (user_id, role_id, scope_type, scope_id)
);

-- Table 17: productivity_targets
CREATE TABLE productivity_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    branch_id UUID,
    project_id UUID,
    work_item_id UUID NOT NULL,
    target_daily_quantity NUMERIC(15,2) NOT NULL CHECK (target_daily_quantity > 0),
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_productivity_targets_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_productivity_targets_branch FOREIGN KEY (company_id, branch_id) REFERENCES branches(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_productivity_targets_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_productivity_targets_item FOREIGN KEY (company_id, work_item_id) REFERENCES work_items(company_id, id) ON DELETE CASCADE
);

-- Table 18: boq
CREATE TABLE boq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'revised', 'archived')),
    total_estimated_cost NUMERIC(18,2) DEFAULT 0 CHECK (total_estimated_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_boq_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_boq_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE CASCADE
);

-- Table 19: boq_items
CREATE TABLE boq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    boq_id UUID NOT NULL,
    work_item_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    item_code VARCHAR(50),
    description TEXT,
    total_quantity NUMERIC(15,2) NOT NULL CHECK (total_quantity >= 0),
    unit_rate NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (unit_rate >= 0),
    total_amount NUMERIC(18,2) GENERATED ALWAYS AS (total_quantity * unit_rate) STORED,
    has_area_split BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_boq_items_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_boq_items_boq FOREIGN KEY (company_id, boq_id) REFERENCES boq(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_boq_items_item FOREIGN KEY (company_id, work_item_id) REFERENCES work_items(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_boq_items_unit FOREIGN KEY (company_id, unit_id) REFERENCES units(company_id, id) ON DELETE RESTRICT
);

-- Table 20: boq_item_areas
CREATE TABLE boq_item_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    boq_item_id UUID NOT NULL,
    work_area_id UUID NOT NULL,
    quantity NUMERIC(15,2) NOT NULL CHECK (quantity >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_boq_item_areas_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_boq_item_areas_unique UNIQUE (company_id, boq_item_id, work_area_id),
    CONSTRAINT fk_boq_item_areas_item FOREIGN KEY (company_id, boq_item_id) REFERENCES boq_items(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_boq_item_areas_area FOREIGN KEY (company_id, work_area_id) REFERENCES work_areas(company_id, id) ON DELETE RESTRICT
);

-- Table 21: boq_revisions
CREATE TABLE boq_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    boq_id UUID NOT NULL,
    revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
    revision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_boq_revisions_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_boq_revisions_number UNIQUE (company_id, boq_id, revision_number),
    CONSTRAINT fk_boq_revisions_boq FOREIGN KEY (company_id, boq_id) REFERENCES boq(company_id, id) ON DELETE CASCADE
);

-- Table 22: production_records
CREATE TABLE production_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    project_id UUID NOT NULL,
    work_item_id UUID NOT NULL,
    work_area_id UUID,
    date DATE NOT NULL,
    production_type VARCHAR(20) NOT NULL CHECK (production_type IN ('individual', 'team', 'mixed')),
    actual_quantity NUMERIC(15,2) NOT NULL CHECK (actual_quantity >= 0),
    target_quantity NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (target_quantity >= 0),
    team_code VARCHAR(50),
    supervisor_id UUID NOT NULL,
    engineer_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'supervisor_approved', 'engineer_approved', 'final_approved', 'rejected', 'cancelled')),
    rejection_reason TEXT,
    notes TEXT,
    submitted_at TIMESTAMPTZ,
    supervisor_approved_at TIMESTAMPTZ,
    engineer_approved_at TIMESTAMPTZ,
    final_approved_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_production_records_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_production_records_branch FOREIGN KEY (company_id, branch_id) REFERENCES branches(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_production_records_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_production_records_item FOREIGN KEY (company_id, work_item_id) REFERENCES work_items(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_production_records_area FOREIGN KEY (company_id, work_area_id) REFERENCES work_areas(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_production_records_supervisor FOREIGN KEY (company_id, supervisor_id) REFERENCES employees(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_production_records_engineer FOREIGN KEY (company_id, engineer_id) REFERENCES employees(company_id, id) ON DELETE SET NULL
);

-- Table 23: production_workers
CREATE TABLE production_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    production_record_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    worker_type VARCHAR(20) NOT NULL CHECK (worker_type IN ('individual', 'team')),
    individual_quantity NUMERIC(15,2) DEFAULT 0 CHECK (individual_quantity >= 0),
    hours_worked NUMERIC(5,2) DEFAULT 8 CHECK (hours_worked >= 0),
    is_estimated BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_production_workers_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_production_workers_unique UNIQUE (company_id, production_record_id, employee_id),
    CONSTRAINT fk_production_workers_record FOREIGN KEY (company_id, production_record_id) REFERENCES production_records(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_production_workers_emp FOREIGN KEY (company_id, employee_id) REFERENCES employees(company_id, id) ON DELETE RESTRICT
);

-- Table 24: production_attachments
CREATE TABLE production_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    production_record_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_production_attachments_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_production_attachments_record FOREIGN KEY (company_id, production_record_id) REFERENCES production_records(company_id, id) ON DELETE CASCADE
);

-- Table 25: production_corrections
CREATE TABLE production_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    production_record_id UUID NOT NULL,
    correction_type VARCHAR(30) NOT NULL CHECK (correction_type IN ('quantity_adjust', 'annul', 'note')),
    adjustment_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_production_corrections_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_production_corrections_record FOREIGN KEY (company_id, production_record_id) REFERENCES production_records(company_id, id) ON DELETE RESTRICT
);

-- Table 26: attendance_statuses
CREATE TABLE attendance_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT false,
    deduction_ratio NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (deduction_ratio >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_statuses_id UNIQUE (id),
    CONSTRAINT uq_attendance_statuses_company_code UNIQUE (company_id, code)
);

-- Table 27: attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    project_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    date DATE NOT NULL,
    status_id UUID NOT NULL REFERENCES attendance_statuses(id) ON DELETE RESTRICT,
    check_in_time TIME,
    check_out_time TIME,
    overtime_hours NUMERIC(5,2) DEFAULT 0 CHECK (overtime_hours >= 0),
    recorded_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_attendance_unique_day UNIQUE (company_id, employee_id, date),
    CONSTRAINT fk_attendance_emp FOREIGN KEY (company_id, employee_id) REFERENCES employees(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_attendance_branch FOREIGN KEY (company_id, branch_id) REFERENCES branches(company_id, id) ON DELETE RESTRICT
);

-- Table 28: approval_workflows
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_approval_workflows_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_approval_workflows_name UNIQUE (company_id, module, name)
);

-- Table 29: approval_steps
CREATE TABLE approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    step_order INTEGER NOT NULL CHECK (step_order >= 1),
    step_name VARCHAR(100) NOT NULL,
    required_role_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_approval_steps_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_approval_steps_order UNIQUE (company_id, workflow_id, step_order),
    CONSTRAINT fk_approval_steps_workflow FOREIGN KEY (company_id, workflow_id) REFERENCES approval_workflows(company_id, id) ON DELETE CASCADE
);

-- Table 30: approval_actions
CREATE TABLE approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    step_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN ('approved', 'rejected', 'returned')),
    comment TEXT,
    action_by UUID NOT NULL,
    action_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_approval_actions_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_approval_actions_workflow FOREIGN KEY (company_id, workflow_id) REFERENCES approval_workflows(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_actions_step FOREIGN KEY (company_id, step_id) REFERENCES approval_steps(company_id, id) ON DELETE CASCADE
);

-- Table 31: cost_entries
CREATE TABLE cost_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    project_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    recorded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cost_entries_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_cost_entries_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_cost_entries_branch FOREIGN KEY (company_id, branch_id) REFERENCES branches(company_id, id) ON DELETE RESTRICT
);

-- Table 32: incentive_rules
CREATE TABLE incentive_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    threshold_percentage NUMERIC(5,2) NOT NULL,
    reward_amount NUMERIC(12,2) NOT NULL CHECK (reward_amount >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_incentive_rules_company_id_id UNIQUE (company_id, id)
);

-- Table 33: incentive_ledger
CREATE TABLE incentive_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    rule_id UUID,
    employee_id UUID NOT NULL,
    project_id UUID,
    date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_incentive_ledger_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_incentive_ledger_rule FOREIGN KEY (company_id, rule_id) REFERENCES incentive_rules(company_id, id) ON DELETE SET NULL,
    CONSTRAINT fk_incentive_ledger_emp FOREIGN KEY (company_id, employee_id) REFERENCES employees(company_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_incentive_ledger_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE SET NULL
);

-- Table 34: document_categories
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_categories_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_document_categories_name UNIQUE (company_id, name)
);

-- Table 35: documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    category_id UUID NOT NULL,
    project_id UUID,
    title VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_documents_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_documents_category FOREIGN KEY (company_id, category_id) REFERENCES document_categories(company_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_documents_project FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id) ON DELETE SET NULL
);

-- Table 36: document_versions
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    document_id UUID NOT NULL,
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
    notes TEXT,
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_versions_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_document_versions_version UNIQUE (company_id, document_id, version_number),
    CONSTRAINT fk_document_versions_doc FOREIGN KEY (company_id, document_id) REFERENCES documents(company_id, id) ON DELETE CASCADE
);

-- Table 37: import_jobs
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('production', 'boq', 'attendance', 'employees')),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsed', 'staged', 'validated', 'previewed', 'committed', 'failed')),
    total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
    error_rows INTEGER NOT NULL DEFAULT 0 CHECK (error_rows >= 0),
    created_by UUID,
    committed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_import_jobs_company_id_id UNIQUE (company_id, id)
);

-- Table 38: import_staging_rows
CREATE TABLE import_staging_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    import_job_id UUID NOT NULL,
    row_index INTEGER NOT NULL CHECK (row_index >= 1),
    raw_data JSONB NOT NULL,
    parsed_data JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'error', 'committed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_import_staging_rows_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_import_staging_rows_job FOREIGN KEY (company_id, import_job_id) REFERENCES import_jobs(company_id, id) ON DELETE CASCADE
);

-- Table 39: import_row_errors
CREATE TABLE import_row_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    staging_row_id UUID NOT NULL,
    column_name VARCHAR(100),
    error_code VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_import_row_errors_company_id_id UNIQUE (company_id, id),
    CONSTRAINT fk_import_row_errors_row FOREIGN KEY (company_id, staging_row_id) REFERENCES import_staging_rows(company_id, id) ON DELETE CASCADE
);

-- Table 40: export_jobs
CREATE TABLE export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    export_type VARCHAR(50) NOT NULL,
    filter_params JSONB,
    format VARCHAR(20) NOT NULL DEFAULT 'xlsx' CHECK (format IN ('xlsx', 'pdf', 'csv')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
    error_message TEXT,
    requested_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_export_jobs_company_id_id UNIQUE (company_id, id)
);

-- Table 41: notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notifications_company_id_id UNIQUE (company_id, id)
);

-- Table 42: notification_preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notification_preferences_company_id_id UNIQUE (company_id, id),
    CONSTRAINT uq_notification_preferences_unique UNIQUE (company_id, user_id, notification_type)
);

-- Table 43: alert_rules
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    condition_config JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_alert_rules_company_id_id UNIQUE (company_id, id)
);

-- Table 44: audit_logs (Append-only)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_audit_logs_id UNIQUE (id)
);

-- Table 45: saved_reports
CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    query_config JSONB NOT NULL,
    created_by UUID,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_saved_reports_company_id_id UNIQUE (company_id, id)
);

-- ============================================================================
-- 3. Maintenance Triggers & Constraints
-- ============================================================================

-- A) Updated_at triggers for all applicable tables
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_work_areas_updated_at BEFORE UPDATE ON work_areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_work_items_updated_at BEFORE UPDATE ON work_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_branch_work_items_updated_at BEFORE UPDATE ON branch_work_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employee_assignments_updated_at BEFORE UPDATE ON employee_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_productivity_targets_updated_at BEFORE UPDATE ON productivity_targets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_boq_updated_at BEFORE UPDATE ON boq FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_boq_items_updated_at BEFORE UPDATE ON boq_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_boq_item_areas_updated_at BEFORE UPDATE ON boq_item_areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_production_records_updated_at BEFORE UPDATE ON production_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_production_workers_updated_at BEFORE UPDATE ON production_workers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_production_corrections_updated_at BEFORE UPDATE ON production_corrections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_attendance_statuses_updated_at BEFORE UPDATE ON attendance_statuses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_approval_steps_updated_at BEFORE UPDATE ON approval_steps FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cost_entries_updated_at BEFORE UPDATE ON cost_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_incentive_rules_updated_at BEFORE UPDATE ON incentive_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_incentive_ledger_updated_at BEFORE UPDATE ON incentive_ledger FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_document_categories_updated_at BEFORE UPDATE ON document_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_import_jobs_updated_at BEFORE UPDATE ON import_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_export_jobs_updated_at BEFORE UPDATE ON export_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_saved_reports_updated_at BEFORE UPDATE ON saved_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- B) has_area_split maintenance trigger (Section 5)
CREATE OR REPLACE FUNCTION maintain_boq_item_has_area_split()
RETURNS TRIGGER AS $$
DECLARE
    target_boq_item_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_boq_item_id := OLD.boq_item_id;
    ELSE
        target_boq_item_id := NEW.boq_item_id;
    END IF;

    UPDATE boq_items
    SET has_area_split = EXISTS (
        SELECT 1 FROM boq_item_areas WHERE boq_item_id = target_boq_item_id
    )
    WHERE id = target_boq_item_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintain_has_area_split
AFTER INSERT OR UPDATE OR DELETE ON boq_item_areas
FOR EACH ROW EXECUTE FUNCTION maintain_boq_item_has_area_split();

-- Valid partial index on boq_items using column has_area_split (replacing invalid NOT EXISTS predicate)
CREATE INDEX idx_boq_items_no_area_split ON boq_items (company_id, boq_id) WHERE has_area_split = false;

-- C) Area Split Total Verification Constraint Trigger (Section 5)
CREATE OR REPLACE FUNCTION check_boq_area_split_sum()
RETURNS TRIGGER AS $$
DECLARE
    target_boq_item_id UUID;
    v_total_qty NUMERIC(15,2);
    v_areas_sum NUMERIC(15,2);
    v_has_split BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_boq_item_id := OLD.boq_item_id;
    ELSE
        target_boq_item_id := NEW.boq_item_id;
    END IF;

    SELECT total_quantity, has_area_split
    INTO v_total_qty, v_has_split
    FROM boq_items
    WHERE id = target_boq_item_id;

    IF v_has_split IS TRUE THEN
        SELECT COALESCE(SUM(quantity), 0)
        INTO v_areas_sum
        FROM boq_item_areas
        WHERE boq_item_id = target_boq_item_id;

        IF ABS(v_areas_sum - v_total_qty) > 0.001 THEN
            RAISE EXCEPTION 'BOQ item % area breakdown sum (%) does not equal total quantity (%)',
                target_boq_item_id, v_areas_sum, v_total_qty;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_check_boq_area_split_sum
AFTER INSERT OR UPDATE OR DELETE ON boq_item_areas
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_boq_area_split_sum();

-- D) Production State Machine & Lock Trigger (Section 5)
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
        ELSIF OLD.status = 'submitted' AND NEW.status NOT IN ('supervisor_approved', 'rejected', 'draft') THEN
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

CREATE TRIGGER trg_production_records_state_machine
BEFORE UPDATE ON production_records
FOR EACH ROW EXECUTE FUNCTION trg_fn_production_records_state_machine();

-- E) Individual Production Worker Quantity Verification Trigger (Section 3)
CREATE OR REPLACE FUNCTION check_individual_production_worker_sum()
RETURNS TRIGGER AS $$
DECLARE
    target_record_id UUID;
    v_prod_type VARCHAR(20);
    v_actual_qty NUMERIC(15,2);
    v_workers_sum NUMERIC(15,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_record_id := OLD.production_record_id;
    ELSE
        target_record_id := NEW.production_record_id;
    END IF;

    SELECT production_type, actual_quantity
    INTO v_prod_type, v_actual_qty
    FROM production_records
    WHERE id = target_record_id;

    IF v_prod_type = 'individual' THEN
        SELECT COALESCE(SUM(individual_quantity), 0)
        INTO v_workers_sum
        FROM production_workers
        WHERE production_record_id = target_record_id;

        IF ABS(v_workers_sum - v_actual_qty) > 0.001 THEN
            RAISE EXCEPTION 'Individual production record % worker quantities sum (%) must equal actual quantity (%)',
                target_record_id, v_workers_sum, v_actual_qty;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_check_individual_production_worker_sum
AFTER INSERT OR UPDATE OR DELETE ON production_workers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_individual_production_worker_sum();

-- F) Audit Logs Immunity Trigger (Section 5)
CREATE OR REPLACE FUNCTION trg_fn_audit_logs_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only and immutable. UPDATE, DELETE, and TRUNCATE are prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION trg_fn_audit_logs_immutable();

REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;

-- G) Partial Unique Index: Prevent duplicate production records (Section 5)
CREATE UNIQUE INDEX uq_production_no_duplicate 
ON production_records (
    company_id,
    date,
    project_id,
    branch_id,
    work_item_id,
    COALESCE(work_area_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(team_code, ''),
    supervisor_id
) 
WHERE status NOT IN ('rejected', 'cancelled');

-- ============================================================================
-- 4. Row Level Security (RLS) Policies (Section 3 & 5)
-- ============================================================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_item_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_row_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_branches ON branches USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_projects ON projects USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_work_areas ON work_areas USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_units ON units USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_work_items ON work_items USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_branch_work_items ON branch_work_items USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_employees ON employees USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_employee_assignments ON employee_assignments USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_employee_history ON employee_history USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_users ON users USING (company_id IS NULL OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_roles ON roles USING (company_id IS NULL OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_productivity_targets ON productivity_targets USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_boq ON boq USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_boq_items ON boq_items USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_boq_item_areas ON boq_item_areas USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_boq_revisions ON boq_revisions USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_production_records ON production_records USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_production_workers ON production_workers USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_production_attachments ON production_attachments USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_production_corrections ON production_corrections USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_attendance ON attendance USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_attendance_statuses ON attendance_statuses USING (company_id IS NULL OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_approval_workflows ON approval_workflows USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_approval_steps ON approval_steps USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_approval_actions ON approval_actions USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_cost_entries ON cost_entries USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_incentive_rules ON incentive_rules USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_incentive_ledger ON incentive_ledger USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_document_categories ON document_categories USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_documents ON documents USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_document_versions ON document_versions USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_import_jobs ON import_jobs USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_import_staging_rows ON import_staging_rows USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_import_row_errors ON import_row_errors USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_export_jobs ON export_jobs USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_notifications ON notifications USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_notification_preferences ON notification_preferences USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_alert_rules ON alert_rules USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_audit_logs ON audit_logs USING (company_id IS NULL OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
CREATE POLICY tenant_isolation_saved_reports ON saved_reports USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

-- ============================================================================
-- 5. View: v_boq_progress (Section 4 Rule R4 & Section 5)
-- ============================================================================

CREATE OR REPLACE VIEW v_boq_progress AS
WITH approved_production AS (
    SELECT 
        pr.company_id,
        pr.project_id,
        pr.work_item_id,
        COALESCE(SUM(pr.actual_quantity), 0) AS total_approved_production
    FROM production_records pr
    WHERE pr.status = 'final_approved'
    GROUP BY pr.company_id, pr.project_id, pr.work_item_id
),
approved_corrections AS (
    SELECT 
        pr.company_id,
        pr.project_id,
        pr.work_item_id,
        COALESCE(SUM(
            CASE 
                WHEN pc.correction_type = 'quantity_adjust' THEN pc.adjustment_quantity
                WHEN pc.correction_type = 'annul' THEN -pr.actual_quantity
                ELSE 0
            END
        ), 0) AS total_approved_corrections
    FROM production_corrections pc
    JOIN production_records pr ON pc.production_record_id = pr.id
    WHERE pc.status = 'approved'
    GROUP BY pr.company_id, pr.project_id, pr.work_item_id
)
SELECT 
    bi.id AS boq_item_id,
    bi.company_id,
    b.project_id,
    bi.boq_id,
    bi.work_item_id,
    wi.name AS work_item_name,
    wi.code AS work_item_code,
    u.symbol AS unit_symbol,
    bi.total_quantity AS boq_quantity,
    bi.unit_rate,
    bi.total_amount,
    COALESCE(ap.total_approved_production, 0) AS final_approved_quantity,
    COALESCE(ac.total_approved_corrections, 0) AS approved_corrections_quantity,
    (COALESCE(ap.total_approved_production, 0) + COALESCE(ac.total_approved_corrections, 0)) AS official_progress_quantity,
    GREATEST(0, bi.total_quantity - (COALESCE(ap.total_approved_production, 0) + COALESCE(ac.total_approved_corrections, 0))) AS remaining_quantity,
    ROUND(
        CASE 
            WHEN bi.total_quantity > 0 THEN 
                ((COALESCE(ap.total_approved_production, 0) + COALESCE(ac.total_approved_corrections, 0)) / bi.total_quantity * 100.0)
            ELSE 0 
        END, 2
    ) AS progress_percentage
FROM boq_items bi
JOIN boq b ON bi.boq_id = b.id
JOIN work_items wi ON bi.work_item_id = wi.id
JOIN units u ON bi.unit_id = u.id
LEFT JOIN approved_production ap ON bi.company_id = ap.company_id AND b.project_id = ap.project_id AND bi.work_item_id = ap.work_item_id
LEFT JOIN approved_corrections ac ON bi.company_id = ac.company_id AND b.project_id = ac.project_id AND bi.work_item_id = ac.work_item_id;

-- ============================================================================
-- 6. Core Seed Data (Section 2 & Section 5)
-- ============================================================================

-- A) Nine System Roles (Section 2)
INSERT INTO roles (id, company_id, code, name, description, is_system) VALUES
    ('00000000-0000-0000-0001-000000000001', NULL, 'super_admin', 'مدير النظام العام', 'صلاحيات كاملة على كل الشركات والموديولات', true),
    ('00000000-0000-0000-0001-000000000002', NULL, 'company_admin', 'مدير الشركة', 'إدارة كاملة لإعدادات ومشاريع وفروع الشركة', true),
    ('00000000-0000-0000-0001-000000000003', NULL, 'branch_manager', 'مدير الفرع', 'إشراف ومتابعة فنية ومالية على مستوى الفرع', true),
    ('00000000-0000-0000-0001-000000000004', NULL, 'project_manager', 'مدير المشروع', 'إدارة المشروع وجداول الكميات والإنتاج والاعتمادات', true),
    ('00000000-0000-0000-0001-000000000005', NULL, 'engineer', 'مهندس موقع', 'مراجعة واعتماد الإنتاج الفعلي وإدارة مناطق العمل', true),
    ('00000000-0000-0000-0001-000000000006', NULL, 'supervisor', 'مشرف تنفيذ', 'تسجيل الحضور اليومي والإنتاج الفعلي للفرق والعمال', true),
    ('00000000-0000-0000-0001-000000000007', NULL, 'data_entry', 'مدخل بيانات', 'إدخال سجلات الحضور وجداول الكميات والبيانات الأساسية', true),
    ('00000000-0000-0000-0001-000000000008', NULL, 'viewer', 'مستعرض', 'استعراض التقارير ولوحات المؤشرات دون تعديل', true),
    ('00000000-0000-0000-0001-000000000009', NULL, 'worker', 'فني / عامل', 'الاطلاع على السجلات والإنتاجية الفردية', true)
ON CONFLICT (id) DO NOTHING;

-- B) Granular Permissions Catalog (format: module.action) (Section 2 & Section 8)
INSERT INTO permissions (code, module, action, description) VALUES
    -- Auth & Administration
    ('auth.login', 'auth', 'login', 'تسجيل الدخول للنظام'),
    ('companies.view', 'companies', 'view', 'استعراض بيانات الشركة'),
    ('companies.manage', 'companies', 'manage', 'إدارة إعدادات الشركة'),
    ('branches.view', 'branches', 'view', 'استعراض الفروع'),
    ('branches.manage', 'branches', 'manage', 'إدارة الفروع وتعديلها'),
    ('projects.view', 'projects', 'view', 'استعراض المشاريع'),
    ('projects.manage', 'projects', 'manage', 'إدارة المشاريع وإعداداتها'),
    ('work_areas.view', 'work_areas', 'view', 'استعراض شجرة المناطق'),
    ('work_areas.manage', 'work_areas', 'manage', 'إدارة شجرة المناطق وتوزيعها'),
    ('units.view', 'units', 'view', 'استعراض الوحدات'),
    ('units.manage', 'units', 'manage', 'إدارة الوحدات والقياسات'),
    ('work_items.view', 'work_items', 'view', 'استعراض بنود الأعمال'),
    ('work_items.manage', 'work_items', 'manage', 'إدارة وتوصيف بنود الأعمال'),
    
    -- Employees & Workforce
    ('employees.view', 'employees', 'view', 'استعراض بيانات العمال والموظفين'),
    ('employees.create', 'employees', 'create', 'إضافة عامل جديد'),
    ('employees.update', 'employees', 'update', 'تعديل بيانات عامل'),
    ('employees.delete', 'employees', 'delete', 'حذف أو أرشفة عامل'),
    ('employees.search_national_id', 'employees', 'search_national_id', 'البحث الفوري بالرقم القومي'),
    
    -- BOQ
    ('boq.view', 'boq', 'view', 'استعراض جداول الكميات'),
    ('boq.create', 'boq', 'create', 'إنشاء مقايسة وجدول كميات'),
    ('boq.update', 'boq', 'update', 'تعديل جدول الكميات'),
    ('boq.approve', 'boq', 'approve', 'اعتماد جدول الكميات والمراجعات'),
    
    -- Production
    ('production.view', 'production', 'view', 'استعراض سجلات الإنتاج'),
    ('production.create', 'production', 'create', 'تسجيل إنتاج يومي (مسودة)'),
    ('production.update', 'production', 'update', 'تعديل سجل إنتاج غير معتمد'),
    ('production.delete', 'production', 'delete', 'إلغاء سجل إنتاج'),
    ('production.submit', 'production', 'submit', 'تقديم سجل الإنتاج للاعتماد'),
    ('production.supervisor_approve', 'production', 'supervisor_approve', 'اعتماد مشرف التنفيذ'),
    ('production.engineer_approve', 'production', 'engineer_approve', 'اعتماد مهندس الموقع'),
    ('production.final_approve', 'production', 'final_approve', 'الاعتماد النهائي وقفل السجل'),
    ('production.reject', 'production', 'reject', 'رفض سجل الإنتاج مع إبداء السبب'),
    ('production.correct', 'production', 'correct', 'إضافة تصحيح إلحاقي لسجل مقفول'),
    
    -- Attendance
    ('attendance.view', 'attendance', 'view', 'استعراض سجلات الحضور'),
    ('attendance.create', 'attendance', 'create', 'تسجيل حضور يومي'),
    ('attendance.update', 'attendance', 'update', 'تعديل سجل حضور'),
    
    -- Productivity & Targets
    ('productivity.view', 'productivity', 'view', 'استعراض معدلات الإنتاجية R1-R12'),
    ('productivity.manage_targets', 'productivity', 'manage_targets', 'إدارة وتحديد المستهدفات اليومية'),
    
    -- Costs & Incentives
    ('costs.view', 'costs', 'view', 'استعراض التكاليف والمصروفات'),
    ('costs.manage', 'costs', 'manage', 'إدارة وتسجيل بنود التكاليف'),
    ('incentives.view', 'incentives', 'view', 'استعراض سجل الحوافز'),
    ('incentives.manage', 'incentives', 'manage', 'إدارة قواعد وصرف الحوافز'),
    
    -- Documents & Attachments
    ('documents.view', 'documents', 'view', 'استعراض المستندات والمخططات'),
    ('documents.upload', 'documents', 'upload', 'رفع مستندات وإصدارات جديدة'),
    ('documents.manage', 'documents', 'manage', 'إدارة تصنيفات وحذف المستندات'),
    
    -- Imports & Exports
    ('imports.upload', 'imports', 'upload', 'رفع ومعالجة ملفات الاستيراد'),
    ('imports.commit', 'imports', 'commit', 'تأكيد وحفظ البيانات المستوردة'),
    ('exports.generate', 'exports', 'generate', 'تصدير البيانات والتقارير'),
    
    -- Reports & Approvals & Audit
    ('reports.view', 'reports', 'view', 'استعراض التقارير ولوحات المؤشرات'),
    ('reports.build', 'reports', 'build', 'إنشاء وحفظ تقارير مخصصة'),
    ('approvals.manage_workflows', 'approvals', 'manage_workflows', 'إدارة مسارات وسلاسل الاعتمادات'),
    ('audit.view', 'audit', 'view', 'استعراض سجلات التدقيق والتتبع')
ON CONFLICT (code) DO NOTHING;

-- C) Attendance Statuses Catalog (Section 3 & Section 5)
INSERT INTO attendance_statuses (id, company_id, code, name, is_present, deduction_ratio, is_active) VALUES
    ('00000000-0000-0000-0002-000000000001', NULL, 'present', 'حاضر', true, 0.00, true),
    ('00000000-0000-0000-0002-000000000002', NULL, 'absent', 'غائب', false, 1.00, true),
    ('00000000-0000-0000-0002-000000000003', NULL, 'late', 'متأخر', true, 0.25, true),
    ('00000000-0000-0000-0002-000000000004', NULL, 'excused', 'إذن / إجازة', false, 0.00, true),
    ('00000000-0000-0000-0002-000000000005', NULL, 'rest_day', 'عطلة رسمية / راحة', false, 0.00, true)
ON CONFLICT (id) DO NOTHING;
