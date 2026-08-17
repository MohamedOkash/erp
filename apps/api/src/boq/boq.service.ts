import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ScopeService } from '../common/services/scope.service';
import { AuthenticatedUser } from '../auth/auth.service';
import { QueryBoqDto } from './dto/query-boq.dto';

@Injectable()
export class BoqService {
  constructor(
    private readonly db: DatabaseService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * Get BOQ progress list (total, executed, remaining, progress percentage)
   */
  async getBoqProgress(
    companyId: string,
    query: QueryBoqDto,
    user?: AuthenticatedUser,
  ) {
    if (user && query.projectId) {
      await this.scopeService.assertProjectInScope(user, query.projectId);
    }
    const projectScope = user ? await this.scopeService.getProjectScope(user) : null;

    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['bi.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (projectScope !== null) {
        if (projectScope.length === 0) {
          return { data: [], total: 0, page: 1, limit: query.limit || 20, totalPages: 0 };
        }
        conditions.push(`b.project_id = ANY($${paramIdx++}::uuid[])`);
        params.push(projectScope);
      }

      if (query.projectId) {
        conditions.push(`b.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      if (query.branchId) {
        conditions.push(`p.branch_id = $${paramIdx++}`);
        params.push(query.branchId);
      }

      if (query.workItemId) {
        conditions.push(`bi.work_item_id = $${paramIdx++}`);
        params.push(query.workItemId);
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM boq_items bi
         JOIN boq b ON bi.boq_id = b.id AND bi.company_id = b.company_id
         LEFT JOIN projects p ON b.project_id = p.id AND b.company_id = p.company_id
         WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          bi.id AS boq_item_id,
          bi.company_id,
          bi.boq_id,
          bi.item_code AS item_number,
          bi.description,
          bi.total_quantity,
          bi.unit_rate,
          bi.total_amount AS total_price,
          b.project_id,
          b.name AS boq_title,
          p.branch_id,
          p.name AS project_name,
          br.name AS branch_name,
          w.id AS work_item_id,
          w.name AS work_item_name,
          w.code AS work_item_code,
          u.name AS unit_name,
          u.symbol AS unit_symbol,
          COALESCE(prod.executed_quantity, 0) AS executed_quantity
        FROM boq_items bi
        JOIN boq b ON bi.boq_id = b.id AND bi.company_id = b.company_id
        LEFT JOIN projects p ON b.project_id = p.id AND b.company_id = p.company_id
        LEFT JOIN branches br ON p.branch_id = br.id AND p.company_id = br.company_id
        LEFT JOIN work_items w ON bi.work_item_id = w.id AND bi.company_id = w.company_id
        LEFT JOIN units u ON bi.unit_id = u.id AND bi.company_id = u.company_id
        LEFT JOIN (
          SELECT 
            company_id, project_id, work_item_id,
            SUM(actual_quantity) AS executed_quantity
          FROM production_records
          WHERE status = 'final_approved'
          GROUP BY company_id, project_id, work_item_id
        ) prod ON prod.company_id = bi.company_id AND prod.project_id = b.project_id AND prod.work_item_id = bi.work_item_id
        WHERE ${whereClause}
        ORDER BY b.project_id, bi.sort_order, bi.created_at ASC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      const dataRes = await client.query(dataSql, [...params, limit, offset]);

      const formattedData = dataRes.rows.map((row) => {
        const totalQty = parseFloat(row.total_quantity || '0');
        const executedQty = parseFloat(row.executed_quantity || '0');
        const remainingQty = Math.max(0, totalQty - executedQty);
        const progressPercentage = totalQty > 0 ? (executedQty / totalQty) * 100 : 0;

        return {
          id: row.boq_item_id,
          boqId: row.boq_id,
          itemNumber: row.item_number,
          description: row.description,
          projectId: row.project_id,
          projectName: row.project_name,
          branchId: row.branch_id,
          branchName: row.branch_name,
          workItemId: row.work_item_id,
          workItemName: row.work_item_name,
          unitName: row.unit_name,
          unitSymbol: row.unit_symbol,
          unitRate: parseFloat(row.unit_rate || '0'),
          totalPrice: parseFloat(row.total_price || '0'),
          totalQuantity: totalQty,
          executedQuantity: executedQty,
          remainingQuantity: remainingQty,
          progressPercentage: Number(progressPercentage.toFixed(2)),
        };
      });

      return {
        data: formattedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      };
    });
  }

  /**
   * Get single BOQ progress by ID
   */
  async getBoqItemProgressById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT 
           bi.id AS boq_item_id,
           bi.company_id,
           bi.boq_id,
           bi.item_code AS item_number,
           bi.description,
           bi.total_quantity,
           bi.unit_rate,
           bi.total_amount AS total_price,
           b.project_id,
           b.name AS boq_title,
           p.branch_id,
           p.name AS project_name,
           br.name AS branch_name,
           w.id AS work_item_id,
           w.name AS work_item_name,
           u.name AS unit_name,
           u.symbol AS unit_symbol,
           COALESCE(prod.executed_quantity, 0) AS executed_quantity
         FROM boq_items bi
         JOIN boq b ON bi.boq_id = b.id AND bi.company_id = b.company_id
         LEFT JOIN projects p ON b.project_id = p.id AND b.company_id = p.company_id
         LEFT JOIN branches br ON p.branch_id = br.id AND p.company_id = br.company_id
         LEFT JOIN work_items w ON bi.work_item_id = w.id AND bi.company_id = w.company_id
         LEFT JOIN units u ON bi.unit_id = u.id AND bi.company_id = u.company_id
         LEFT JOIN (
           SELECT 
             company_id, project_id, work_item_id,
             SUM(actual_quantity) AS executed_quantity
          FROM production_records
          WHERE status = 'final_approved'
          GROUP BY company_id, project_id, work_item_id
         ) prod ON prod.company_id = bi.company_id AND prod.project_id = b.project_id AND prod.work_item_id = bi.work_item_id
         WHERE bi.company_id = $1 AND bi.id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'BOQ_ITEM_NOT_FOUND',
          message: 'BOQ item not found',
        });
      }

      const row = res.rows[0];
      const totalQty = parseFloat(row.total_quantity || '0');
      const executedQty = parseFloat(row.executed_quantity || '0');
      const remainingQty = Math.max(0, totalQty - executedQty);
      const progressPercentage = totalQty > 0 ? (executedQty / totalQty) * 100 : 0;

      return {
        id: row.boq_item_id,
        boqId: row.boq_id,
        itemNumber: row.item_number,
        description: row.description,
        projectId: row.project_id,
        projectName: row.project_name,
        branchId: row.branch_id,
        branchName: row.branch_name,
        workItemId: row.work_item_id,
        workItemName: row.work_item_name,
        unitName: row.unit_name,
        unitSymbol: row.unit_symbol,
        unitRate: parseFloat(row.unit_rate || '0'),
        totalPrice: parseFloat(row.total_price || '0'),
        totalQuantity: totalQty,
        executedQuantity: executedQty,
        remainingQuantity: remainingQty,
        progressPercentage: Number(progressPercentage.toFixed(2)),
      };
    });
  }
}
