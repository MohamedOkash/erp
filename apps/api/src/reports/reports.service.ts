import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSavedReportDto } from './dto/create-saved-report.dto';
import { UpdateSavedReportDto } from './dto/update-saved-report.dto';
import { QuerySavedReportDto } from './dto/query-saved-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new saved report
   */
  async createSavedReport(companyId: string, userId: string, dto: CreateSavedReportDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const dupRes = await client.query(
        `SELECT id FROM saved_reports WHERE company_id = $1 AND name = $2 AND created_by = $3`,
        [companyId, dto.name, userId],
      );

      if (dupRes.rows.length > 0) {
        throw new ConflictException({
          code: 'SAVED_REPORT_NAME_DUPLICATE',
          message: 'A saved report with this name already exists for this user',
        });
      }

      const queryConfig = {
        filters: dto.filters || {},
        columns: dto.columns || [],
        sharedUserIds: dto.sharedUserIds || [],
      };

      const isPublic = dto.isPublic || false;

      const insertRes = await client.query(
        `INSERT INTO saved_reports (
           company_id, name, report_type, query_config, created_by, is_public
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, company_id, name, report_type, query_config, created_by, is_public, created_at, updated_at`,
        [
          companyId,
          dto.name,
          dto.reportType,
          JSON.stringify(queryConfig),
          userId,
          isPublic,
        ],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * List saved reports visible to the user
   */
  async findSavedReports(companyId: string, userId: string, query: QuerySavedReportDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const conditions: string[] = [
        'company_id = $1',
        `(created_by = $2 OR is_public = true OR (query_config->'sharedUserIds')::jsonb ? $2)`,
      ];
      const params: any[] = [companyId, userId];
      let paramIdx = 3;

      if (query.reportType) {
        conditions.push(`report_type = $${paramIdx++}`);
        params.push(query.reportType);
      }

      const whereClause = conditions.join(' AND ');

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM saved_reports WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await client.query(
        `SELECT id, company_id, name, report_type, query_config, created_by, is_public, created_at, updated_at
         FROM saved_reports
         WHERE ${whereClause}
         ORDER BY created_at DESC
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
   * Get single saved report by ID
   */
  async getSavedReportById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, name, report_type, query_config, created_by, is_public, created_at, updated_at
         FROM saved_reports
         WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'SAVED_REPORT_NOT_FOUND',
          message: 'Saved report not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Update saved report
   */
  async updateSavedReport(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateSavedReportDto,
  ) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const currentRes = await client.query(
        `SELECT * FROM saved_reports WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (currentRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'SAVED_REPORT_NOT_FOUND',
          message: 'Saved report not found',
        });
      }

      const current = currentRes.rows[0];

      if (dto.name && dto.name !== current.name) {
        const dupRes = await client.query(
          `SELECT id FROM saved_reports WHERE company_id = $1 AND name = $2 AND created_by = $3 AND id != $4`,
          [companyId, dto.name, userId, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'SAVED_REPORT_NAME_DUPLICATE',
            message: 'A saved report with this name already exists for this user',
          });
        }
      }

      const currentConfig = typeof current.query_config === 'string'
        ? JSON.parse(current.query_config)
        : current.query_config || {};

      const updatedConfig = {
        ...currentConfig,
        filters: dto.filters !== undefined ? dto.filters : currentConfig.filters,
        columns: dto.columns !== undefined ? dto.columns : currentConfig.columns,
        sharedUserIds: dto.sharedUserIds !== undefined ? dto.sharedUserIds : currentConfig.sharedUserIds,
      };

      const updateRes = await client.query(
        `UPDATE saved_reports
         SET name = COALESCE($3, name),
             report_type = COALESCE($4, report_type),
             query_config = $5,
             is_public = COALESCE($6, is_public),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, name, report_type, query_config, created_by, is_public, created_at, updated_at`,
        [
          companyId,
          id,
          dto.name || null,
          dto.reportType || null,
          JSON.stringify(updatedConfig),
          dto.isPublic !== undefined ? dto.isPublic : null,
        ],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Delete saved report
   */
  async deleteSavedReport(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM saved_reports WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'SAVED_REPORT_NOT_FOUND',
          message: 'Saved report not found',
        });
      }
    });
  }

  /**
   * Execute/Run saved report dynamically based on its report_type and filters
   */
  async runSavedReport(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const reportRes = await client.query(
        `SELECT id, name, report_type, query_config FROM saved_reports WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (reportRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'SAVED_REPORT_NOT_FOUND',
          message: 'Saved report not found',
        });
      }

      const report = reportRes.rows[0];
      const config = typeof report.query_config === 'string'
        ? JSON.parse(report.query_config)
        : report.query_config || {};

      let rows: any[] = [];
      let summary: any = {};

      if (report.report_type === 'production') {
        const res = await client.query(
          `SELECT 
             pr.id, pr.date, pr.actual_quantity, pr.target_quantity, pr.status, pr.notes,
             p.name AS project_name,
             w.name AS work_item_name,
             b.name AS branch_name
           FROM production_records pr
           LEFT JOIN projects p ON pr.project_id = p.id AND pr.company_id = p.company_id
           LEFT JOIN work_items w ON pr.work_item_id = w.id AND pr.company_id = w.company_id
           LEFT JOIN branches b ON pr.branch_id = b.id AND pr.company_id = b.company_id
           WHERE pr.company_id = $1
           ORDER BY pr.date DESC`,
          [companyId],
        );
        rows = res.rows;
        const totalQty = rows.reduce((acc, r) => acc + parseFloat(r.actual_quantity || '0'), 0);
        summary = { totalRecords: rows.length, totalActualQuantity: totalQty };
      } else if (report.report_type === 'attendance') {
        const res = await client.query(
          `SELECT 
             a.id, a.date, a.check_in_time, a.check_out_time, a.overtime_hours, a.notes,
             e.name AS employee_name,
             s.name AS status_name,
             p.name AS project_name
           FROM attendance a
           LEFT JOIN employees e ON a.employee_id = e.id AND a.company_id = e.company_id
           LEFT JOIN attendance_statuses s ON a.status_id = s.id
           LEFT JOIN projects p ON a.project_id = p.id AND a.company_id = p.company_id
           WHERE a.company_id = $1
           ORDER BY a.date DESC`,
          [companyId],
        );
        rows = res.rows;
        summary = { totalAttendanceRecords: rows.length };
      } else if (report.report_type === 'costs') {
        const res = await client.query(
          `SELECT 
             c.id, c.date, c.category, c.amount, c.description, c.reference_number,
             p.name AS project_name,
             b.name AS branch_name
           FROM cost_entries c
           LEFT JOIN projects p ON c.project_id = p.id AND c.company_id = p.company_id
           LEFT JOIN branches b ON c.branch_id = b.id AND c.company_id = b.company_id
           WHERE c.company_id = $1
           ORDER BY c.date DESC`,
          [companyId],
        );
        rows = res.rows;
        const grandTotal = rows.reduce((acc, r) => acc + parseFloat(r.amount || '0'), 0);
        summary = { totalEntries: rows.length, grandTotal };
      } else if (report.report_type === 'boq') {
        const res = await client.query(
          `SELECT 
             bi.id, bi.item_number, bi.description, bi.total_quantity, bi.unit_rate, bi.total_price,
             w.name AS work_item_name,
             u.name AS unit_name
           FROM boq_items bi
           LEFT JOIN work_items w ON bi.work_item_id = w.id AND bi.company_id = w.company_id
           LEFT JOIN units u ON bi.unit_id = u.id AND bi.company_id = u.company_id
           WHERE bi.company_id = $1
           ORDER BY bi.item_number ASC`,
          [companyId],
        );
        rows = res.rows;
        const totalPrice = rows.reduce((acc, r) => acc + parseFloat(r.total_price || '0'), 0);
        summary = { totalBoqItems: rows.length, totalPrice };
      }

      return {
        report: {
          id: report.id,
          name: report.name,
          reportType: report.report_type,
        },
        data: rows,
        total: rows.length,
        summary,
      };
    });
  }

  /**
   * Share saved report with other users
   */
  async shareSavedReport(companyId: string, id: string, userIds: string[]) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const reportRes = await client.query(
        `SELECT id, query_config FROM saved_reports WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (reportRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'SAVED_REPORT_NOT_FOUND',
          message: 'Saved report not found',
        });
      }

      const config = typeof reportRes.rows[0].query_config === 'string'
        ? JSON.parse(reportRes.rows[0].query_config)
        : reportRes.rows[0].query_config || {};

      const existingShared: string[] = Array.isArray(config.sharedUserIds) ? config.sharedUserIds : [];
      const mergedShared = Array.from(new Set([...existingShared, ...userIds]));

      config.sharedUserIds = mergedShared;

      await client.query(
        `UPDATE saved_reports
         SET query_config = $1, updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $2 AND id = $3`,
        [JSON.stringify(config), companyId, id],
      );

      return {
        sharedCount: userIds.length,
      };
    });
  }
}
