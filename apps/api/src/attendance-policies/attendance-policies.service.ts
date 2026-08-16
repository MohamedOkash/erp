import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAttendancePolicyDto } from './dto/create-attendance-policy.dto';
import { UpdateAttendancePolicyDto } from './dto/update-attendance-policy.dto';
import { QueryAttendancePolicyDto } from './dto/query-attendance-policy.dto';

export interface AttendancePolicy {
  id: string;
  company_id: string;
  project_id: string | null;
  project_name?: string | null;
  shift_start_time: string;
  shift_end_time: string;
  grace_minutes: number;
  break_minutes: number;
  overtime_threshold_hours: number;
  overtime_multiplier: number;
  effective_from: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class AttendancePoliciesService {
  constructor(private readonly db: DatabaseService) {}

  async findPolicies(companyId: string, query: QueryAttendancePolicyDto = {}) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['ap.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.projectId !== undefined) {
        if (query.projectId === null || query.projectId === '') {
          conditions.push('ap.project_id IS NULL');
        } else {
          conditions.push(`ap.project_id = $${paramIdx++}`);
          params.push(query.projectId);
        }
      }

      if (query.isActive !== undefined) {
        conditions.push(`ap.is_active = $${paramIdx++}`);
        params.push(query.isActive);
      }

      const whereClause = conditions.join(' AND ');
      const sql = `
        SELECT ap.id, ap.company_id, ap.project_id,
               to_char(ap.shift_start_time, 'HH24:MI') AS shift_start_time,
               to_char(ap.shift_end_time, 'HH24:MI') AS shift_end_time,
               ap.grace_minutes, ap.break_minutes,
               ap.overtime_threshold_hours, ap.overtime_multiplier,
               to_char(ap.effective_from, 'YYYY-MM-DD') AS effective_from,
               ap.is_active, ap.created_at, ap.updated_at,
               p.name AS project_name
        FROM attendance_policies ap
        LEFT JOIN projects p ON ap.project_id = p.id AND ap.company_id = p.company_id
        WHERE ${whereClause}
        ORDER BY ap.effective_from DESC, ap.created_at DESC
      `;

      const res = await client.query(sql, params);
      return res.rows;
    });
  }

  async getPolicyById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const sql = `
        SELECT ap.id, ap.company_id, ap.project_id,
               to_char(ap.shift_start_time, 'HH24:MI') AS shift_start_time,
               to_char(ap.shift_end_time, 'HH24:MI') AS shift_end_time,
               ap.grace_minutes, ap.break_minutes,
               ap.overtime_threshold_hours, ap.overtime_multiplier,
               to_char(ap.effective_from, 'YYYY-MM-DD') AS effective_from,
               ap.is_active, ap.created_at, ap.updated_at,
               p.name AS project_name
        FROM attendance_policies ap
        LEFT JOIN projects p ON ap.project_id = p.id AND ap.company_id = p.company_id
        WHERE ap.company_id = $1 AND ap.id = $2
      `;
      const res = await client.query(sql, [companyId, id]);
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: 'Attendance policy not found',
        });
      }
      return res.rows[0];
    });
  }

  async createPolicy(companyId: string, dto: CreateAttendancePolicyDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      if (dto.projectId) {
        const projRes = await client.query(
          `SELECT id FROM projects WHERE company_id = $1 AND id = $2`,
          [companyId, dto.projectId],
        );
        if (projRes.rows.length === 0) {
          throw new BadRequestException({
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found',
          });
        }
      }

      const sql = `
        INSERT INTO attendance_policies (
          company_id, project_id, shift_start_time, shift_end_time,
          grace_minutes, break_minutes, overtime_threshold_hours,
          overtime_multiplier, effective_from, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, company_id, project_id,
                  to_char(shift_start_time, 'HH24:MI') AS shift_start_time,
                  to_char(shift_end_time, 'HH24:MI') AS shift_end_time,
                  grace_minutes, break_minutes, overtime_threshold_hours,
                  overtime_multiplier,
                  to_char(effective_from, 'YYYY-MM-DD') AS effective_from,
                  is_active, created_at, updated_at
      `;

      const res = await client.query(sql, [
        companyId,
        dto.projectId || null,
        dto.shiftStartTime || '08:00',
        dto.shiftEndTime || '17:00',
        dto.graceMinutes !== undefined ? dto.graceMinutes : 15,
        dto.breakMinutes !== undefined ? dto.breakMinutes : 60,
        dto.overtimeThresholdHours !== undefined ? dto.overtimeThresholdHours : 8.0,
        dto.overtimeMultiplier !== undefined ? dto.overtimeMultiplier : 1.5,
        dto.effectiveFrom || new Date().toISOString().split('T')[0],
        dto.isActive !== undefined ? dto.isActive : true,
      ]);

      return res.rows[0];
    });
  }

  async updatePolicy(companyId: string, id: string, dto: UpdateAttendancePolicyDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const existingRes = await client.query(
        `SELECT id FROM attendance_policies WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (existingRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: 'Attendance policy not found',
        });
      }

      if (dto.projectId) {
        const projRes = await client.query(
          `SELECT id FROM projects WHERE company_id = $1 AND id = $2`,
          [companyId, dto.projectId],
        );
        if (projRes.rows.length === 0) {
          throw new BadRequestException({
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found',
          });
        }
      }

      const updates: string[] = [];
      const params: any[] = [companyId, id];
      let paramIdx = 3;

      if (dto.projectId !== undefined) {
        updates.push(`project_id = $${paramIdx++}`);
        params.push(dto.projectId || null);
      }
      if (dto.shiftStartTime !== undefined) {
        updates.push(`shift_start_time = $${paramIdx++}`);
        params.push(dto.shiftStartTime);
      }
      if (dto.shiftEndTime !== undefined) {
        updates.push(`shift_end_time = $${paramIdx++}`);
        params.push(dto.shiftEndTime);
      }
      if (dto.graceMinutes !== undefined) {
        updates.push(`grace_minutes = $${paramIdx++}`);
        params.push(dto.graceMinutes);
      }
      if (dto.breakMinutes !== undefined) {
        updates.push(`break_minutes = $${paramIdx++}`);
        params.push(dto.breakMinutes);
      }
      if (dto.overtimeThresholdHours !== undefined) {
        updates.push(`overtime_threshold_hours = $${paramIdx++}`);
        params.push(dto.overtimeThresholdHours);
      }
      if (dto.overtimeMultiplier !== undefined) {
        updates.push(`overtime_multiplier = $${paramIdx++}`);
        params.push(dto.overtimeMultiplier);
      }
      if (dto.effectiveFrom !== undefined) {
        updates.push(`effective_from = $${paramIdx++}`);
        params.push(dto.effectiveFrom);
      }
      if (dto.isActive !== undefined) {
        updates.push(`is_active = $${paramIdx++}`);
        params.push(dto.isActive);
      }

      if (updates.length === 0) {
        return this.getPolicyById(companyId, id);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      const sql = `
        UPDATE attendance_policies
        SET ${updates.join(', ')}
        WHERE company_id = $1 AND id = $2
        RETURNING id, company_id, project_id,
                  to_char(shift_start_time, 'HH24:MI') AS shift_start_time,
                  to_char(shift_end_time, 'HH24:MI') AS shift_end_time,
                  grace_minutes, break_minutes, overtime_threshold_hours,
                  overtime_multiplier,
                  to_char(effective_from, 'YYYY-MM-DD') AS effective_from,
                  is_active, created_at, updated_at
      `;

      const res = await client.query(sql, params);
      return res.rows[0];
    });
  }

  async deletePolicy(companyId: string, id: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `UPDATE attendance_policies
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id`,
        [companyId, id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'POLICY_NOT_FOUND',
          message: 'Attendance policy not found',
        });
      }
      return { message: 'Attendance policy deactivated successfully' };
    });
  }

  /**
   * Find the effective policy for a given project (or company general) on a given date
   */
  async getEffectivePolicy(
    companyId: string,
    projectId: string | null,
    dateStr: string,
    externalClient?: any,
  ): Promise<AttendancePolicy> {
    const run = async (client: any) => {
      // 1. If project specified, check for project-specific policy
      if (projectId) {
        const projSql = `
          SELECT ap.id, ap.company_id, ap.project_id,
                 to_char(ap.shift_start_time, 'HH24:MI') AS shift_start_time,
                 to_char(ap.shift_end_time, 'HH24:MI') AS shift_end_time,
                 ap.grace_minutes, ap.break_minutes,
                 ap.overtime_threshold_hours, ap.overtime_multiplier,
                 to_char(ap.effective_from, 'YYYY-MM-DD') AS effective_from,
                 ap.is_active, ap.created_at, ap.updated_at,
                 p.name AS project_name
          FROM attendance_policies ap
          LEFT JOIN projects p ON ap.project_id = p.id AND ap.company_id = p.company_id
          WHERE ap.company_id = $1
            AND ap.project_id = $2
            AND ap.effective_from <= $3
            AND ap.is_active = true
          ORDER BY ap.effective_from DESC, ap.created_at DESC
          LIMIT 1
        `;
        const projRes = await client.query(projSql, [companyId, projectId, dateStr]);
        if (projRes.rows.length > 0) {
          return projRes.rows[0];
        }
      }

      // 2. Company general policy effective on/before date
      const generalSql = `
        SELECT ap.id, ap.company_id, ap.project_id,
               to_char(ap.shift_start_time, 'HH24:MI') AS shift_start_time,
               to_char(ap.shift_end_time, 'HH24:MI') AS shift_end_time,
               ap.grace_minutes, ap.break_minutes,
               ap.overtime_threshold_hours, ap.overtime_multiplier,
               to_char(ap.effective_from, 'YYYY-MM-DD') AS effective_from,
               ap.is_active, ap.created_at, ap.updated_at,
               NULL AS project_name
        FROM attendance_policies ap
        WHERE ap.company_id = $1
          AND ap.project_id IS NULL
          AND ap.effective_from <= $2
          AND ap.is_active = true
        ORDER BY ap.effective_from DESC, ap.created_at DESC
        LIMIT 1
      `;
      const generalRes = await client.query(generalSql, [companyId, dateStr]);
      if (generalRes.rows.length > 0) {
        return generalRes.rows[0];
      }

      // 3. Fallback: any active policy or default
      const fallbackSql = `
        SELECT ap.id, ap.company_id, ap.project_id,
               to_char(ap.shift_start_time, 'HH24:MI') AS shift_start_time,
               to_char(ap.shift_end_time, 'HH24:MI') AS shift_end_time,
               ap.grace_minutes, ap.break_minutes,
               ap.overtime_threshold_hours, ap.overtime_multiplier,
               to_char(ap.effective_from, 'YYYY-MM-DD') AS effective_from,
               ap.is_active, ap.created_at, ap.updated_at,
               NULL AS project_name
        FROM attendance_policies ap
        WHERE ap.company_id = $1 AND ap.is_active = true
        ORDER BY ap.created_at ASC
        LIMIT 1
      `;
      const fallbackRes = await client.query(fallbackSql, [companyId]);
      if (fallbackRes.rows.length > 0) {
        return fallbackRes.rows[0];
      }

      return {
        id: 'default',
        company_id: companyId,
        project_id: null,
        project_name: null,
        shift_start_time: '08:00',
        shift_end_time: '17:00',
        grace_minutes: 15,
        break_minutes: 60,
        overtime_threshold_hours: 8.0,
        overtime_multiplier: 1.5,
        effective_from: '2020-01-01',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    };

    if (externalClient) {
      return run(externalClient);
    }
    return this.db.withTenantClient(companyId, run);
  }
}
