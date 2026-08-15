import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ApproveProductionDto } from './dto/approve-production.dto';
import { CreateProductionDto } from './dto/create-production.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { QueryProductionDto } from './dto/query-production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create production record with R5 worker sum verification (Section 3 & 4 & 9 of HANDOFF.md)
   */
  async createProductionRecord(companyId: string, dto: CreateProductionDto) {
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
      // 1. Insert into production_records
      const insertRecordRes = await client.query(
        `INSERT INTO production_records (
          company_id, branch_id, project_id, work_item_id, work_area_id,
          date, production_type, actual_quantity, target_quantity, team_code,
          supervisor_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
        RETURNING id, company_id, branch_id, project_id, work_item_id, work_area_id,
                  date, production_type, actual_quantity, target_quantity, team_code,
                  supervisor_id, engineer_id, status, created_at, updated_at`,
        [
          companyId,
          dto.branchId,
          dto.projectId,
          dto.workItemId,
          dto.workAreaId || null,
          dto.date,
          dto.productionType,
          dto.actualQuantity,
          dto.targetQuantity || 0,
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
              individual_quantity, hours_worked, is_estimated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, company_id, production_record_id, employee_id,
                      worker_type, individual_quantity, hours_worked, is_estimated`,
            [
              companyId,
              record.id,
              worker.employeeId,
              workerType,
              worker.individualQuantity || 0,
              worker.hoursWorked || 8,
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
  async findProductionRecords(companyId: string, query: QueryProductionDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const conditions: string[] = ['pr.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

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
                pw.hours_worked, pw.is_estimated
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
        throw new NotFoundException(`Production record with id '${recordId}' not found`);
      }

      const record = recordRes.rows[0];

      if (record.status !== 'final_approved') {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message:
              "Corrections can only be requested on locked records with status 'final_approved'",
            code: 'RECORD_NOT_LOCKED',
          },
          HttpStatus.BAD_REQUEST,
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
   */
  async approveProductionRecord(
    companyId: string,
    recordId: string,
    dto: ApproveProductionDto,
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
        throw new NotFoundException(`Production record with id '${recordId}' not found`);
      }

      const record = recordRes.rows[0];
      const currentStatus = record.status;
      let nextStatus: string;
      let timestampColumn: string;

      switch (dto.step) {
        case 'supervisor':
          if (currentStatus !== 'submitted') {
            throw new HttpException(
              {
                statusCode: HttpStatus.BAD_REQUEST,
                message: `Invalid state machine transition: cannot approve as supervisor from status '${currentStatus}'`,
                code: 'INVALID_TRANSITION',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          nextStatus = 'supervisor_approved';
          timestampColumn = 'supervisor_approved_at';
          break;

        case 'engineer':
          if (currentStatus !== 'supervisor_approved') {
            throw new HttpException(
              {
                statusCode: HttpStatus.BAD_REQUEST,
                message: `Invalid state machine transition: cannot approve as engineer from status '${currentStatus}'`,
                code: 'INVALID_TRANSITION',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          nextStatus = 'engineer_approved';
          timestampColumn = 'engineer_approved_at';
          break;

        case 'final':
          if (currentStatus !== 'engineer_approved') {
            throw new HttpException(
              {
                statusCode: HttpStatus.BAD_REQUEST,
                message: `Invalid state machine transition: cannot give final approval from status '${currentStatus}'`,
                code: 'INVALID_TRANSITION',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          nextStatus = 'final_approved';
          timestampColumn = 'final_approved_at';
          break;

        default:
          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: `Unknown approval step '${dto.step}'`,
              code: 'INVALID_TRANSITION',
            },
            HttpStatus.BAD_REQUEST,
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
