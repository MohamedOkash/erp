import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ScopeService } from '../common/services/scope.service';
import { AuthenticatedUser } from '../auth/auth.service';
import { ApproveProductionDto } from './dto/approve-production.dto';
import { CreateProductionDto } from './dto/create-production.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { QueryProductionDto } from './dto/query-production.dto';

@Injectable()
export class ProductionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * Create production record with R5 worker sum verification (Section 3 & 4 & 9 of HANDOFF.md)
   */
  async createProductionRecord(
    companyId: string,
    dto: CreateProductionDto,
    user?: AuthenticatedUser,
  ) {
    if (user) {
      await this.scopeService.assertProjectInScope(user, dto.projectId);
    }
    // R5 validation: For individual production, sum of worker quantities must equal actual quantity
    if (dto.productionType === 'individual') {
      const workerSum = (dto.workers || []).reduce(
        (sum, w) => sum + (Number(w.individualQuantity) || 0),
        0,
      );
      if (Math.abs(workerSum - Number(dto.actualQuantity)) > 0.001) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message:
              'Total individual worker quantities must equal actual quantity exactly',
            code: 'WORKER_SUM_MISMATCH',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return this.db.withTenantTransaction(companyId, async (client) => {
      // If targetQuantity not provided but workItemStageId is, suggest standard_productivity
      let targetQuantity = dto.targetQuantity || 0;
      if (!targetQuantity && dto.workItemStageId) {
        const stageRes = await client.query(
          `SELECT standard_productivity FROM work_item_stages WHERE id = $1 AND company_id = $2`,
          [dto.workItemStageId, companyId],
        );
        if (stageRes.rows.length > 0 && stageRes.rows[0].standard_productivity) {
          targetQuantity = parseFloat(stageRes.rows[0].standard_productivity);
        }
      }

      // 1. Insert into production_records
      const insertRecordRes = await client.query(
        `INSERT INTO production_records (
          company_id, branch_id, project_id, work_item_id, work_item_stage_id, work_area_id,
          date, production_type, actual_quantity, target_quantity, team_code,
          supervisor_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft')
        RETURNING id, company_id, branch_id, project_id, work_item_id, work_item_stage_id, work_area_id,
                  date, production_type, actual_quantity, target_quantity, team_code,
                  supervisor_id, engineer_id, status, created_at, updated_at`,
        [
          companyId,
          dto.branchId,
          dto.projectId,
          dto.workItemId,
          dto.workItemStageId || null,
          dto.workAreaId || null,
          dto.date,
          dto.productionType,
          dto.actualQuantity,
          targetQuantity,
          dto.teamCode || null,
          dto.supervisorId,
        ],
      );

      const record = insertRecordRes.rows[0];

      // 2. Insert workers
      const insertedWorkers = [];
      if (dto.workers && dto.workers.length > 0) {
        for (const worker of dto.workers) {
          const workerType =
            worker.workerType ||
            (dto.productionType === 'team' ? 'team' : 'individual');
          const isEstimated =
            worker.isEstimated !== undefined
              ? worker.isEstimated
              : dto.productionType === 'team';

          const insertWorkerRes = await client.query(
            `INSERT INTO production_workers (
              company_id, production_record_id, employee_id, worker_type,
              individual_quantity, hours_worked, overtime_hours, bonus_percentage, skill_level, is_estimated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, company_id, production_record_id, employee_id,
                      worker_type, individual_quantity, hours_worked, overtime_hours, bonus_percentage, skill_level, is_estimated`,
            [
              companyId,
              record.id,
              worker.employeeId,
              workerType,
              worker.individualQuantity || 0,
              worker.hoursWorked || 8,
              worker.overtimeHours || 0,
              worker.bonusPercentage || 0,
              worker.skillLevel || null,
              isEstimated,
            ],
          );
          insertedWorkers.push(insertWorkerRes.rows[0]);
        }
      }

      return {
        ...record,
        workers: insertedWorkers,
      };
    });
  }

  /**
   * Query production records with filters (Section 9 of HANDOFF.md)
   */
  async findProductionRecords(
    companyId: string,
    query: QueryProductionDto,
    user?: AuthenticatedUser,
  ) {
    if (user && query.projectId) {
      await this.scopeService.assertProjectInScope(user, query.projectId);
    }

    const projectScope = user ? await this.scopeService.getProjectScope(user) : null;

    return this.db.withTenantTransaction(companyId, async (client) => {
      const conditions: string[] = ['pr.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (projectScope !== null) {
        if (projectScope.length === 0) {
          return [];
        }
        conditions.push(`pr.project_id = ANY($${paramIdx++}::uuid[])`);
        params.push(projectScope);
      }

      if (query.fromDate) {
        conditions.push(`pr.date >= $${paramIdx++}`);
        params.push(query.fromDate);
      }
      if (query.toDate) {
        conditions.push(`pr.date <= $${paramIdx++}`);
        params.push(query.toDate);
      }
      if (query.branchId) {
        conditions.push(`pr.branch_id = $${paramIdx++}`);
        params.push(query.branchId);
      }
      if (query.projectId) {
        conditions.push(`pr.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }
      if (query.status) {
        conditions.push(`pr.status = $${paramIdx++}`);
        params.push(query.status);
      }

      const sql = `
        SELECT pr.id, pr.company_id, pr.branch_id, b.name AS branch_name,
               pr.project_id, p.name AS project_name,
               pr.work_item_id, wi.name AS work_item_name, wi.code AS work_item_code,
               pr.work_item_stage_id, wis.name AS stage_name, wis.code AS stage_code, wis.percentage AS stage_percentage,
               pr.work_area_id, wa.name AS work_area_name,
               pr.date, pr.production_type, pr.actual_quantity, pr.target_quantity,
               pr.team_code, pr.supervisor_id, sup.name AS supervisor_name,
               pr.engineer_id, eng.name AS engineer_name,
               pr.status, pr.rejection_reason, pr.submitted_at,
               pr.supervisor_approved_at, pr.engineer_approved_at, pr.final_approved_at,
               pr.created_at, pr.updated_at
        FROM production_records pr
        JOIN branches b ON pr.branch_id = b.id AND pr.company_id = b.company_id
        JOIN projects p ON pr.project_id = p.id AND pr.company_id = p.company_id
        JOIN work_items wi ON pr.work_item_id = wi.id AND pr.company_id = wi.company_id
        LEFT JOIN work_item_stages wis ON pr.work_item_stage_id = wis.id AND pr.company_id = wis.company_id
        LEFT JOIN work_areas wa ON pr.work_area_id = wa.id AND pr.company_id = wa.company_id
        LEFT JOIN employees sup ON pr.supervisor_id = sup.id AND pr.company_id = sup.company_id
        LEFT JOIN employees eng ON pr.engineer_id = eng.id AND pr.company_id = eng.company_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY pr.date DESC, pr.created_at DESC
      `;

      const recordsRes = await client.query(sql, params);
      const records = recordsRes.rows;

      if (records.length === 0) {
        return [];
      }

      // Fetch workers for these records
      const recordIds = records.map((r) => r.id);
      const workersRes = await client.query(
        `SELECT pw.id, pw.production_record_id, pw.employee_id, e.name AS employee_name,
                e.code AS employee_code, pw.worker_type, pw.individual_quantity,
                pw.hours_worked, pw.overtime_hours, pw.bonus_percentage, pw.skill_level, pw.is_estimated
         FROM production_workers pw
         JOIN employees e ON pw.employee_id = e.id AND pw.company_id = e.company_id
         WHERE pw.production_record_id = ANY($1::uuid[]) AND pw.company_id = $2`,
        [recordIds, companyId],
      );

      const workersByRecord = new Map<string, any[]>();
      for (const w of workersRes.rows) {
        if (!workersByRecord.has(w.production_record_id)) {
          workersByRecord.set(w.production_record_id, []);
        }
        workersByRecord.get(w.production_record_id).push(w);
      }

      return records.map((r) => ({
        ...r,
        workers: workersByRecord.get(r.id) || [],
      }));
    });
  }

  /**
   * Get weighted progress from view v_boq_progress_weighted
   */
  async getWeightedProgress(companyId: string, projectId?: string, user?: AuthenticatedUser) {
    if (user && projectId) {
      await this.scopeService.assertProjectInScope(user, projectId);
    }
    const projectScope = user ? await this.scopeService.getProjectScope(user) : null;

    return this.db.withTenantClient(companyId, async (client) => {
      let sql = `SELECT * FROM v_boq_progress_weighted WHERE company_id = $1`;
      const params: any[] = [companyId];
      let pIdx = 2;
      if (projectId) {
        sql += ` AND project_id = $${pIdx++}`;
        params.push(projectId);
      } else if (projectScope !== null) {
        if (projectScope.length === 0) {
          return [];
        }
        sql += ` AND project_id = ANY($${pIdx++}::uuid[])`;
        params.push(projectScope);
      }
      const res = await client.query(sql, params);
      return res.rows;
    });
  }

  /**
   * Request correction on a locked production record (status must be final_approved)
   */
  async requestCorrection(
    companyId: string,
    recordId: string,
    dto: CreateCorrectionDto,
  ) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const recordRes = await client.query(
        `SELECT id, status FROM production_records WHERE id = $1`,
        [recordId],
      );

      if (recordRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'PRODUCTION_RECORD_NOT_FOUND',
          message: `Production record with id '${recordId}' not found`,
        });
      }

      const record = recordRes.rows[0];

      if (record.status !== 'final_approved') {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            message: 'Only final_approved records can be corrected',
            code: 'RECORD_NOT_LOCKED',
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const insertCorrectionRes = await client.query(
        `INSERT INTO production_corrections (
          company_id, production_record_id, correction_type, adjustment_quantity,
          reason, status
        ) VALUES ($1, $2, $3, $4, $5, 'submitted')
        RETURNING id, company_id, production_record_id, correction_type,
                  adjustment_quantity, reason, status, created_at, updated_at`,
        [companyId, recordId, dto.type, dto.delta || 0, dto.reason],
      );

      return insertCorrectionRes.rows[0];
    });
  }

  /**
   * Approve production record step-by-step per State Machine (Section 3 & 4 of HANDOFF.md)
   * 1) draft -> submitted (any role)
   * 2) submitted -> supervisor_approved (supervisor only)
   * 3) supervisor_approved -> engineer_approved (engineer only)
   * 4) engineer_approved -> final_approved (admin only)
   */
  async approveProductionRecord(
    companyId: string,
    recordId: string,
    dto: ApproveProductionDto,
    userRoles: string[] = [],
  ) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const recordRes = await client.query(
        `SELECT id, company_id, branch_id, project_id, work_item_id, work_area_id,
                date, production_type, actual_quantity, target_quantity, status
         FROM production_records
         WHERE id = $1`,
        [recordId],
      );

      if (recordRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'PRODUCTION_RECORD_NOT_FOUND',
          message: `Production record with id '${recordId}' not found`,
        });
      }

      const record = recordRes.rows[0];
      const currentStatus = record.status;
      let nextStatus: string;
      let timestampColumn: string;

      switch (dto.step) {
        case 'submit':
          if (currentStatus !== 'draft') {
            throw new HttpException(
              {
                statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                message: `Invalid state machine transition: cannot submit record from status '${currentStatus}'`,
                code: 'INVALID_TRANSITION',
              },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          }
          nextStatus = 'submitted';
          timestampColumn = 'submitted_at';
          break;

        case 'supervisor':
          // Phase 1: Supervisors are removed from approval chain; they only submit.
          throw new HttpException(
            {
              statusCode: HttpStatus.FORBIDDEN,
              message: 'Supervisors cannot approve production records; they can only submit.',
              code: 'ROLE_NOT_AUTHORIZED_FOR_APPROVAL',
            },
            HttpStatus.FORBIDDEN,
          );

        case 'engineer':
          const canEngineerApprove = userRoles.some((r) =>
            ['engineer', 'project_manager', 'program_manager', 'admin', 'company_admin', 'super_admin'].includes(r),
          );
          if (!canEngineerApprove) {
            throw new HttpException(
              {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Role not authorized for engineer approval. Engineer or Manager role required.',
                code: 'ROLE_NOT_AUTHORIZED_FOR_APPROVAL',
              },
              HttpStatus.FORBIDDEN,
            );
          }
          if (currentStatus !== 'submitted' && currentStatus !== 'supervisor_approved') {
            throw new HttpException(
              {
                statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                message: `Invalid state machine transition: cannot approve as engineer from status '${currentStatus}'`,
                code: 'INVALID_TRANSITION',
              },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          }
          nextStatus = 'engineer_approved';
          timestampColumn = 'engineer_approved_at';
          break;

        case 'final':
          const canFinalApprove = userRoles.some((r) =>
            ['project_manager', 'program_manager', 'admin', 'company_admin', 'super_admin'].includes(r),
          );
          if (!canFinalApprove) {
            throw new HttpException(
              {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Role not authorized for final approval. Project Manager, Program Manager or Admin role required.',
                code: 'ROLE_NOT_AUTHORIZED_FOR_APPROVAL',
              },
              HttpStatus.FORBIDDEN,
            );
          }
          if (currentStatus !== 'engineer_approved') {
            throw new HttpException(
              {
                statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                message: `Invalid state machine transition: cannot give final approval from status '${currentStatus}'`,
                code: 'INVALID_TRANSITION',
              },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          }
          nextStatus = 'final_approved';
          timestampColumn = 'final_approved_at';
          break;

        default:
          throw new HttpException(
            {
              statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
              message: `Unknown approval step '${dto.step}'`,
              code: 'INVALID_TRANSITION',
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
      }

      const updateRes = await client.query(
        `UPDATE production_records
         SET status = $1,
             ${timestampColumn} = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, company_id, branch_id, project_id, work_item_id, work_area_id,
                   date, production_type, actual_quantity, target_quantity, status`,
        [nextStatus, recordId],
      );

      return updateRes.rows[0];
    });
  }
}
