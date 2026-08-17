import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ScopeService } from '../common/services/scope.service';
import { AuthenticatedUser } from '../auth/auth.service';
import { CreateCostDto } from './dto/create-cost.dto';
import { UpdateCostDto } from './dto/update-cost.dto';
import { QueryCostDto } from './dto/query-cost.dto';

@Injectable()
export class CostsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * Create a new cost entry
   */
  async createCost(
    companyId: string,
    userId: string,
    dto: CreateCostDto,
    user?: AuthenticatedUser,
  ) {
    if (user && dto.projectId) {
      await this.scopeService.assertProjectInScope(user, dto.projectId);
    }
    return this.db.withTenantTransaction(companyId, async (client) => {
      // Validate project
      const projRes = await client.query(
        `SELECT id, branch_id FROM projects WHERE company_id = $1 AND id = $2`,
        [companyId, dto.projectId],
      );
      if (projRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Validate branch
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

      // Compute amount: if quantity and unitCost exist -> quantity * unitCost
      let finalAmount = 0;
      if (dto.quantity !== undefined && dto.unitCost !== undefined) {
        finalAmount = Number((dto.quantity * dto.unitCost).toFixed(2));
      } else if (dto.amount !== undefined) {
        finalAmount = Number(dto.amount);
      }

      const category = (dto.costType || dto.category || 'material').toLowerCase();
      const referenceNumber = dto.referenceNumber || dto.referenceId || null;

      const insertRes = await client.query(
        `INSERT INTO cost_entries (
           company_id, project_id, branch_id, category, amount, date, description, reference_number, recorded_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, company_id, project_id, branch_id, category, amount, date, description, reference_number, recorded_by, created_at, updated_at`,
        [
          companyId,
          dto.projectId,
          dto.branchId,
          category,
          finalAmount,
          dto.date,
          dto.description || null,
          referenceNumber,
          userId,
        ],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * List cost entries with filters, pagination and summary totals
   */
  async findCosts(
    companyId: string,
    query: QueryCostDto,
    user?: AuthenticatedUser,
  ) {
    if (user && query.projectId) {
      await this.scopeService.assertProjectInScope(user, query.projectId);
    }
    const projectScope = user ? await this.scopeService.getProjectScope(user) : null;

    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['c.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (projectScope !== null) {
        if (projectScope.length === 0) {
          return {
            data: [],
            total: 0,
            page: 1,
            limit: query.limit || 20,
            totalPages: 0,
            summary: { totalLabor: 0, totalMaterial: 0, grandTotal: 0 },
          };
        }
        conditions.push(`c.project_id = ANY($${paramIdx++}::uuid[])`);
        params.push(projectScope);
      }

      if (query.fromDate) {
        conditions.push(`c.date >= $${paramIdx++}`);
        params.push(query.fromDate);
      }

      if (query.toDate) {
        conditions.push(`c.date <= $${paramIdx++}`);
        params.push(query.toDate);
      }

      if (query.projectId) {
        conditions.push(`c.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      if (query.branchId) {
        conditions.push(`c.branch_id = $${paramIdx++}`);
        params.push(query.branchId);
      }

      const categoryFilter = query.costType || query.category || query.costCategoryId;
      if (categoryFilter) {
        conditions.push(`LOWER(c.category) = LOWER($${paramIdx++})`);
        params.push(categoryFilter);
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      // Aggregates & Total count
      const summaryRes = await client.query(
        `SELECT 
           COUNT(*)::int AS total,
           COALESCE(SUM(CASE WHEN LOWER(c.category) = 'labor' THEN c.amount ELSE 0 END), 0) AS total_labor,
           COALESCE(SUM(CASE WHEN LOWER(c.category) = 'material' THEN c.amount ELSE 0 END), 0) AS total_material,
           COALESCE(SUM(c.amount), 0) AS grand_total
         FROM cost_entries c
         WHERE ${whereClause}`,
        params,
      );

      const total = summaryRes.rows[0]?.total || 0;
      const totalLabor = parseFloat(summaryRes.rows[0]?.total_labor || '0');
      const totalMaterial = parseFloat(summaryRes.rows[0]?.total_material || '0');
      const grandTotal = parseFloat(summaryRes.rows[0]?.grand_total || '0');

      // Data with joined project & branch
      const dataSql = `
        SELECT 
          c.id, c.company_id, c.project_id, c.branch_id, c.category, c.amount,
          c.date, c.description, c.reference_number, c.recorded_by, c.created_at, c.updated_at,
          p.name AS project_name, p.code AS project_code,
          b.name AS branch_name, b.code AS branch_code
        FROM cost_entries c
        LEFT JOIN projects p ON c.project_id = p.id AND c.company_id = p.company_id
        LEFT JOIN branches b ON c.branch_id = b.id AND c.company_id = b.company_id
        WHERE ${whereClause}
        ORDER BY c.date DESC, c.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      const dataRes = await client.query(dataSql, [...params, limit, offset]);

      return {
        data: dataRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
        summary: {
          totalLabor,
          totalMaterial,
          grandTotal,
        },
      };
    });
  }

  /**
   * Get single cost entry by ID
   */
  async getCostById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT 
           c.id, c.company_id, c.project_id, c.branch_id, c.category, c.amount,
           c.date, c.description, c.reference_number, c.recorded_by, c.created_at, c.updated_at,
           p.name AS project_name, p.code AS project_code,
           b.name AS branch_name, b.code AS branch_code
         FROM cost_entries c
         LEFT JOIN projects p ON c.project_id = p.id AND c.company_id = p.company_id
         LEFT JOIN branches b ON c.branch_id = b.id AND c.company_id = b.company_id
         WHERE c.company_id = $1 AND c.id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'COST_ENTRY_NOT_FOUND',
          message: 'Cost entry not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Update cost entry
   */
  async updateCost(companyId: string, userId: string, id: string, dto: UpdateCostDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const currentRes = await client.query(
        `SELECT * FROM cost_entries WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (currentRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'COST_ENTRY_NOT_FOUND',
          message: 'Cost entry not found',
        });
      }

      const current = currentRes.rows[0];

      if (dto.projectId && dto.projectId !== current.project_id) {
        const projRes = await client.query(
          `SELECT id FROM projects WHERE company_id = $1 AND id = $2`,
          [companyId, dto.projectId],
        );
        if (projRes.rows.length === 0) {
          throw new NotFoundException({
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found',
          });
        }
      }

      if (dto.branchId && dto.branchId !== current.branch_id) {
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

      let finalAmount = current.amount;
      if (dto.quantity !== undefined && dto.unitCost !== undefined) {
        finalAmount = Number((dto.quantity * dto.unitCost).toFixed(2));
      } else if (dto.amount !== undefined) {
        finalAmount = Number(dto.amount);
      }

      const category = (dto.costType || dto.category || current.category).toLowerCase();
      const referenceNumber = dto.referenceNumber !== undefined
        ? dto.referenceNumber
        : (dto.referenceId !== undefined ? dto.referenceId : current.reference_number);

      const updateRes = await client.query(
        `UPDATE cost_entries
         SET project_id = COALESCE($3, project_id),
             branch_id = COALESCE($4, branch_id),
             category = $5,
             amount = $6,
             date = COALESCE($7, date),
             description = COALESCE($8, description),
             reference_number = $9,
             recorded_by = $10,
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, project_id, branch_id, category, amount, date, description, reference_number, recorded_by, created_at, updated_at`,
        [
          companyId,
          id,
          dto.projectId || null,
          dto.branchId || null,
          category,
          finalAmount,
          dto.date || null,
          dto.description !== undefined ? dto.description : null,
          referenceNumber,
          userId,
        ],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Delete cost entry
   */
  async deleteCost(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM cost_entries WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'COST_ENTRY_NOT_FOUND',
          message: 'Cost entry not found',
        });
      }
    });
  }

  /**
   * Aggregate Cost Summary by Project, Branch and Category
   */
  async getCostSummary(companyId: string, query: QueryCostDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['c.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.fromDate) {
        conditions.push(`c.date >= $${paramIdx++}`);
        params.push(query.fromDate);
      }

      if (query.toDate) {
        conditions.push(`c.date <= $${paramIdx++}`);
        params.push(query.toDate);
      }

      if (query.projectId) {
        conditions.push(`c.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      if (query.branchId) {
        conditions.push(`c.branch_id = $${paramIdx++}`);
        params.push(query.branchId);
      }

      const whereClause = conditions.join(' AND ');

      // 1. Overall totals
      const totalsRes = await client.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN LOWER(c.category) = 'labor' THEN c.amount ELSE 0 END), 0) AS total_labor,
           COALESCE(SUM(CASE WHEN LOWER(c.category) = 'material' THEN c.amount ELSE 0 END), 0) AS total_material,
           COALESCE(SUM(c.amount), 0) AS grand_total
         FROM cost_entries c
         WHERE ${whereClause}`,
        params,
      );

      const totalLabor = parseFloat(totalsRes.rows[0]?.total_labor || '0');
      const totalMaterial = parseFloat(totalsRes.rows[0]?.total_material || '0');
      const grandTotal = parseFloat(totalsRes.rows[0]?.grand_total || '0');

      // 2. byProject GROUP BY
      const byProjectRes = await client.query(
        `SELECT 
           p.id AS "projectId",
           p.name AS "projectName",
           COALESCE(SUM(c.amount), 0) AS "totalAmount"
         FROM cost_entries c
         JOIN projects p ON c.project_id = p.id AND c.company_id = p.company_id
         WHERE ${whereClause}
         GROUP BY p.id, p.name
         ORDER BY "totalAmount" DESC`,
        params,
      );

      // 3. byBranch GROUP BY
      const byBranchRes = await client.query(
        `SELECT 
           b.id AS "branchId",
           b.name AS "branchName",
           COALESCE(SUM(c.amount), 0) AS "totalAmount"
         FROM cost_entries c
         JOIN branches b ON c.branch_id = b.id AND c.company_id = b.company_id
         WHERE ${whereClause}
         GROUP BY b.id, b.name
         ORDER BY "totalAmount" DESC`,
        params,
      );

      // 4. byCategory GROUP BY
      const byCategoryRes = await client.query(
        `SELECT 
           c.category,
           COALESCE(SUM(c.amount), 0) AS "totalAmount"
         FROM cost_entries c
         WHERE ${whereClause}
         GROUP BY c.category
         ORDER BY "totalAmount" DESC`,
        params,
      );

      return {
        totalLabor,
        totalMaterial,
        grandTotal,
        byProject: byProjectRes.rows.map((r) => ({
          ...r,
          totalAmount: parseFloat(r.totalAmount),
        })),
        byBranch: byBranchRes.rows.map((r) => ({
          ...r,
          totalAmount: parseFloat(r.totalAmount),
        })),
        byCategory: byCategoryRes.rows.map((r) => ({
          ...r,
          totalAmount: parseFloat(r.totalAmount),
        })),
      };
    });
  }

  /**
   * Auto-calculate estimated labor costs from attendance records
   * Formula: (days_present * daily_wage) + (overtime_hours * (daily_wage / 8 * 1.5))
   */
  async autoCalculateLaborCosts(companyId: string, query: QueryCostDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = [
        'a.company_id = $1',
        "s.code IN ('present', 'late')",
      ];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.fromDate) {
        conditions.push(`a.date >= $${paramIdx++}`);
        params.push(query.fromDate);
      }

      if (query.toDate) {
        conditions.push(`a.date <= $${paramIdx++}`);
        params.push(query.toDate);
      }

      if (query.projectId) {
        conditions.push(`a.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      if (query.branchId) {
        conditions.push(`a.branch_id = $${paramIdx++}`);
        params.push(query.branchId);
      }

      const whereClause = conditions.join(' AND ');

      const sql = `
        SELECT 
          e.id AS "employeeId",
          e.name AS "employeeName",
          e.code AS "employeeCode",
          COALESCE(e.daily_wage, 0) AS "dailyWage",
          a.project_id AS "projectId",
          p.name AS "projectName",
          COUNT(a.id)::int AS "daysPresent",
          COALESCE(SUM(a.overtime_hours), 0) AS "overtimeHours",
          ROUND(
            (COUNT(a.id) * COALESCE(e.daily_wage, 0)) + 
            (COALESCE(SUM(a.overtime_hours), 0) * (COALESCE(e.daily_wage, 0) / 8.0 * 1.5)),
            2
          ) AS "estimatedLaborCost"
        FROM attendance a
        JOIN attendance_statuses s ON a.status_id = s.id
        JOIN employees e ON a.employee_id = e.id AND a.company_id = e.company_id
        LEFT JOIN projects p ON a.project_id = p.id AND a.company_id = p.company_id
        WHERE ${whereClause}
        GROUP BY e.id, e.name, e.code, e.daily_wage, a.project_id, p.name
        ORDER BY e.name ASC
      `;

      const res = await client.query(sql, params);

      let totalEstimatedLaborCost = 0;
      const employeeSet = new Set<string>();

      const data = res.rows.map((row) => {
        employeeSet.add(row.employeeId);
        const cost = parseFloat(row.estimatedLaborCost || '0');
        totalEstimatedLaborCost += cost;
        return {
          ...row,
          dailyWage: parseFloat(row.dailyWage || '0'),
          overtimeHours: parseFloat(row.overtimeHours || '0'),
          estimatedLaborCost: cost,
        };
      });

      return {
        data,
        totalEstimatedLaborCost: Number(totalEstimatedLaborCost.toFixed(2)),
        employeeCount: employeeSet.size,
      };
    });
  }
}
