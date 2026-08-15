import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'MISSING_TOKEN',
        message: 'Authentication token missing',
      });
    }

    const sessionRes = await this.db.query(
      `SELECT s.id AS session_id, s.user_id, s.token, s.expires_at,
              u.company_id, u.username, u.full_name, u.employee_id, u.is_active
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [token],
    );

    if (sessionRes.rows.length === 0) {
      throw new UnauthorizedException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Invalid or expired session',
      });
    }

    const session = sessionRes.rows[0];
    if (!session.is_active) {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'User account is deactivated',
      });
    }

    // Fetch user roles
    const rolesRes = await this.db.query(
      `SELECT r.name AS role_name, r.code AS role_code, ur.scope_type, ur.scope_id
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [session.user_id],
    );

    // Fetch user permissions
    const permsRes = await this.db.query(
      `SELECT DISTINCT p.code
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = $1`,
      [session.user_id],
    );

    const authenticatedUser = {
      userId: session.user_id,
      companyId: session.company_id,
      employeeId: session.employee_id || undefined,
      username: session.username,
      fullName: session.full_name,
      roles: rolesRes.rows.map((r) => ({
        roleName: r.role_name,
        roleCode: r.role_code,
        scopeType: r.scope_type,
        scopeId: r.scope_id || undefined,
      })),
      permissions: permsRes.rows.map((p) => p.code),
    };

    request.user = authenticatedUser;
    request.companyId = session.company_id;
    request.userId = session.user_id;

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return request.headers['x-session-token'];
  }
}
