import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWorkAreaDto } from './dto/create-work-area.dto';
import { UpdateWorkAreaDto } from './dto/update-work-area.dto';
import { QueryWorkAreaDto } from './dto/query-work-area.dto';
import { SaveRoomBoqDto } from './dto/save-room-boq.dto';

@Injectable()
export class WorkAreasService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * List work areas with hierarchy support, project filter and pagination
   */
  async findWorkAreas(companyId: string, query: QueryWorkAreaDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['wa.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.projectId) {
        conditions.push(`wa.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      if (query.parentId !== undefined) {
        if (query.parentId === 'null' || query.parentId === '') {
          conditions.push(`wa.parent_id IS NULL`);
        } else {
          conditions.push(`wa.parent_id = $${paramIdx++}`);
          params.push(query.parentId);
        }
      }

      if (query.level !== undefined) {
        conditions.push(`wa.level = $${paramIdx++}`);
        params.push(query.level);
      }

      if (query.search) {
        conditions.push(`(wa.name ILIKE $${paramIdx} OR wa.code ILIKE $${paramIdx})`);
        params.push(`%${query.search}%`);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 50;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM work_areas wa WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          wa.id, wa.company_id, wa.project_id, wa.parent_id, wa.name, wa.code,
          wa.level, wa.path, wa.sort_order, wa.area_m2, wa.is_active, wa.created_at, wa.updated_at,
          p.name AS project_name,
          parent.name AS parent_name
        FROM work_areas wa
        LEFT JOIN projects p ON wa.project_id = p.id AND wa.company_id = p.company_id
        LEFT JOIN work_areas parent ON wa.parent_id = parent.id AND wa.company_id = parent.company_id
        WHERE ${whereClause}
        ORDER BY wa.level ASC, wa.sort_order ASC, wa.created_at ASC
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
   * Get single work area by ID
   */
  async getWorkAreaById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT 
           wa.id, wa.company_id, wa.project_id, wa.parent_id, wa.name, wa.code,
           wa.level, wa.path, wa.sort_order, wa.area_m2, wa.is_active, wa.created_at, wa.updated_at,
           p.name AS project_name,
           parent.name AS parent_name
         FROM work_areas wa
         LEFT JOIN projects p ON wa.project_id = p.id AND wa.company_id = p.company_id
         LEFT JOIN work_areas parent ON wa.parent_id = parent.id AND wa.company_id = parent.company_id
         WHERE wa.company_id = $1 AND wa.id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'WORK_AREA_NOT_FOUND',
          message: 'Work area not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Create new work area with hierarchy calculation
   */
  async createWorkArea(companyId: string, dto: CreateWorkAreaDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      let level = 1;
      let path = `/${dto.code || dto.name}`;

      if (dto.parentId) {
        const parentRes = await client.query(
          `SELECT level, path, code, name FROM work_areas WHERE company_id = $1 AND id = $2`,
          [companyId, dto.parentId],
        );
        if (parentRes.rows.length === 0) {
          throw new NotFoundException({
            code: 'PARENT_WORK_AREA_NOT_FOUND',
            message: 'Parent work area not found',
          });
        }
        const parent = parentRes.rows[0];
        level = (parent.level || 1) + 1;
        path = `${parent.path || ''}/${dto.code || dto.name}`;
      }

      const isActive = dto.isActive !== undefined ? dto.isActive : true;

      const insertRes = await client.query(
        `INSERT INTO work_areas (
           company_id, project_id, parent_id, name, code, level, path, sort_order, area_m2, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, company_id, project_id, parent_id, name, code, level, path, sort_order, area_m2, is_active, created_at, updated_at`,
        [
          companyId,
          dto.projectId,
          dto.parentId || null,
          dto.name,
          dto.code || null,
          level,
          path,
          dto.sortOrder !== undefined ? dto.sortOrder : 0,
          dto.areaM2 !== undefined ? dto.areaM2 : null,
          isActive,
        ],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * Update work area
   */
  async updateWorkArea(companyId: string, id: string, dto: UpdateWorkAreaDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT * FROM work_areas WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'WORK_AREA_NOT_FOUND',
          message: 'Work area not found',
        });
      }

      const current = curRes.rows[0];
      let level = current.level;
      let path = current.path;

      if (dto.parentId !== undefined && dto.parentId !== current.parent_id) {
        if (dto.parentId) {
          const parentRes = await client.query(
            `SELECT level, path FROM work_areas WHERE company_id = $1 AND id = $2`,
            [companyId, dto.parentId],
          );
          if (parentRes.rows.length === 0) {
            throw new NotFoundException({
              code: 'PARENT_WORK_AREA_NOT_FOUND',
              message: 'Parent work area not found',
            });
          }
          level = (parentRes.rows[0].level || 1) + 1;
          path = `${parentRes.rows[0].path}/${dto.code || dto.name || current.name}`;
        } else {
          level = 1;
          path = `/${dto.code || dto.name || current.name}`;
        }
      }

      const updateRes = await client.query(
        `UPDATE work_areas
         SET project_id = COALESCE($3, project_id),
             parent_id = COALESCE($4, parent_id),
             name = COALESCE($5, name),
             code = COALESCE($6, code),
             level = $7,
             path = $8,
             sort_order = COALESCE($9, sort_order),
             area_m2 = COALESCE($10, area_m2),
             is_active = COALESCE($11, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, project_id, parent_id, name, code, level, path, sort_order, area_m2, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.projectId || null,
          dto.parentId !== undefined ? (dto.parentId || null) : current.parent_id,
          dto.name || null,
          dto.code || null,
          level,
          path,
          dto.sortOrder !== undefined ? dto.sortOrder : null,
          dto.areaM2 !== undefined ? dto.areaM2 : null,
          dto.isActive !== undefined ? dto.isActive : null,
        ],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Delete work area
   */
  async deleteWorkArea(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM work_areas WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'WORK_AREA_NOT_FOUND',
          message: 'Work area not found',
        });
      }
    });
  }

  /**
   * Get Room BOQ items for a specific room/work area
   */
  async getRoomBoqItems(companyId: string, workAreaId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const sql = `
        SELECT 
          rbi.id, rbi.company_id, rbi.project_id, rbi.work_area_id, rbi.work_item_id,
          wi.name AS work_item_name, wi.code AS work_item_code,
          rbi.work_item_stage_id, wis.name AS stage_name,
          rbi.total_quantity, rbi.unit_rate, rbi.unit_id, u.symbol AS unit_symbol,
          rbi.notes, rbi.created_at, rbi.updated_at
        FROM room_boq_items rbi
        JOIN work_items wi ON rbi.work_item_id = wi.id
        LEFT JOIN work_item_stages wis ON rbi.work_item_stage_id = wis.id
        LEFT JOIN units u ON rbi.unit_id = u.id
        WHERE rbi.company_id = $1 AND rbi.work_area_id = $2
        ORDER BY wi.code ASC
      `;
      const res = await client.query(sql, [companyId, workAreaId]);
      return { data: res.rows };
    });
  }

  /**
   * Save (Insert/Update) a Room BOQ item
   */
  async saveRoomBoqItem(companyId: string, workAreaId: string, dto: SaveRoomBoqDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const sql = `
        INSERT INTO room_boq_items (
          company_id, project_id, work_area_id, work_item_id, work_item_stage_id,
          total_quantity, unit_rate, unit_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (company_id, project_id, work_area_id, work_item_id)
        DO UPDATE SET
          work_item_stage_id = EXCLUDED.work_item_stage_id,
          total_quantity = EXCLUDED.total_quantity,
          unit_rate = EXCLUDED.unit_rate,
          unit_id = EXCLUDED.unit_id,
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      const res = await client.query(sql, [
        companyId,
        dto.projectId,
        workAreaId,
        dto.workItemId,
        dto.workItemStageId || null,
        dto.totalQuantity || 0,
        dto.unitRate || 0,
        dto.unitId || null,
        dto.notes || null,
      ]);
      return res.rows[0];
    });
  }

  /**
   * Delete a Room BOQ item
   */
  async deleteRoomBoqItem(companyId: string, workAreaId: string, itemId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM room_boq_items WHERE company_id = $1 AND work_area_id = $2 AND id = $3 RETURNING id`,
        [companyId, workAreaId, itemId],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Room BOQ item not found`);
      }
      return { success: true };
    });
  }
}
