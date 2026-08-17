import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthenticatedUser } from '../auth/auth.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  private assertAdmin(user: AuthenticatedUser) {
    const roleCodes = (user.roles || []).map((r) => (typeof r === 'string' ? r : r.roleCode));
    const isAdmin = roleCodes.some((c) => ['company_admin', 'super_admin'].includes(c));
    if (!isAdmin) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Only company administrators can manage roles and permissions',
        code: 'FORBIDDEN_ADMIN_ONLY',
      });
    }
  }

  /**
   * List complete catalog of system permissions
   */
  async listPermissions() {
    const res = await this.db.query(
      `SELECT id, code, module, action, description
       FROM permissions
       ORDER BY module ASC, code ASC`,
    );
    return res.rows;
  }

  /**
   * List all roles available for company
   */
  async listRoles(companyId: string) {
    const res = await this.db.query(
      `SELECT id, code, name, description, is_system
       FROM roles
       WHERE company_id = $1 OR company_id IS NULL
       ORDER BY is_system DESC, name ASC`,
      [companyId],
    );
    return res.rows;
  }

  /**
   * Get permissions assigned to a specific role
   */
  async getRolePermissions(companyId: string, roleId: string) {
    const roleRes = await this.db.query(
      `SELECT id, code, name, description, is_system
       FROM roles
       WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)`,
      [roleId, companyId],
    );

    if (roleRes.rows.length === 0) {
      throw new NotFoundException('Role not found');
    }

    const role = roleRes.rows[0];

    const permsRes = await this.db.query(
      `SELECT p.id, p.code, p.module, p.action, p.description
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.module ASC, p.code ASC`,
      [roleId],
    );

    return {
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      permissionIds: permsRes.rows.map((p) => p.id),
      permissions: permsRes.rows,
    };
  }

  /**
   * Replace all permissions assigned to a role
   */
  async updateRolePermissions(
    companyId: string,
    roleId: string,
    dto: UpdateRolePermissionsDto,
    updater: AuthenticatedUser,
  ) {
    this.assertAdmin(updater);

    const roleRes = await this.db.query(
      `SELECT id, code, name, description
       FROM roles
       WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)`,
      [roleId, companyId],
    );

    if (roleRes.rows.length === 0) {
      throw new NotFoundException('Role not found');
    }

    // Delete existing role_permissions
    await this.db.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

    // Insert new permissions
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      for (const permId of dto.permissionIds) {
        await this.db.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permId],
        );
      }
    }

    return this.getRolePermissions(companyId, roleId);
  }
}
