import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ScopeService } from '../common/services/scope.service';
import { AuthenticatedUser } from '../auth/auth.service';
import { RequestTransferDto } from './dto/request-transfer.dto';
import { RejectTransferDto } from './dto/approve-transfer.dto';
import { QueryTransfersDto } from './dto/query-transfers.dto';

@Injectable()
export class TransfersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly scopeService: ScopeService,
  ) {}

  async findTransfers(
    companyId: string,
    query: QueryTransfersDto,
    user?: AuthenticatedUser,
  ) {
    if (user && query.projectId) {
      await this.scopeService.assertProjectInScope(user, query.projectId);
    }
    const projectScope = user ? await this.scopeService.getProjectScope(user) : null;

    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['t.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (projectScope !== null) {
        if (projectScope.length === 0) {
          return { data: [], total: 0, page: 1, limit: query.limit || 20, totalPages: 0 };
        }
        conditions.push(`(t.from_project_id = ANY($${paramIdx}::uuid[]) OR t.to_project_id = ANY($${paramIdx}::uuid[]))`);
        params.push(projectScope);
        paramIdx++;
      }

      if (query.status) {
        conditions.push(`t.status = $${paramIdx++}`);
        params.push(query.status);
      }

      if (query.employeeId) {
        conditions.push(`t.employee_id = $${paramIdx++}`);
        params.push(query.employeeId);
      }

      if (query.projectId) {
        conditions.push(`(t.from_project_id = $${paramIdx} OR t.to_project_id = $${paramIdx})`);
        params.push(query.projectId);
        paramIdx++;
      }

      if (query.urgency) {
        conditions.push(`t.urgency = $${paramIdx++}`);
        params.push(query.urgency);
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM staff_transfers t WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          t.id, t.company_id, t.employee_id, t.from_project_id, t.from_area_id,
          t.to_project_id, t.to_area_id, t.requested_by, t.requested_role,
          t.reason, t.urgency, t.status, t.approved_by, t.approved_at,
          t.executed_at, t.transfer_date, t.created_at, t.updated_at,
          e.name AS employee_name, e.code AS employee_code, e.role_type AS employee_role,
          fp.name AS from_project_name,
          tp.name AS to_project_name,
          u.full_name AS requester_name,
          au.full_name AS approver_name
        FROM staff_transfers t
        JOIN employees e ON t.employee_id = e.id AND t.company_id = e.company_id
        LEFT JOIN projects fp ON t.from_project_id = fp.id AND t.company_id = fp.company_id
        JOIN projects tp ON t.to_project_id = tp.id AND t.company_id = tp.company_id
        LEFT JOIN users u ON t.requested_by = u.id
        LEFT JOIN users au ON t.approved_by = au.id
        WHERE ${whereClause}
        ORDER BY t.created_at DESC
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

  async getTransferById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT 
          t.id, t.company_id, t.employee_id, t.from_project_id, t.from_area_id,
          t.to_project_id, t.to_area_id, t.requested_by, t.requested_role,
          t.reason, t.urgency, t.status, t.approved_by, t.approved_at,
          t.executed_at, t.transfer_date, t.created_at, t.updated_at,
          e.name AS employee_name, e.code AS employee_code, e.role_type AS employee_role,
          fp.name AS from_project_name,
          tp.name AS to_project_name,
          u.full_name AS requester_name,
          au.full_name AS approver_name
        FROM staff_transfers t
        JOIN employees e ON t.employee_id = e.id AND t.company_id = e.company_id
        LEFT JOIN projects fp ON t.from_project_id = fp.id AND t.company_id = fp.company_id
        JOIN projects tp ON t.to_project_id = tp.id AND t.company_id = tp.company_id
        LEFT JOIN users u ON t.requested_by = u.id
        LEFT JOIN users au ON t.approved_by = au.id
        WHERE t.company_id = $1 AND t.id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'TRANSFER_NOT_FOUND',
          message: `Transfer record with id '${id}' not found`,
        });
      }

      return res.rows[0];
    });
  }

  async requestTransfer(
    companyId: string,
    userId: string,
    primaryRole: string,
    dto: RequestTransferDto,
    user?: AuthenticatedUser,
  ) {
    if (user && dto.fromProjectId) {
      await this.scopeService.assertProjectInScope(user, dto.fromProjectId);
    }
    return this.db.withTenantTransaction(companyId, async (client) => {
      // 1. Verify employee exists and fetch active assignment
      const empRes = await client.query(
        `SELECT id, name, role_type, primary_branch_id FROM employees WHERE company_id = $1 AND id = $2`,
        [companyId, dto.employeeId],
      );
      if (empRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'EMPLOYEE_NOT_FOUND',
          message: 'Employee not found',
        });
      }

      let fromProjectId = dto.fromProjectId;
      if (!fromProjectId) {
        const assignRes = await client.query(
          `SELECT project_id FROM employee_assignments WHERE company_id = $1 AND employee_id = $2 AND is_active = true ORDER BY start_date DESC LIMIT 1`,
          [companyId, dto.employeeId],
        );
        if (assignRes.rows.length > 0) {
          fromProjectId = assignRes.rows[0].project_id;
        }
      }

      const transferDate = dto.transferDate || new Date().toISOString().split('T')[0];

      const insertRes = await client.query(
        `INSERT INTO staff_transfers (
           company_id, employee_id, from_project_id, from_area_id,
           to_project_id, to_area_id, requested_by, requested_role,
           reason, urgency, status, transfer_date
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
         RETURNING *`,
        [
          companyId,
          dto.employeeId,
          fromProjectId || null,
          dto.fromAreaId || null,
          dto.toProjectId,
          dto.toAreaId || null,
          userId,
          primaryRole,
          dto.reason || null,
          dto.urgency || 'normal',
          transferDate,
        ],
      );

      return insertRes.rows[0];
    });
  }

  async approveTransfer(companyId: string, userId: string, transferId: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT id, status FROM staff_transfers WHERE company_id = $1 AND id = $2`,
        [companyId, transferId],
      );

      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'TRANSFER_NOT_FOUND',
          message: 'Transfer record not found',
        });
      }

      if (curRes.rows[0].status !== 'pending') {
        throw new BadRequestException({
          code: 'INVALID_TRANSFER_STATE',
          message: `Cannot approve transfer in status '${curRes.rows[0].status}'`,
        });
      }

      const updateRes = await client.query(
        `UPDATE staff_transfers
         SET status = 'approved',
             approved_by = $3,
             approved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING *`,
        [companyId, transferId, userId],
      );

      return updateRes.rows[0];
    });
  }

  async rejectTransfer(
    companyId: string,
    userId: string,
    transferId: string,
    dto: RejectTransferDto,
  ) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT id, status, reason FROM staff_transfers WHERE company_id = $1 AND id = $2`,
        [companyId, transferId],
      );

      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'TRANSFER_NOT_FOUND',
          message: 'Transfer record not found',
        });
      }

      if (curRes.rows[0].status !== 'pending') {
        throw new BadRequestException({
          code: 'INVALID_TRANSFER_STATE',
          message: `Cannot reject transfer in status '${curRes.rows[0].status}'`,
        });
      }

      const rejectionText = dto?.rejectionReason
        ? `${curRes.rows[0].reason || ''} [Rejected: ${dto.rejectionReason}]`.trim()
        : curRes.rows[0].reason;

      const updateRes = await client.query(
        `UPDATE staff_transfers
         SET status = 'rejected',
             approved_by = $3,
             reason = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING *`,
        [companyId, transferId, userId, rejectionText],
      );

      return updateRes.rows[0];
    });
  }

  async executeTransfer(companyId: string, userId: string, transferId: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT id, employee_id, to_project_id, to_area_id, status FROM staff_transfers WHERE company_id = $1 AND id = $2`,
        [companyId, transferId],
      );

      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'TRANSFER_NOT_FOUND',
          message: 'Transfer record not found',
        });
      }

      const transfer = curRes.rows[0];

      // Update transfer status to executed
      const updateRes = await client.query(
        `UPDATE staff_transfers
         SET status = 'executed',
             executed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING *`,
        [companyId, transferId],
      );

      // Deactivate old assignment for employee in employee_assignments
      await client.query(
        `UPDATE employee_assignments
         SET is_active = false,
             end_date = CURRENT_DATE,
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND employee_id = $2 AND is_active = true`,
        [companyId, transfer.employee_id],
      );

      // Fetch employee branch
      const empRes = await client.query(
        `SELECT primary_branch_id, role_type FROM employees WHERE company_id = $1 AND id = $2`,
        [companyId, transfer.employee_id],
      );
      const branchId = empRes.rows[0]?.primary_branch_id;
      const roleType = empRes.rows[0]?.role_type || 'فني';

      // Insert new active assignment
      await client.query(
        `INSERT INTO employee_assignments (
           id, company_id, employee_id, project_id, branch_id, assigned_role, start_date, is_active
         ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_DATE, true)`,
        [companyId, transfer.employee_id, transfer.to_project_id, branchId, roleType],
      );

      return updateRes.rows[0];
    });
  }
}
