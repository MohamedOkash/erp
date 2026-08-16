import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWorkCategoryDto } from './dto/create-work-category.dto';
import { UpdateWorkCategoryDto } from './dto/update-work-category.dto';

@Injectable()
export class WorkCategoriesService {
  constructor(private readonly db: DatabaseService) {}

  async listCategories(companyId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, parent_id, level, name, code, description, sort_order, is_active, created_at, updated_at
         FROM work_categories
         WHERE company_id = $1
         ORDER BY sort_order ASC, name ASC`,
        [companyId],
      );
      return res.rows;
    });
  }

  async getCategoryById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, parent_id, level, name, code, description, sort_order, is_active, created_at, updated_at
         FROM work_categories
         WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'WORK_CATEGORY_NOT_FOUND',
          message: `Work category with id '${id}' not found`,
        });
      }
      return res.rows[0];
    });
  }

  async createCategory(companyId: string, dto: CreateWorkCategoryDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const dupRes = await client.query(
        `SELECT id FROM work_categories WHERE company_id = $1 AND code = $2`,
        [companyId, dto.code],
      );
      if (dupRes.rows.length > 0) {
        throw new ConflictException({
          code: 'WORK_CATEGORY_CODE_DUPLICATE',
          message: 'Work category code already exists in this company',
        });
      }

      let level = dto.level || 1;
      if (dto.parentId) {
        const parentRes = await client.query(
          `SELECT level FROM work_categories WHERE company_id = $1 AND id = $2`,
          [companyId, dto.parentId],
        );
        if (parentRes.rows.length > 0) {
          level = (parentRes.rows[0].level || 1) + 1;
        }
      }

      const insertRes = await client.query(
        `INSERT INTO work_categories (
           company_id, parent_id, level, name, code, description, sort_order, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, company_id, parent_id, level, name, code, description, sort_order, is_active, created_at, updated_at`,
        [
          companyId,
          dto.parentId || null,
          level,
          dto.name,
          dto.code,
          dto.description || null,
          dto.sortOrder || 0,
          dto.isActive !== undefined ? dto.isActive : true,
        ],
      );
      return insertRes.rows[0];
    });
  }

  async updateCategory(companyId: string, id: string, dto: UpdateWorkCategoryDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT id FROM work_categories WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'WORK_CATEGORY_NOT_FOUND',
          message: `Work category with id '${id}' not found`,
        });
      }

      if (dto.code) {
        const dupRes = await client.query(
          `SELECT id FROM work_categories WHERE company_id = $1 AND code = $2 AND id != $3`,
          [companyId, dto.code, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'WORK_CATEGORY_CODE_DUPLICATE',
            message: 'Work category code already exists',
          });
        }
      }

      const updateRes = await client.query(
        `UPDATE work_categories
         SET parent_id = COALESCE($3, parent_id),
             level = COALESCE($4, level),
             name = COALESCE($5, name),
             code = COALESCE($6, code),
             description = COALESCE($7, description),
             sort_order = COALESCE($8, sort_order),
             is_active = COALESCE($9, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, parent_id, level, name, code, description, sort_order, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.parentId !== undefined ? dto.parentId : null,
          dto.level !== undefined ? dto.level : null,
          dto.name || null,
          dto.code || null,
          dto.description !== undefined ? dto.description : null,
          dto.sortOrder !== undefined ? dto.sortOrder : null,
          dto.isActive !== undefined ? dto.isActive : null,
        ],
      );
      return updateRes.rows[0];
    });
  }

  async deleteCategory(companyId: string, id: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM work_categories WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'WORK_CATEGORY_NOT_FOUND',
          message: 'Work category not found',
        });
      }
      return { success: true };
    });
  }
}
