import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { QueryBranchDto } from './dto/query-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * List branches with pagination and search
   */
  async findBranches(companyId: string, query: QueryBranchDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.search) {
        conditions.push(`(name ILIKE $${paramIdx} OR code ILIKE $${paramIdx})`);
        params.push(`%${query.search}%`);
        paramIdx++;
      }

      if (query.isActive !== undefined) {
        conditions.push(`is_active = $${paramIdx++}`);
        params.push(query.isActive);
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM branches WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await client.query(
        `SELECT id, company_id, name, code, location, phone, is_active, created_at, updated_at
         FROM branches
         WHERE ${whereClause}
         ORDER BY created_at ASC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...params, limit, offset],
      );

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
   * Get single branch by ID
   */
  async getBranchById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, name, code, location, phone, is_active, created_at, updated_at
         FROM branches
         WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'BRANCH_NOT_FOUND',
          message: 'Branch not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Create new branch
   */
  async createBranch(companyId: string, dto: CreateBranchDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      if (dto.code) {
        const dupRes = await client.query(
          `SELECT id FROM branches WHERE company_id = $1 AND code = $2`,
          [companyId, dto.code],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'BRANCH_CODE_DUPLICATE',
            message: 'Branch code already exists in this company',
          });
        }
      }

      const isActive = dto.isActive !== undefined ? dto.isActive : true;

      const insertRes = await client.query(
        `INSERT INTO branches (company_id, name, code, location, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, company_id, name, code, location, phone, is_active, created_at, updated_at`,
        [companyId, dto.name, dto.code || null, dto.location || null, dto.phone || null, isActive],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * Update branch
   */
  async updateBranch(companyId: string, id: string, dto: UpdateBranchDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT * FROM branches WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'BRANCH_NOT_FOUND',
          message: 'Branch not found',
        });
      }

      if (dto.code && dto.code !== curRes.rows[0].code) {
        const dupRes = await client.query(
          `SELECT id FROM branches WHERE company_id = $1 AND code = $2 AND id != $3`,
          [companyId, dto.code, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'BRANCH_CODE_DUPLICATE',
            message: 'Branch code already exists in this company',
          });
        }
      }

      const updateRes = await client.query(
        `UPDATE branches
         SET name = COALESCE($3, name),
             code = COALESCE($4, code),
             location = COALESCE($5, location),
             phone = COALESCE($6, phone),
             is_active = COALESCE($7, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, name, code, location, phone, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.name || null,
          dto.code || null,
          dto.location !== undefined ? dto.location : null,
          dto.phone !== undefined ? dto.phone : null,
          dto.isActive !== undefined ? dto.isActive : null,
        ],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Delete branch
   */
  async deleteBranch(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM branches WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'BRANCH_NOT_FOUND',
          message: 'Branch not found',
        });
      }
    });
  }
}
