import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * List projects with filters and pagination
   */
  async findProjects(companyId: string, query: QueryProjectDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['p.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.branchId) {
        conditions.push(`p.branch_id = $${paramIdx++}`);
        params.push(query.branchId);
      }

      if (query.status) {
        conditions.push(`p.status = $${paramIdx++}`);
        params.push(query.status);
      }

      if (query.search) {
        conditions.push(`(p.name ILIKE $${paramIdx} OR p.code ILIKE $${paramIdx} OR p.client_name ILIKE $${paramIdx})`);
        params.push(`%${query.search}%`);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM projects p WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          p.id, p.company_id, p.branch_id, p.name, p.code, p.client_name, p.location,
          p.start_date, p.end_date, p.status, p.created_at, p.updated_at,
          b.name AS branch_name
        FROM projects p
        LEFT JOIN branches b ON p.branch_id = b.id AND p.company_id = b.company_id
        WHERE ${whereClause}
        ORDER BY p.created_at ASC
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
   * Get single project by ID
   */
  async getProjectById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT 
           p.id, p.company_id, p.branch_id, p.name, p.code, p.client_name, p.location,
           p.start_date, p.end_date, p.status, p.created_at, p.updated_at,
           b.name AS branch_name
         FROM projects p
         LEFT JOIN branches b ON p.branch_id = b.id AND p.company_id = b.company_id
         WHERE p.company_id = $1 AND p.id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Create new project
   */
  async createProject(companyId: string, dto: CreateProjectDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      if (dto.code) {
        const dupRes = await client.query(
          `SELECT id FROM projects WHERE company_id = $1 AND code = $2`,
          [companyId, dto.code],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'PROJECT_CODE_DUPLICATE',
            message: 'Project code already exists in this company',
          });
        }
      }

      // Verify branch exists
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

      const status = dto.status || 'active';

      const insertRes = await client.query(
        `INSERT INTO projects (
           company_id, branch_id, name, code, client_name, location, start_date, end_date, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, company_id, branch_id, name, code, client_name, location, start_date, end_date, status, created_at, updated_at`,
        [
          companyId,
          dto.branchId,
          dto.name,
          dto.code || null,
          dto.clientName || null,
          dto.location || null,
          dto.startDate || null,
          dto.endDate || null,
          status,
        ],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * Update project
   */
  async updateProject(companyId: string, id: string, dto: UpdateProjectDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT * FROM projects WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (dto.code && dto.code !== curRes.rows[0].code) {
        const dupRes = await client.query(
          `SELECT id FROM projects WHERE company_id = $1 AND code = $2 AND id != $3`,
          [companyId, dto.code, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'PROJECT_CODE_DUPLICATE',
            message: 'Project code already exists in this company',
          });
        }
      }

      if (dto.branchId) {
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
      }

      const updateRes = await client.query(
        `UPDATE projects
         SET branch_id = COALESCE($3, branch_id),
             name = COALESCE($4, name),
             code = COALESCE($5, code),
             client_name = COALESCE($6, client_name),
             location = COALESCE($7, location),
             start_date = COALESCE($8, start_date),
             end_date = COALESCE($9, end_date),
             status = COALESCE($10, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, branch_id, name, code, client_name, location, start_date, end_date, status, created_at, updated_at`,
        [
          companyId,
          id,
          dto.branchId || null,
          dto.name || null,
          dto.code || null,
          dto.clientName !== undefined ? dto.clientName : null,
          dto.location !== undefined ? dto.location : null,
          dto.startDate || null,
          dto.endDate || null,
          dto.status || null,
        ],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Delete project
   */
  async deleteProject(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM projects WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }
    });
  }
}
