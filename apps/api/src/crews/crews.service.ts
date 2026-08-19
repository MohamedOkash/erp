import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCrewDto, CreateCrewTemplateDto } from './dto/create-crew.dto';
import { QueryCrewDto } from './dto/query-crew.dto';

@Injectable()
export class CrewsService {
  constructor(private readonly db: DatabaseService) {}

  async getTemplates(companyId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, name, code, skilled_count, unskilled_count, description, is_active, created_at
         FROM crew_templates
         WHERE company_id = $1
         ORDER BY created_at ASC`,
        [companyId],
      );
      return { data: res.rows };
    });
  }

  async createTemplate(companyId: string, dto: CreateCrewTemplateDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `INSERT INTO crew_templates (company_id, name, code, skilled_count, unskilled_count, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (company_id, code) DO UPDATE
         SET name = EXCLUDED.name,
             skilled_count = EXCLUDED.skilled_count,
             unskilled_count = EXCLUDED.unskilled_count,
             description = EXCLUDED.description,
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          companyId,
          dto.name,
          dto.code,
          dto.skilledCount || 1,
          dto.unskilledCount || 1,
          dto.description || null,
        ],
      );
      return res.rows[0];
    });
  }

  async findAll(companyId: string, query: QueryCrewDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['c.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.projectId) {
        conditions.push(`c.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      if (query.crewType) {
        conditions.push(`c.crew_type = $${paramIdx++}`);
        params.push(query.crewType);
      }

      if (query.isActive !== undefined) {
        conditions.push(`c.is_active = $${paramIdx++}`);
        params.push(query.isActive);
      }

      if (query.workAreaId) {
        conditions.push(`c.work_area_id = $${paramIdx++}`);
        params.push(query.workAreaId);
      }

      const sql = `
        SELECT 
          c.id,
          c.company_id,
          c.project_id,
          p.name AS project_name,
          c.code,
          c.crew_type,
          c.crew_number,
          c.template_id,
          ct.name AS template_name,
          ct.skilled_count,
          ct.unskilled_count,
          c.foreman_id,
          u.name AS foreman_name,
          c.work_area_id,
          wa.name AS work_area_name,
          c.is_active,
          c.created_at,
          c.updated_at,
          COALESCE(
            json_agg(
              json_build_object(
                'employeeId', cm.employee_id,
                'role', cm.role,
                'joinedAt', cm.joined_at,
                'employeeName', e.name,
                'companyEmployeeId', e.company_employee_id,
                'projectEmployeeId', e.project_employee_id,
                'identityNumber', e.identity_number,
                'profession', e.profession,
                'hourlyRate', e.hourly_rate,
                'roleTitle', e.role,
                'dailyWage', e.daily_wage
              )
            ) FILTER (WHERE cm.employee_id IS NOT NULL),
            '[]'
          ) AS members
        FROM crews c
        JOIN projects p ON c.project_id = p.id
        LEFT JOIN crew_templates ct ON c.template_id = ct.id
        LEFT JOIN users u ON c.foreman_id = u.id
        LEFT JOIN work_areas wa ON c.work_area_id = wa.id
        LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.left_at IS NULL
        LEFT JOIN employees e ON cm.employee_id = e.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY c.id, c.company_id, c.project_id, p.name, c.code, c.crew_type, c.crew_number,
                 c.template_id, ct.name, ct.skilled_count, ct.unskilled_count,
                 c.foreman_id, u.name, c.work_area_id, wa.name, c.is_active, c.created_at, c.updated_at
        ORDER BY c.code ASC
      `;

      const res = await client.query(sql, params);
      return { data: res.rows };
    });
  }

  async findOne(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const sql = `
        SELECT 
          c.id,
          c.company_id,
          c.project_id,
          p.name AS project_name,
          c.code,
          c.crew_type,
          c.crew_number,
          c.template_id,
          ct.name AS template_name,
          ct.skilled_count,
          ct.unskilled_count,
          c.foreman_id,
          u.name AS foreman_name,
          c.work_area_id,
          wa.name AS work_area_name,
          c.is_active,
          c.created_at,
          c.updated_at,
          COALESCE(
            json_agg(
              json_build_object(
                'employeeId', cm.employee_id,
                'role', cm.role,
                'joinedAt', cm.joined_at,
                'employeeName', e.name,
                'companyEmployeeId', e.company_employee_id,
                'projectEmployeeId', e.project_employee_id,
                'identityNumber', e.identity_number,
                'profession', e.profession,
                'hourlyRate', e.hourly_rate,
                'roleTitle', e.role,
                'dailyWage', e.daily_wage
              )
            ) FILTER (WHERE cm.employee_id IS NOT NULL),
            '[]'
          ) AS members
        FROM crews c
        JOIN projects p ON c.project_id = p.id
        LEFT JOIN crew_templates ct ON c.template_id = ct.id
        LEFT JOIN users u ON c.foreman_id = u.id
        LEFT JOIN work_areas wa ON c.work_area_id = wa.id
        LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.left_at IS NULL
        LEFT JOIN employees e ON cm.employee_id = e.id
        WHERE c.company_id = $1 AND c.id = $2
        GROUP BY c.id, c.company_id, c.project_id, p.name, c.code, c.crew_type, c.crew_number,
                 c.template_id, ct.name, ct.skilled_count, ct.unskilled_count,
                 c.foreman_id, u.name, c.work_area_id, wa.name, c.is_active, c.created_at, c.updated_at
      `;
      const res = await client.query(sql, [companyId, id]);
      if (res.rows.length === 0) {
        throw new NotFoundException(`Crew with ID "${id}" not found`);
      }
      return res.rows[0];
    });
  }

  async create(companyId: string, dto: CreateCrewDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      try {
        const crewType = dto.crewType || (dto.templateId ? 'A' : 'A');
        const insertCrewSql = `
          INSERT INTO crews (company_id, project_id, code, crew_type, template_id, foreman_id, crew_number, work_area_id, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        const crewRes = await client.query(insertCrewSql, [
          companyId,
          dto.projectId,
          dto.code,
          crewType,
          dto.templateId || null,
          dto.foremanId || null,
          dto.crewNumber || null,
          dto.workAreaId || null,
          dto.isActive !== undefined ? dto.isActive : true,
        ]);
        const crew = crewRes.rows[0];

        if (dto.members && dto.members.length > 0) {
          for (const member of dto.members) {
            await client.query(
              `INSERT INTO crew_members (crew_id, employee_id, role) VALUES ($1, $2, $3)
               ON CONFLICT (crew_id, employee_id) DO UPDATE SET role = EXCLUDED.role, left_at = NULL`,
              [crew.id, member.employeeId, member.role],
            );
          }
        }

        return this.findOne(companyId, crew.id);
      } catch (err: any) {
        if (err.code === '23505') {
          throw new BadRequestException(`Crew with code "${dto.code}" already exists in this project.`);
        }
        throw err;
      }
    });
  }

  async remove(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query('DELETE FROM crews WHERE company_id = $1 AND id = $2 RETURNING id', [
        companyId,
        id,
      ]);
      if (res.rows.length === 0) {
        throw new NotFoundException(`Crew with ID "${id}" not found`);
      }
      return { success: true, message: 'Crew deleted successfully' };
    });
  }
}
