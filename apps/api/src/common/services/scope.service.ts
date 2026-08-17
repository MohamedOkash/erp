import { Injectable, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuthenticatedUser } from '../../auth/auth.service';

@Injectable()
export class ScopeService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Returns null if user has unrestricted access (company_admin, super_admin, program_manager).
   * Otherwise returns array of project IDs user is scoped to.
   */
  async getProjectScope(user: AuthenticatedUser): Promise<string[] | null> {
    const roleCodes = (user.roles || []).map((r) => (typeof r === 'string' ? r : r.roleCode));
    const isUnrestricted = roleCodes.some((code) =>
      ['company_admin', 'super_admin', 'program_manager'].includes(code),
    );

    if (isUnrestricted) {
      return null;
    }

    // Query user_project_scopes
    const res = await this.db.query(
      `SELECT project_id FROM user_project_scopes WHERE user_id = $1`,
      [user.userId],
    );

    if (res.rows.length > 0) {
      return res.rows.map((r) => r.project_id);
    }

    // If no explicit project scopes configured in user_project_scopes, user has full company access
    return null;
  }

  /**
   * Asserts that a given projectId is within the user's project scope.
   * If outside scope, throws 403 Forbidden with OUT_OF_SCOPE.
   */
  async assertProjectInScope(user: AuthenticatedUser, projectId?: string | null): Promise<void> {
    if (!projectId) return;
    const scope = await this.getProjectScope(user);
    if (scope === null) return; // Unrestricted

    if (!scope.includes(projectId)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Project is out of assigned scope',
        code: 'OUT_OF_SCOPE',
      });
    }
  }
}
