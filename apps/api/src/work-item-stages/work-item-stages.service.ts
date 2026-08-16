import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWorkItemStageDto } from './dto/create-work-item-stage.dto';
import { UpdateWorkItemStageDto } from './dto/update-work-item-stage.dto';

@Injectable()
export class WorkItemStagesService {
  constructor(private readonly db: DatabaseService) {}

  async listStages(companyId: string, workItemId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT s.id, s.company_id, s.work_item_id, s.name, s.code, s.percentage,
                s.standard_productivity, s.unit_id, s.sort_order, s.is_active,
                s.created_at, s.updated_at, u.name AS unit_name, u.symbol AS unit_symbol
         FROM work_item_stages s
         LEFT JOIN units u ON s.unit_id = u.id AND s.company_id = u.company_id
         WHERE s.company_id = $1 AND s.work_item_id = $2
         ORDER BY s.sort_order ASC, s.created_at ASC`,
        [companyId, workItemId],
      );
      return res.rows;
    });
  }

  async getStageById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT s.id, s.company_id, s.work_item_id, s.name, s.code, s.percentage,
                s.standard_productivity, s.unit_id, s.sort_order, s.is_active,
                s.created_at, s.updated_at, u.name AS unit_name, u.symbol AS unit_symbol
         FROM work_item_stages s
         LEFT JOIN units u ON s.unit_id = u.id AND s.company_id = u.company_id
         WHERE s.company_id = $1 AND s.id = $2`,
        [companyId, id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'STAGE_NOT_FOUND',
          message: 'Work item stage not found',
        });
      }
      return res.rows[0];
    });
  }

  async createStage(companyId: string, workItemId: string, dto: CreateWorkItemStageDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      // Check work item exists
      const itemRes = await client.query(
        `SELECT id FROM work_items WHERE company_id = $1 AND id = $2`,
        [companyId, workItemId],
      );
      if (itemRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'WORK_ITEM_NOT_FOUND',
          message: 'Work item not found',
        });
      }

      const insertRes = await client.query(
        `INSERT INTO work_item_stages (
           company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order, is_active, created_at, updated_at`,
        [
          companyId,
          workItemId,
          dto.name,
          dto.code || null,
          dto.percentage,
          dto.standardProductivity || 0,
          dto.unitId || null,
          dto.sortOrder || 0,
          dto.isActive !== undefined ? dto.isActive : true,
        ],
      );
      return insertRes.rows[0];
    });
  }

  async updateStage(companyId: string, id: string, dto: UpdateWorkItemStageDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT id FROM work_item_stages WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'STAGE_NOT_FOUND',
          message: 'Work item stage not found',
        });
      }

      const updateRes = await client.query(
        `UPDATE work_item_stages
         SET name = COALESCE($3, name),
             code = COALESCE($4, code),
             percentage = COALESCE($5, percentage),
             standard_productivity = COALESCE($6, standard_productivity),
             unit_id = COALESCE($7, unit_id),
             sort_order = COALESCE($8, sort_order),
             is_active = COALESCE($9, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, work_item_id, name, code, percentage, standard_productivity, unit_id, sort_order, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.name || null,
          dto.code || null,
          dto.percentage !== undefined ? dto.percentage : null,
          dto.standardProductivity !== undefined ? dto.standardProductivity : null,
          dto.unitId || null,
          dto.sortOrder !== undefined ? dto.sortOrder : null,
          dto.isActive !== undefined ? dto.isActive : null,
        ],
      );
      return updateRes.rows[0];
    });
  }

  async deleteStage(companyId: string, id: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM work_item_stages WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'STAGE_NOT_FOUND',
          message: 'Work item stage not found',
        });
      }
      return { success: true };
    });
  }
}
