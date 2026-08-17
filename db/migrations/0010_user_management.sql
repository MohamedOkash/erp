-- ============================================================================
-- Migration: 0010_user_management.sql
-- Description: User project scopes, permission overrides, and RBAC enhancement
-- ============================================================================

-- 1. Table: user_project_scopes
CREATE TABLE IF NOT EXISTS user_project_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    work_area_id UUID REFERENCES work_areas(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_project_scopes_unique 
ON user_project_scopes (
    user_id, 
    project_id, 
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    COALESCE(work_area_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE INDEX IF NOT EXISTS idx_user_project_scopes_user ON user_project_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_scopes_project ON user_project_scopes(project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_scopes_company ON user_project_scopes(company_id);

-- 2. Table: user_permission_overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    grant_type VARCHAR(10) NOT NULL CHECK (grant_type IN ('grant', 'deny')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_permission_overrides UNIQUE (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_company ON user_permission_overrides(company_id);

-- 3. Row Level Security
ALTER TABLE user_project_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_user_project_scopes'
    ) THEN
        CREATE POLICY tenant_isolation_user_project_scopes ON user_project_scopes
            USING (company_id::text = current_setting('app.company_id', true));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_user_permission_overrides'
    ) THEN
        CREATE POLICY tenant_isolation_user_permission_overrides ON user_permission_overrides
            USING (company_id::text = current_setting('app.company_id', true));
    END IF;
END $$;

-- 4. User management permissions in permissions catalog
INSERT INTO permissions (code, module, action, description) VALUES
    ('users.view', 'users', 'view', 'استعراض قائمة وبيانات المستخدمين'),
    ('users.create', 'users', 'create', 'إنشاء حساب مستخدم جديد وتعيين الصلاحيات'),
    ('users.update', 'users', 'update', 'تعديل بيانات المستخدم ونطاقاته'),
    ('users.delete', 'users', 'delete', 'تعطيل أو حذف حساب المستخدم'),
    ('roles.view', 'roles', 'view', 'استعراض قائمة الأدوار ومصفوفة الصلاحيات'),
    ('roles.manage_permissions', 'roles', 'manage_permissions', 'تعديل وتخصيص مصفوفة صلاحيات الأدوار')
ON CONFLICT (code) DO NOTHING;

-- Grant new user/role permissions to company_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('company_admin', 'super_admin')
  AND p.code IN ('users.view', 'users.create', 'users.update', 'users.delete', 'roles.view', 'roles.manage_permissions')
ON CONFLICT DO NOTHING;
