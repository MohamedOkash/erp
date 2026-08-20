import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';

export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  employeeId?: string;
  username: string;
  fullName: string;
  roles: Array<{ roleName: string; roleCode: string; scopeType: string; scopeId?: string }>;
  permissions: string[];
  scopes?: Array<{
    id: string;
    projectId: string;
    projectName?: string;
    projectCode?: string;
    branchId?: string;
    branchName?: string;
    workAreaId?: string;
    workAreaName?: string;
  }>;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;
  private readonly sessionDurationHours = 24;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Hash a plain password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a plain password against its bcrypt hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create an authenticated session record in the PostgreSQL `sessions` table
   */
  async createSession(
    userId: string,
    companyId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.sessionDurationHours * 60 * 60 * 1000);

    await this.db.query(
      `INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, token, expiresAt, ipAddress || null, userAgent || null],
    );

    return { token, expiresAt };
  }

  /**
   * Invalidate/Delete session token on logout
   */
  async logout(token: string) {
    if (token) {
      await this.db.query(`DELETE FROM sessions WHERE token = $1`, [token]);
    }
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Authenticate user with username and password, create session and return tokens
   */
  async login(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!username || !password) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Username and password are required',
      });
    }

    const userRes = await this.db.query(
      `SELECT id, company_id, username, email, full_name, password_hash, is_active
       FROM users
       WHERE username = $1`,
      [username.trim()],
    );

    if (userRes.rows.length === 0) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const user = userRes.rows[0];

    const isMatch = await this.comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    if (!user.is_active) {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'User account is deactivated',
      });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.sessionDurationHours * 60 * 60 * 1000);

    await this.db.query(
      `INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, token, expiresAt, ipAddress || null, userAgent || null],
    );

    await this.db.query(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id],
    );

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
      },
      companyId: user.company_id,
    };
  }

  /**
   * Validate session token, resolve active user, tenant company_id, roles, scopes and permissions
   */
  async validateSession(token: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    const sessionRes = await this.db.query(
      `SELECT s.id AS session_id, u.company_id, s.user_id, s.expires_at,
              u.username, u.full_name, u.employee_id, u.is_active
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [token],
    );

    if (sessionRes.rows.length === 0) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const session = sessionRes.rows[0];
    if (!session.is_active) {
      throw new UnauthorizedException('User account is deactivated');
    }

    // Fetch user roles
    const rolesRes = await this.db.query(
      `SELECT r.name AS role_name, r.code AS role_code, ur.scope_type, ur.scope_id
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [session.user_id],
    );

    // Fetch user role permissions
    const permsRes = await this.db.query(
      `SELECT DISTINCT p.code
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = $1`,
      [session.user_id],
    );

    // Fetch user permission overrides (grant & deny)
    let overridesRes = { rows: [] as any[] };
    try {
      overridesRes = await this.db.query(
        `SELECT p.code, upo.grant_type
         FROM user_permission_overrides upo
         JOIN permissions p ON upo.permission_id = p.id
         WHERE upo.user_id = $1`,
        [session.user_id],
      );
    } catch {
      // Table might not exist in early tests
    }

    const effectivePerms = new Set<string>(permsRes.rows.map((p) => p.code));
    for (const ov of overridesRes.rows) {
      if (ov.grant_type === 'grant') {
        effectivePerms.add(ov.code);
      } else if (ov.grant_type === 'deny') {
        effectivePerms.delete(ov.code);
      }
    }

    // Fetch user project scopes
    let scopesRes = { rows: [] as any[] };
    try {
      scopesRes = await this.db.query(
        `SELECT ups.id, ups.project_id, ups.branch_id, ups.work_area_id,
                p.name AS project_name, p.code AS project_code,
                b.name AS branch_name,
                wa.name AS work_area_name
         FROM user_project_scopes ups
         JOIN projects p ON ups.project_id = p.id
         LEFT JOIN branches b ON ups.branch_id = b.id
         LEFT JOIN work_areas wa ON ups.work_area_id = wa.id
         WHERE ups.user_id = $1`,
        [session.user_id],
      );
    } catch {
      // Table might not exist in early tests
    }

    const roles = rolesRes.rows.map((r) => ({
      roleName: r.role_name,
      roleCode: r.role_code,
      scopeType: r.scope_type,
      scopeId: r.scope_id,
    }));

    const scopes = scopesRes.rows.map((s) => ({
      id: s.id,
      projectId: s.project_id,
      projectName: s.project_name,
      projectCode: s.project_code,
      branchId: s.branch_id,
      branchName: s.branch_name,
      workAreaId: s.work_area_id,
      workAreaName: s.work_area_name,
    }));

    return {
      userId: session.user_id,
      companyId: session.company_id,
      employeeId: session.employee_id,
      username: session.username,
      fullName: session.full_name,
      roles,
      permissions: Array.from(effectivePerms),
      scopes,
    };
  }

  /**
   * Terminate/revoke session
   */
  async revokeSession(token: string): Promise<void> {
    await this.db.query(`DELETE FROM sessions WHERE token = $1`, [token]);
  }

  /**
   * Update current user profile info
   */
  async updateProfile(
    companyId: string,
    userId: string,
    dto: { username?: string; fullName?: string; email?: string; phone?: string },
  ) {
    if (dto.username) {
      const cleanUsername = dto.username.trim();
      const existingUserRes = await this.db.query(
        `SELECT id FROM users WHERE username = $1 AND id != $2`,
        [cleanUsername, userId],
      );
      if (existingUserRes.rows.length > 0) {
        throw new BadRequestException({
          code: 'USERNAME_ALREADY_EXISTS',
          message: 'اسم المستخدم مستخدم بالفعل في حساب آخر',
        });
      }
    }

    const res = await this.db.query(
      `UPDATE users
       SET username = COALESCE($1, username),
           full_name = COALESCE($2, full_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           updated_at = NOW()
       WHERE id = $5 AND company_id = $6
       RETURNING id, username, full_name, email, phone, company_id, employee_id`,
      [
        dto.username?.trim() || null,
        dto.fullName?.trim() || null,
        dto.email?.trim() || null,
        dto.phone?.trim() || null,
        userId,
        companyId,
      ],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const row = res.rows[0];
    return {
      user: {
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        companyId: row.company_id,
        employeeId: row.employee_id,
      },
    };
  }

  /**
   * Change current user password with current password check and 8+ char rule
   */
  async changePassword(
    companyId: string,
    userId: string,
    dto: { currentPassword?: string; newPassword?: string },
  ) {
    if (!dto.currentPassword) {
      throw new BadRequestException({
        code: 'CURRENT_PASSWORD_REQUIRED',
        message: 'كلمة المرور الحالية مطلوبة',
      });
    }

    if (!dto.newPassword || dto.newPassword.length < 8) {
      throw new BadRequestException({
        code: 'PASSWORD_TOO_SHORT',
        message: 'كلمة المرور الجديدة يجب أن لا تقل عن 8 أحرف',
      });
    }

    const userRes = await this.db.query(
      `SELECT id, password_hash FROM users WHERE id = $1 AND company_id = $2`,
      [userId, companyId],
    );

    if (userRes.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const user = userRes.rows[0];
    const isMatch = await this.comparePassword(dto.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException({
        code: 'WRONG_CURRENT_PASSWORD',
        message: 'كلمة المرور الحالية غير صحيحة',
      });
    }

    const newHash = await this.hashPassword(dto.newPassword);
    await this.db.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
      [newHash, userId, companyId],
    );

    return {
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
    };
  }
}

