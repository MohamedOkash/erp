import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly db: DatabaseService) {}

  private parseTimeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':').map((p) => parseInt(p, 10));
    return parts[0] * 60 + (parts[1] || 0);
  }

  /**
   * Create a new attendance record for an employee
   */
  async createAttendance(
    companyId: string,
    userId: string,
    dto: CreateAttendanceDto,
  ) {
    if (dto.checkInTime && dto.checkOutTime) {
      const inMins = this.parseTimeToMinutes(dto.checkInTime);
      const outMins = this.parseTimeToMinutes(dto.checkOutTime);
      if (outMins <= inMins) {
        throw new BadRequestException({
          code: 'INVALID_TIME_RANGE',
          message: 'Check-out time must be after check-in time',
        });
      }
    }

    return this.db.withTenantTransaction(companyId, async (client) => {
      // Validate employee exists
      const empRes = await client.query(
        `SELECT id FROM employees WHERE company_id = $1 AND id = $2`,
        [companyId, dto.employeeId],
      );
      if (empRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'EMPLOYEE_NOT_FOUND',
          message: 'Employee not found',
        });
      }

      // Validate branch exists
      const branchRes = await client.query(
        `SELECT id FROM branches WHERE company_id = $1 AND id = $2`,
        [companyId, dto.branchId],
      );
      if (branchRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'BRANCH_NOT_FOUND',
          message: 'Branch not found',
        });
      }

      // Validate project exists
      const projectRes = await client.query(
        `SELECT id FROM projects WHERE company_id = $1 AND id = $2`,
        [companyId, dto.projectId],
      );
      if (projectRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Validate status exists
      const statusRes = await client.query(
        `SELECT id FROM attendance_statuses WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)`,
        [dto.statusId, companyId],
      );
      if (statusRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'STATUS_NOT_FOUND',
          message: 'Attendance status not found',
        });
      }

      // Check unique constraint (company_id, employee_id, date)
      const existingRes = await client.query(
        `SELECT id FROM attendance WHERE company_id = $1 AND employee_id = $2 AND date = $3`,
        [companyId, dto.employeeId, dto.date],
      );
      if (existingRes.rows.length > 0) {
        throw new ConflictException({
          code: 'ATTENDANCE_ALREADY_EXISTS',
          message: 'Attendance already recorded for this employee on this date',
        });
      }

      const insertRes = await client.query(
        `INSERT INTO attendance (
           company_id, employee_id, project_id, branch_id, date, status_id,
           check_in_time, check_out_time, overtime_hours, recorded_by, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, company_id, employee_id, project_id, branch_id,
                   to_char(date, 'YYYY-MM-DD') AS date,
                   status_id,
                   to_char(check_in_time, 'HH24:MI') AS check_in_time,
                   to_char(check_out_time, 'HH24:MI') AS check_out_time,
                   overtime_hours, recorded_by, notes, created_at, updated_at`,
        [
          companyId,
          dto.employeeId,
          dto.projectId,
          dto.branchId,
          dto.date,
          dto.statusId,
          dto.checkInTime || null,
          dto.checkOutTime || null,
          dto.overtimeHours || 0,
          userId || null,
          dto.notes || null,
        ],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * Find attendance records with filtering and pagination
   */
  async findAttendance(companyId: string, query: QueryAttendanceDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['a.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.fromDate) {
        conditions.push(`a.date >= $${paramIdx++}`);
        params.push(query.fromDate);
      }
      if (query.toDate) {
        conditions.push(`a.date <= $${paramIdx++}`);
        params.push(query.toDate);
      }
      if (query.employeeId) {
        conditions.push(`a.employee_id = $${paramIdx++}`);
        params.push(query.employeeId);
      }
      if (query.branchId) {
        conditions.push(`a.branch_id = $${paramIdx++}`);
        params.push(query.branchId);
      }
      if (query.projectId) {
        conditions.push(`a.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }
      if (query.statusId) {
        conditions.push(`a.status_id = $${paramIdx++}`);
        params.push(query.statusId);
      }

      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const whereClause = conditions.join(' AND ');

      // Total count query
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM attendance a WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      // Data query
      const dataSql = `
        SELECT a.id, a.company_id, a.employee_id, a.project_id, a.branch_id,
               to_char(a.date, 'YYYY-MM-DD') AS date,
               a.status_id,
               to_char(a.check_in_time, 'HH24:MI') AS check_in_time,
               to_char(a.check_out_time, 'HH24:MI') AS check_out_time,
               a.overtime_hours, a.recorded_by, a.notes, a.created_at, a.updated_at,
               e.name AS employee_name, e.national_id,
               b.name AS branch_name,
               p.name AS project_name,
               ast.name AS status_name, ast.code AS status_code
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id AND a.company_id = e.company_id
        JOIN branches b ON a.branch_id = b.id AND a.company_id = b.company_id
        JOIN projects p ON a.project_id = p.id AND a.company_id = p.company_id
        JOIN attendance_statuses ast ON a.status_id = ast.id
        WHERE ${whereClause}
        ORDER BY a.date DESC, a.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      const dataRes = await client.query(dataSql, [...params, limit, offset]);

      return {
        data: dataRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      };
    });
  }

  /**
   * Get single attendance record by ID
   */
  async getAttendanceById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const sql = `
        SELECT a.id, a.company_id, a.employee_id, a.project_id, a.branch_id,
               to_char(a.date, 'YYYY-MM-DD') AS date,
               a.status_id,
               to_char(a.check_in_time, 'HH24:MI') AS check_in_time,
               to_char(a.check_out_time, 'HH24:MI') AS check_out_time,
               a.overtime_hours, a.recorded_by, a.notes, a.created_at, a.updated_at,
               e.name AS employee_name, e.national_id,
               b.name AS branch_name,
               p.name AS project_name,
               ast.name AS status_name, ast.code AS status_code
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id AND a.company_id = e.company_id
        JOIN branches b ON a.branch_id = b.id AND a.company_id = b.company_id
        JOIN projects p ON a.project_id = p.id AND a.company_id = p.company_id
        JOIN attendance_statuses ast ON a.status_id = ast.id
        WHERE a.company_id = $1 AND a.id = $2
      `;
      const res = await client.query(sql, [companyId, id]);
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'ATTENDANCE_NOT_FOUND',
          message: 'Attendance record not found',
        });
      }
      return res.rows[0];
    });
  }

  /**
   * Update attendance record
   */
  async updateAttendance(
    companyId: string,
    id: string,
    dto: UpdateAttendanceDto,
  ) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const currentRes = await client.query(
        `SELECT * FROM attendance WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (currentRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'ATTENDANCE_NOT_FOUND',
          message: 'Attendance record not found',
        });
      }

      const current = currentRes.rows[0];
      const checkIn = dto.checkInTime !== undefined ? dto.checkInTime : current.check_in_time;
      const checkOut = dto.checkOutTime !== undefined ? dto.checkOutTime : current.check_out_time;

      if (checkIn && checkOut) {
        const inMins = this.parseTimeToMinutes(checkIn);
        const outMins = this.parseTimeToMinutes(checkOut);
        if (outMins <= inMins) {
          throw new BadRequestException({
            code: 'INVALID_TIME_RANGE',
            message: 'Check-out time must be after check-in time',
          });
        }
      }

      // If employee or date changed, check unique conflict
      const targetEmp = dto.employeeId || current.employee_id;
      const targetDate = dto.date || current.date;
      if (targetEmp !== current.employee_id || targetDate !== current.date) {
        const dupRes = await client.query(
          `SELECT id FROM attendance WHERE company_id = $1 AND employee_id = $2 AND date = $3 AND id != $4`,
          [companyId, targetEmp, targetDate, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'ATTENDANCE_ALREADY_EXISTS',
            message: 'Attendance already recorded for this employee on this date',
          });
        }
      }

      const updateRes = await client.query(
        `UPDATE attendance
         SET employee_id = COALESCE($3, employee_id),
             project_id = COALESCE($4, project_id),
             branch_id = COALESCE($5, branch_id),
             date = COALESCE($6, date),
             status_id = COALESCE($7, status_id),
             check_in_time = CASE WHEN $8::text IS NOT NULL THEN $8::time ELSE check_in_time END,
             check_out_time = CASE WHEN $9::text IS NOT NULL THEN $9::time ELSE check_out_time END,
             overtime_hours = COALESCE($10, overtime_hours),
             notes = COALESCE($11, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, employee_id, project_id, branch_id,
                   to_char(date, 'YYYY-MM-DD') AS date,
                   status_id,
                   to_char(check_in_time, 'HH24:MI') AS check_in_time,
                   to_char(check_out_time, 'HH24:MI') AS check_out_time,
                   overtime_hours, recorded_by, notes, created_at, updated_at`,
        [
          companyId,
          id,
          dto.employeeId || null,
          dto.projectId || null,
          dto.branchId || null,
          dto.date || null,
          dto.statusId || null,
          dto.checkInTime !== undefined ? dto.checkInTime : null,
          dto.checkOutTime !== undefined ? dto.checkOutTime : null,
          dto.overtimeHours !== undefined ? dto.overtimeHours : null,
          dto.notes !== undefined ? dto.notes : null,
        ],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM attendance WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'ATTENDANCE_NOT_FOUND',
          message: 'Attendance record not found',
        });
      }
    });
  }
}
