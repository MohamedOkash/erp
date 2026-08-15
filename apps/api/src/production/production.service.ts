import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ApproveProductionDto } from './dto/approve-production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Approve production record step-by-step per State Machine (Section 3 & 4 of HANDOFF.md)
   * Valid transitions:
   * - 'supervisor': submitted -> supervisor_approved
   * - 'engineer': supervisor_approved -> engineer_approved
   * - 'final': engineer_approved -> final_approved
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
