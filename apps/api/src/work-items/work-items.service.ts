import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemDto } from './dto/query-work-item.dto';

@Injectable()
export class WorkItemsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * List work items with filters, branch rate overrides, stages aggregation and pagination
   */
  async findWorkItems(companyId: string, query: QueryWorkItemDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['w.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      let branchJoin = '';
      let branchSelect = '';

      if (query.branchId) {
        branchJoin = `LEFT JOIN branch_work_items bwi ON w.id = bwi.work_item_id AND bwi.branch_id = $${paramIdx++} AND bwi.company_id = w.company_id`;
        params.push(query.branchId);
        branchSelect = `, COALESCE(bwi.custom_unit_rate, w.default_unit_rate) AS unit_rate, COALESCE(bwi.custom_daily_target, w.default_daily_target) AS daily_target, bwi.custom_unit_rate, bwi.custom_daily_target`;
      } else {
        branchSelect = `, w.default_unit_rate AS unit_rate, w.default_daily_target AS daily_target`;
      }

      if (query.categoryId) {
        conditions.push(`w.category_id = $${paramIdx++}`);
        params.push(query.categoryId);
      }

      if (query.category) {
        conditions.push(`(w.category ILIKE $${paramIdx} OR wc.name ILIKE $${paramIdx})`);
        params.push(`%${query.category}%`);
        paramIdx++;
      }

      if (query.search) {
        conditions.push(`(w.name ILIKE $${paramIdx} OR w.code ILIKE $${paramIdx} OR w.category ILIKE $${paramIdx} OR wc.name ILIKE $${paramIdx})`);
        params.push(`%${query.search}%`);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 50;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total 
         FROM work_items w 
         LEFT JOIN work_categories wc ON w.category_id = wc.id AND w.company_id = wc.company_id
         ${branchJoin} 
         WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          w.id, w.company_id, w.unit_id, w.name, w.code, 
          COALESCE(wc.name, w.category) AS category,
          w.category_id, wc.code AS category_code,
          w.description,
          w.default_unit_rate, w.default_daily_target, w.is_active, w.created_at, w.updated_at,
          u.name AS unit_name, u.symbol AS unit_symbol,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', s.id,
                  'name', s.name,
                  'code', s.code,
                  'percentage', s.percentage,
                  'standard_productivity', s.standard_productivity,
                  'sort_order', s.sort_order
                ) ORDER BY s.sort_order ASC
              )
              FROM work_item_stages s
              WHERE s.work_item_id = w.id
            ),
            '[]'::json
          ) AS stages,
          (SELECT COUNT(*)::int FROM work_item_stages s WHERE s.work_item_id = w.id) AS stages_count
          ${branchSelect}
        FROM work_items w
        LEFT JOIN work_categories wc ON w.category_id = wc.id AND w.company_id = wc.company_id
        LEFT JOIN units u ON w.unit_id = u.id AND w.company_id = u.company_id
        ${branchJoin}
        WHERE ${whereClause}
        ORDER BY wc.sort_order ASC NULLS LAST, w.name ASC
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
   * Get single work item by ID
   */
  async getWorkItemById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT 
           w.id, w.company_id, w.unit_id, w.name, w.code, 
           COALESCE(wc.name, w.category) AS category,
           w.category_id, wc.code AS category_code,
           w.description,
           w.default_unit_rate, w.default_daily_target, w.is_active, w.created_at, w.updated_at,
           u.name AS unit_name, u.symbol AS unit_symbol,
           COALESCE(
             (
               SELECT json_agg(
                 json_build_object(
                   'id', s.id,
                   'name', s.name,
                   'code', s.code,
                   'percentage', s.percentage,
                   'standard_productivity', s.standard_productivity,
                   'sort_order', s.sort_order
                 ) ORDER BY s.sort_order ASC
               )
               FROM work_item_stages s
               WHERE s.work_item_id = w.id
             ),
             '[]'::json
           ) AS stages,
           (SELECT COUNT(*)::int FROM work_item_stages s WHERE s.work_item_id = w.id) AS stages_count
         FROM work_items w
         LEFT JOIN work_categories wc ON w.category_id = wc.id AND w.company_id = wc.company_id
         LEFT JOIN units u ON w.unit_id = u.id AND w.company_id = u.company_id
         WHERE w.company_id = $1 AND w.id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'WORK_ITEM_NOT_FOUND',
          message: 'Work item not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Create new work item
   */
  async createWorkItem(companyId: string, dto: CreateWorkItemDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      if (dto.code) {
        const dupRes = await client.query(
          `SELECT id FROM work_items WHERE company_id = $1 AND code = $2`,
          [companyId, dto.code],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'WORK_ITEM_CODE_DUPLICATE',
            message: 'Work item code already exists in this company',
          });
        }
      }

      // Resolve unit
      let unitId = dto.unitId;
      if (!unitId) {
        const unitRes = await client.query(
          `SELECT id FROM units WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        if (unitRes.rows.length > 0) {
          unitId = unitRes.rows[0].id;
        } else {
          const newUnit = await client.query(
            `INSERT INTO units (company_id, name, symbol) VALUES ($1, 'عدد', 'عدد') RETURNING id`,
            [companyId],
          );
          unitId = newUnit.rows[0].id;
        }
      }

      let categoryId = dto.categoryId || null;
      let categoryName = dto.category || null;
      if (!categoryId && categoryName) {
        const catRes = await client.query(
          `SELECT id FROM work_categories WHERE company_id = $1 AND name ILIKE $2 LIMIT 1`,
          [companyId, categoryName],
        );
        if (catRes.rows.length > 0) {
          categoryId = catRes.rows[0].id;
        }
      } else if (categoryId && !categoryName) {
        const catRes = await client.query(
          `SELECT name FROM work_categories WHERE company_id = $1 AND id = $2 LIMIT 1`,
          [companyId, categoryId],
        );
        if (catRes.rows.length > 0) {
          categoryName = catRes.rows[0].name;
        }
      }

      const isActive = dto.isActive !== undefined ? dto.isActive : true;

      const insertRes = await client.query(
        `INSERT INTO work_items (
           company_id, unit_id, category_id, name, code, category, description, default_unit_rate, default_daily_target, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, company_id, unit_id, category_id, name, code, category, description, default_unit_rate, default_daily_target, is_active, created_at, updated_at`,
        [
          companyId,
          unitId,
          categoryId,
          dto.name,
          dto.code || null,
          categoryName,
          dto.description || null,
          dto.defaultUnitRate !== undefined ? dto.defaultUnitRate : 0,
          dto.defaultDailyTarget !== undefined ? dto.defaultDailyTarget : 0,
          isActive,
        ],
      );
      const workItem = insertRes.rows[0];

      if (dto.branchId) {
        await client.query(
          `INSERT INTO branch_work_items (
             company_id, branch_id, work_item_id, custom_unit_rate, custom_daily_target, is_active
           ) VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (company_id, branch_id, work_item_id)
           DO UPDATE SET custom_unit_rate = EXCLUDED.custom_unit_rate, custom_daily_target = EXCLUDED.custom_daily_target, updated_at = CURRENT_TIMESTAMP`,
          [
            companyId,
            dto.branchId,
            workItem.id,
            dto.customUnitRate !== undefined ? dto.customUnitRate : dto.defaultUnitRate || 0,
            dto.customDailyTarget !== undefined ? dto.customDailyTarget : dto.defaultDailyTarget || 0,
          ],
        );
      }

      return workItem;
    });
  }

  /**
   * Update work item
   */
  async updateWorkItem(companyId: string, id: string, dto: UpdateWorkItemDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT * FROM work_items WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'WORK_ITEM_NOT_FOUND',
          message: 'Work item not found',
        });
      }

      if (dto.code && dto.code !== curRes.rows[0].code) {
        const dupRes = await client.query(
          `SELECT id FROM work_items WHERE company_id = $1 AND code = $2 AND id != $3`,
          [companyId, dto.code, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'WORK_ITEM_CODE_DUPLICATE',
            message: 'Work item code already exists in this company',
          });
        }
      }

      let categoryId = dto.categoryId !== undefined ? dto.categoryId : curRes.rows[0].category_id;
      let categoryName = dto.category !== undefined ? dto.category : curRes.rows[0].category;
      if (dto.categoryId && !dto.category) {
        const catRes = await client.query(
          `SELECT name FROM work_categories WHERE company_id = $1 AND id = $2 LIMIT 1`,
          [companyId, dto.categoryId],
        );
        if (catRes.rows.length > 0) categoryName = catRes.rows[0].name;
      }

      const updateRes = await client.query(
        `UPDATE work_items
         SET unit_id = COALESCE($3, unit_id),
             category_id = $4,
             name = COALESCE($5, name),
             code = COALESCE($6, code),
             category = COALESCE($7, category),
             description = COALESCE($8, description),
             default_unit_rate = COALESCE($9, default_unit_rate),
             default_daily_target = COALESCE($10, default_daily_target),
             is_active = COALESCE($11, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, unit_id, category_id, name, code, category, description, default_unit_rate, default_daily_target, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.unitId || null,
          categoryId || null,
          dto.name || null,
          dto.code || null,
          categoryName,
          dto.description !== undefined ? dto.description : null,
          dto.defaultUnitRate !== undefined ? dto.defaultUnitRate : null,
          dto.defaultDailyTarget !== undefined ? dto.defaultDailyTarget : null,
          dto.isActive !== undefined ? dto.isActive : null,
        ],
      );

      if (dto.branchId && (dto.customUnitRate !== undefined || dto.customDailyTarget !== undefined)) {
        await client.query(
          `INSERT INTO branch_work_items (
             company_id, branch_id, work_item_id, custom_unit_rate, custom_daily_target, is_active
           ) VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (company_id, branch_id, work_item_id)
           DO UPDATE SET custom_unit_rate = COALESCE(EXCLUDED.custom_unit_rate, branch_work_items.custom_unit_rate),
                         custom_daily_target = COALESCE(EXCLUDED.custom_daily_target, branch_work_items.custom_daily_target),
                         updated_at = CURRENT_TIMESTAMP`,
          [
            companyId,
            dto.branchId,
            id,
            dto.customUnitRate !== undefined ? dto.customUnitRate : null,
            dto.customDailyTarget !== undefined ? dto.customDailyTarget : null,
          ],
        );
      }

      return updateRes.rows[0];
    });
  }

  /**
   * Delete work item
   */
  async deleteWorkItem(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM work_items WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'WORK_ITEM_NOT_FOUND',
          message: 'Work item not found',
        });
      }
    });
  }
}
