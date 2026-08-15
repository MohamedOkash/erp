import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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
   * Validate session token, resolve active user, tenant company_id, roles and permissions
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

    // Fetch user permissions (granular module.action)
    const permsRes = await this.db.query(
      `SELECT DISTINCT p.code
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = $1`,
      [session.user_id],
    );

    const roles = rolesRes.rows.map((r) => ({
      roleName: r.role_name,
      roleCode: r.role_code,
      scopeType: r.scope_type,
      scopeId: r.scope_id,
    }));

    const permissions = permsRes.rows.map((p) => p.code);

    return {
      userId: session.user_id,
      companyId: session.company_id,
      employeeId: session.employee_id,
      username: session.username,
      fullName: session.full_name,
      roles,
      permissions,
    };
  }

  /**
   * Terminate/revoke session
   */
  async revokeSession(token: string): Promise<void> {
    await this.db.query(`DELETE FROM sessions WHERE token = $1`, [token]);
  }
}
