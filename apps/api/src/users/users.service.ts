import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { AuthenticatedUser } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserOverridesDto } from './dto/user-overrides.dto';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(private readonly db: DatabaseService) {}

  private assertAdmin(user: AuthenticatedUser) {
    const roleCodes = (user.roles || []).map((r) => (typeof r === 'string' ? r : r.roleCode));
    const isAdmin = roleCodes.some((c) => ['company_admin', 'super_admin'].includes(c));
    if (!isAdmin) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Only company administrators can manage users and permissions',
        code: 'FORBIDDEN_ADMIN_ONLY',
      });
    }
  }

  /**
   * List users with roles, project scopes, and employee info
   */
  async listUsers(companyId: string, query: QueryUserDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['u.company_id = $1'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.search) {
      conditions.push(
        `(u.username ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR e.name ILIKE $${paramIndex})`,
      );
      params.push(`%${query.search.trim()}%`);
      paramIndex++;
    }

    if (query.isActive !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.roleCode) {
      conditions.push(
        `EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.user_id = u.id AND r2.code = $${paramIndex})`,
      );
      params.push(query.roleCode);
      paramIndex++;
    }

    if (query.projectId) {
      conditions.push(
        `EXISTS (SELECT 1 FROM user_project_scopes ups2 WHERE ups2.user_id = u.id AND ups2.project_id = $${paramIndex})`,
      );
      params.push(query.projectId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Total count
    const countSql = `
      SELECT COUNT(DISTINCT u.id)::int AS total
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE ${whereClause}
    `;
    const countRes = await this.db.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    // Users query with aggregated roles and scopes
    const querySql = `
      SELECT 
        u.id,
        u.company_id,
        u.employee_id,
        u.username,
        u.email,
        u.full_name,
        u.phone,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        e.name AS employee_name,
        e.code AS employee_code,
        e.role_type AS employee_role_type,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'roleId', r.id,
                'roleName', r.name,
                'roleCode', r.code,
                'scopeType', ur.scope_type,
                'scopeId', ur.scope_id
              )
            )
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = u.id
          ),
          '[]'::json
        ) AS roles,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ups.id,
                'projectId', ups.project_id,
                'projectName', p.name,
                'projectCode', p.code,
                'branchId', ups.branch_id,
                'branchName', b.name,
                'workAreaId', ups.work_area_id,
                'workAreaName', wa.name
              )
            )
            FROM user_project_scopes ups
            JOIN projects p ON ups.project_id = p.id
            LEFT JOIN branches b ON ups.branch_id = b.id
            LEFT JOIN work_areas wa ON ups.work_area_id = wa.id
            WHERE ups.user_id = u.id
          ),
          '[]'::json
        ) AS scopes
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const res = await this.db.query(querySql, params);

    return {
      data: res.rows.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        employeeId: row.employee_id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        isActive: row.is_active,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        employee: row.employee_id
          ? {
              id: row.employee_id,
              name: row.employee_name,
              code: row.employee_code,
              roleType: row.employee_role_type,
            }
          : null,
        roles: row.roles || [],
        scopes: row.scopes || [],
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single user by ID
   */
  async getUserById(companyId: string, id: string) {
    const res = await this.db.query(
      `SELECT u.id, u.company_id, u.employee_id, u.username, u.email, u.full_name, u.phone,
              u.is_active, u.last_login_at, u.created_at, u.updated_at
       FROM users u
       WHERE u.id = $1`,
      [id],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const user = res.rows[0];

    const rolesRes = await this.db.query(
      `SELECT r.id AS role_id, r.name AS role_name, r.code AS role_code, ur.scope_type, ur.scope_id
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [id],
    );

    const scopesRes = await this.db.query(
      `SELECT ups.id, ups.project_id, ups.branch_id, ups.work_area_id,
              p.name AS project_name, p.code AS project_code,
              b.name AS branch_name, wa.name AS work_area_name
       FROM user_project_scopes ups
       JOIN projects p ON ups.project_id = p.id
       LEFT JOIN branches b ON ups.branch_id = b.id
       LEFT JOIN work_areas wa ON ups.work_area_id = wa.id
       WHERE ups.user_id = $1`,
      [id],
    );

    return {
      id: user.id,
      companyId: user.company_id,
      employeeId: user.employee_id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      roles: rolesRes.rows.map((r) => ({
        roleId: r.role_id,
        roleName: r.role_name,
        roleCode: r.role_code,
        scopeType: r.scope_type,
        scopeId: r.scope_id,
      })),
      scopes: scopesRes.rows.map((s) => ({
        id: s.id,
        projectId: s.project_id,
        projectName: s.project_name,
        projectCode: s.project_code,
        branchId: s.branch_id,
        branchName: s.branch_name,
        workAreaId: s.work_area_id,
        workAreaName: s.work_area_name,
      })),
    };
  }

  /**
   * Create a new user account with roles and scopes
   */
  async createUser(companyId: string, dto: CreateUserDto, creator: AuthenticatedUser) {
    this.assertAdmin(creator);
    const targetCompanyId = companyId || creator?.companyId || 'c0000000-0000-0000-0000-000000000001';

    // 1. Verify username uniqueness
    const checkUsername = await this.db.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [dto.username.trim()],
    );
    if (checkUsername.rows.length > 0) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Username already exists',
        code: 'USERNAME_EXISTS',
      });
    }

    // 2. Resolve employee details if employeeId provided
    let fullName = dto.fullName?.trim();
    let email = dto.email?.trim() || null;
    let phone = dto.phone?.trim() || null;

    if (dto.employeeId) {
      const empRes = await this.db.query(
        `SELECT id, name, phone FROM employees WHERE id = $1`,
        [dto.employeeId],
      );
      if (empRes.rows.length === 0) {
        throw new NotFoundException('Selected employee not found');
      }
      const emp = empRes.rows[0];
      if (!fullName) {
        fullName = emp.name;
      }
      if (!phone && emp.phone) {
        phone = emp.phone;
      }
    }

    if (!fullName) {
      throw new BadRequestException('Full name is required');
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    // 4. Insert user
    const insertRes = await this.db.query(
      `INSERT INTO users (company_id, employee_id, username, email, phone, full_name, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, company_id, employee_id, username, email, phone, full_name, is_active, created_at, updated_at`,
      [
        targetCompanyId,
        dto.employeeId || null,
        dto.username.trim(),
        email,
        phone,
        fullName,
        passwordHash,
        dto.isActive !== false,
      ],
    );

    const newUser = insertRes.rows[0];

    // 5. Assign roles
    if (dto.roleCodes && dto.roleCodes.length > 0) {
      for (const roleCode of dto.roleCodes) {
        const roleRes = await this.db.query(
          `SELECT id FROM roles WHERE code = $1 AND (company_id = $2 OR company_id IS NULL)`,
          [roleCode.trim(), targetCompanyId],
        );
        if (roleRes.rows.length > 0) {
          await this.db.query(
            `INSERT INTO user_roles (user_id, role_id, scope_type) VALUES ($1, $2, 'company')
             ON CONFLICT DO NOTHING`,
            [newUser.id, roleRes.rows[0].id],
          );
        }
      }
    }

    // 6. Assign project scopes
    if (dto.scopes && dto.scopes.length > 0) {
      for (const sc of dto.scopes) {
        const projRes = await this.db.query(
          `SELECT id, branch_id FROM projects WHERE id = $1`,
          [sc.projectId],
        );
        if (projRes.rows.length > 0) {
          const branchId = sc.branchId || projRes.rows[0].branch_id || null;
          await this.db.query(
            `INSERT INTO user_project_scopes (company_id, user_id, project_id, branch_id, work_area_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [targetCompanyId, newUser.id, sc.projectId, branchId, sc.workAreaId || null],
          );
        }
      }
    }

    return this.getUserById(targetCompanyId, newUser.id);
  }

  /**
   * Update user details, roles, and project scopes
   */
  async updateUser(companyId: string, id: string, dto: UpdateUserDto, updater: AuthenticatedUser) {
    this.assertAdmin(updater);

    const userCheck = await this.db.query(
      `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (userCheck.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [id, companyId];
    let paramIndex = 3;

    if (dto.fullName !== undefined) {
      updates.push(`full_name = $${paramIndex}`);
      params.push(dto.fullName.trim());
      paramIndex++;
    }

    if (dto.email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      params.push(dto.email ? dto.email.trim() : null);
      paramIndex++;
    }

    if (dto.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      params.push(dto.phone ? dto.phone.trim() : null);
      paramIndex++;
    }

    if (dto.employeeId !== undefined) {
      updates.push(`employee_id = $${paramIndex}`);
      params.push(dto.employeeId || null);
      paramIndex++;
    }

    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(dto.isActive);
      paramIndex++;
    }

    if (updates.length > 1) {
      await this.db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $1 AND company_id = $2`,
        params,
      );
    }

    // Replace roles if provided
    if (dto.roleCodes !== undefined) {
      await this.db.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
      for (const roleCode of dto.roleCodes) {
        const roleRes = await this.db.query(
          `SELECT id FROM roles WHERE code = $1 AND (company_id = $2 OR company_id IS NULL)`,
          [roleCode.trim(), companyId],
        );
        if (roleRes.rows.length > 0) {
          await this.db.query(
            `INSERT INTO user_roles (user_id, role_id, scope_type) VALUES ($1, $2, 'company')
             ON CONFLICT DO NOTHING`,
            [id, roleRes.rows[0].id],
          );
        }
      }
    }

    // Replace scopes if provided
    if (dto.scopes !== undefined) {
      await this.db.query(`DELETE FROM user_project_scopes WHERE user_id = $1`, [id]);
      for (const sc of dto.scopes) {
        const projRes = await this.db.query(
          `SELECT id, branch_id FROM projects WHERE id = $1 AND company_id = $2`,
          [sc.projectId, companyId],
        );
        if (projRes.rows.length > 0) {
          const branchId = sc.branchId || projRes.rows[0].branch_id || null;
          await this.db.query(
            `INSERT INTO user_project_scopes (company_id, user_id, project_id, branch_id, work_area_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [companyId, id, sc.projectId, branchId, sc.workAreaId || null],
          );
        }
      }
    }

    return this.getUserById(companyId, id);
  }

  /**
   * Reset user password
   */
  async resetPassword(
    companyId: string,
    id: string,
    dto: ResetPasswordDto,
    updater: AuthenticatedUser,
  ) {
    this.assertAdmin(updater);

    const userCheck = await this.db.query(
      `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (userCheck.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.db.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [passwordHash, id],
    );

    // Invalidate active sessions
    await this.db.query(`DELETE FROM sessions WHERE user_id = $1`, [id]);

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }

  /**
   * Soft delete / deactivate user
   */
  async deleteUser(companyId: string, id: string, updater: AuthenticatedUser) {
    this.assertAdmin(updater);

    const res = await this.db.query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, companyId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    // Invalidate sessions
    await this.db.query(`DELETE FROM sessions WHERE user_id = $1`, [id]);

    return {
      success: true,
      message: 'User deactivated successfully',
    };
  }

  /**
   * Get user permission overrides
   */
  async getUserOverrides(companyId: string, id: string) {
    const userCheck = await this.db.query(
      `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (userCheck.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const res = await this.db.query(
      `SELECT upo.id, upo.permission_id, upo.grant_type,
              p.code AS permission_code, p.module, p.action, p.description
       FROM user_permission_overrides upo
       JOIN permissions p ON upo.permission_id = p.id
       WHERE upo.user_id = $1
       ORDER BY p.module ASC, p.code ASC`,
      [id],
    );

    return res.rows.map((row) => ({
      id: row.id,
      permissionId: row.permission_id,
      permissionCode: row.permission_code,
      module: row.module,
      action: row.action,
      description: row.description,
      grantType: row.grant_type,
    }));
  }

  /**
   * Update user permission overrides
   */
  async updateUserOverrides(
    companyId: string,
    id: string,
    dto: UpdateUserOverridesDto,
    updater: AuthenticatedUser,
  ) {
    this.assertAdmin(updater);

    const userCheck = await this.db.query(
      `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (userCheck.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    // Delete existing overrides
    await this.db.query(`DELETE FROM user_permission_overrides WHERE user_id = $1`, [id]);

    // Insert new overrides
    if (dto.overrides && dto.overrides.length > 0) {
      for (const ov of dto.overrides) {
        let permissionId = ov.permissionId;
        if (!permissionId && ov.permissionCode) {
          const permRes = await this.db.query(
            `SELECT id FROM permissions WHERE code = $1`,
            [ov.permissionCode],
          );
          if (permRes.rows.length > 0) {
            permissionId = permRes.rows[0].id;
          }
        }

        if (permissionId) {
          await this.db.query(
            `INSERT INTO user_permission_overrides (company_id, user_id, permission_id, grant_type)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, permission_id) DO UPDATE SET grant_type = EXCLUDED.grant_type`,
            [companyId, id, permissionId, ov.grantType],
          );
        }
      }
    }

    return this.getUserOverrides(companyId, id);
  }
}
