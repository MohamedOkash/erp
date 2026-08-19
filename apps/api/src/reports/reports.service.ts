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
        `(created_by = $2::uuid OR is_public = true OR COALESCE(query_config->'sharedUserIds', '[]'::jsonb)::jsonb ? $2::text)`,
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

  /**
   * Comprehensive Financial Report & Break-even Analysis for a Project (SACODECO Logic)
   */
  async getProjectFinancialReport(companyId: string, projectId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      // 1. Fetch Project basic details
      const projectRes = await client.query(
        `SELECT p.id, p.name, p.code, p.status,
                p.start_date, p.end_date, b.name AS branch_name
         FROM projects p
         LEFT JOIN branches b ON p.branch_id = b.id
         WHERE p.id = $1 AND p.company_id = $2`,
        [projectId, companyId],
      );

      if (projectRes.rows.length === 0) {
        throw new NotFoundException(`Project with ID '${projectId}' not found`);
      }
      const project = projectRes.rows[0];

      // 2. Fetch all project cost expenses grouped by category
      const costsRes = await client.query(
        `SELECT category, SUM(amount) AS total_amount
         FROM cost_entries
         WHERE project_id = $1 AND company_id = $2
         GROUP BY category`,
        [projectId, companyId],
      );

      let materialExpenses = 0;
      let laborExpenses = 0;
      let equipmentExpenses = 0;
      let overheadExpenses = 0;
      let otherExpenses = 0;

      for (const c of costsRes.rows) {
        const cat = (c.category || '').toLowerCase();
        const amt = Number(c.total_amount) || 0;
        if (cat.includes('material') || cat.includes('مواد') || cat.includes('خامات')) {
          materialExpenses += amt;
        } else if (cat.includes('labor') || cat.includes('عمالة') || cat.includes('اجور')) {
          laborExpenses += amt;
        } else if (cat.includes('equipment') || cat.includes('معدات') || cat.includes('الات')) {
          equipmentExpenses += amt;
        } else if (cat.includes('overhead') || cat.includes('ادارية') || cat.includes('عمومية')) {
          overheadExpenses += amt;
        } else {
          otherExpenses += amt;
        }
      }

      // 3. Fetch production records labor cost if costs table has 0 direct labor
      const prodLaborRes = await client.query(
        `SELECT 
           COALESCE(SUM(pw.hours_worked * (e.daily_wage / 8.0)), 0) AS calc_labor,
           COALESCE(SUM(pr.actual_quantity), 0) AS total_executed_qty
         FROM production_records pr
         LEFT JOIN production_workers pw ON pr.id = pw.production_record_id
         LEFT JOIN employees e ON pw.employee_id = e.id
         WHERE pr.project_id = $1 AND pr.company_id = $2`,
        [projectId, companyId],
      );
      const calculatedLabor = Number(prodLaborRes.rows[0]?.calc_labor) || 0;
      if (laborExpenses === 0 && calculatedLabor > 0) {
        laborExpenses = calculatedLabor;
      }

      // 4. Fetch BOQ Items and Weighted Executed Revenue
      const boqItemsRes = await client.query(
        `SELECT 
           bi.id AS boq_item_id,
           bi.work_item_id,
           w.name AS work_item_name,
           w.code AS work_item_code,
           w.category AS work_item_category,
           bi.total_quantity AS boq_quantity,
           bi.unit_rate AS contract_unit_price,
           u.symbol AS unit_symbol,
           p.material_price,
           p.labor_rate_skilled,
           p.labor_rate_unskilled,
           w.default_daily_target,
           COALESCE(v.total_weighted_done, 0) AS executed_quantity
         FROM boq_items bi
         JOIN boq b ON bi.boq_id = b.id
         JOIN work_items w ON bi.work_item_id = w.id
         LEFT JOIN units u ON bi.unit_id = u.id
         LEFT JOIN LATERAL (
           SELECT contract_price, material_price, labor_rate_skilled, labor_rate_unskilled
           FROM work_item_prices
           WHERE work_item_id = w.id AND company_id = w.company_id
           ORDER BY effective_from DESC, created_at DESC
           LIMIT 1
         ) p ON true
         LEFT JOIN (
           SELECT work_item_id, SUM(weighted_done) AS total_weighted_done
           FROM v_boq_progress_weighted
           WHERE project_id = $1 AND company_id = $2
           GROUP BY work_item_id
         ) v ON bi.work_item_id = v.work_item_id
         WHERE b.project_id = $1 AND b.company_id = $2`,
        [projectId, companyId],
      );

      // Default overhead if none recorded: 8% of total project contract value or budget
      const contractValue = Number(project.contract_value || project.budget || 500000);
      if (overheadExpenses === 0) {
        overheadExpenses = contractValue * 0.08;
      }

      let totalExecutedRevenue = 0;
      let totalBoqContractValue = 0;

      const workItemBreakEvenList = boqItemsRes.rows.map((row: any) => {
        const boqQty = Number(row.boq_quantity) || 0;
        const executedQty = Number(row.executed_quantity) || 0;
        const contractUnitPrice = Number(row.contract_unit_price) || Number(row.contract_price) || 100;
        const unitMaterialCost = Number(row.material_price) || 20;
        
        // Labor cost per unit calculation (based on standard productivity)
        const dailyTarget = Number(row.default_daily_target) || 20;
        const skilledRate = Number(row.labor_rate_skilled) || 250;
        const unskilledRate = Number(row.labor_rate_unskilled) || 180;
        const crewDaily = skilledRate + unskilledRate;
        const unitLaborCost = dailyTarget > 0 ? crewDaily / dailyTarget : 25;

        const variableUnitCost = unitMaterialCost + unitLaborCost;
        const unitContributionMargin = contractUnitPrice - variableUnitCost;
        const marginPct = contractUnitPrice > 0 ? (unitContributionMargin / contractUnitPrice) * 100 : 0;

        // Allocate a proportion of overhead to this work item based on its BOQ value share
        const itemTotalContractVal = boqQty * contractUnitPrice;
        totalBoqContractValue += itemTotalContractVal;
        totalExecutedRevenue += executedQty * contractUnitPrice;

        return {
          workItemId: row.work_item_id,
          name: row.work_item_name,
          code: row.work_item_code,
          category: row.work_item_category,
          unit: row.unit_symbol || 'م²',
          boqQuantity: boqQty,
          executedQuantity: executedQty,
          contractUnitPrice,
          unitMaterialCost,
          unitLaborCost: Number(unitLaborCost.toFixed(2)),
          variableUnitCost: Number(variableUnitCost.toFixed(2)),
          unitContributionMargin: Number(unitContributionMargin.toFixed(2)),
          marginPct: Number(marginPct.toFixed(1)),
          itemContractValue: itemTotalContractVal,
        };
      });

      // Now calculate allocated overhead & break-even units per work item
      const workItemAnalysis = workItemBreakEvenList.map((item) => {
        const valueShare = totalBoqContractValue > 0 ? item.itemContractValue / totalBoqContractValue : (1 / Math.max(1, workItemBreakEvenList.length));
        const allocatedOverhead = overheadExpenses * valueShare;
        
        // Break-even Units = Fixed Overhead / (Price - Variable Cost per Unit)
        const breakEvenUnits = item.unitContributionMargin > 0
          ? Math.ceil(allocatedOverhead / item.unitContributionMargin)
          : 0;

        const breakEvenRevenue = breakEvenUnits * item.contractUnitPrice;
        const breakEvenProgressPct = breakEvenUnits > 0
          ? Number(((item.executedQuantity / breakEvenUnits) * 100).toFixed(1))
          : 100;
        const remainingToBreakEven = Math.max(0, breakEvenUnits - item.executedQuantity);

        return {
          ...item,
          allocatedOverhead: Number(allocatedOverhead.toFixed(2)),
          breakEvenUnits,
          breakEvenRevenue: Number(breakEvenRevenue.toFixed(2)),
          breakEvenProgressPct,
          remainingToBreakEven,
          isBreakEvenReached: item.executedQuantity >= breakEvenUnits,
        };
      });

      // If no BOQ revenue, fallback to contract value or budget
      const finalRevenue = totalExecutedRevenue > 0 ? totalExecutedRevenue : contractValue;
      const directCosts = materialExpenses + laborExpenses + equipmentExpenses + otherExpenses;
      const totalCost = directCosts + overheadExpenses;
      const grossProfit = finalRevenue - directCosts;
      const netProfit = finalRevenue - totalCost;
      const grossMarginPct = finalRevenue > 0 ? Number(((grossProfit / finalRevenue) * 100).toFixed(2)) : 0;
      const netProfitMarginPct = finalRevenue > 0 ? Number(((netProfit / finalRevenue) * 100).toFixed(2)) : 0;

      return {
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
          branchName: project.branch_name,
          status: project.status,
          contractValue,
          budget: Number(project.budget || 0),
          startDate: project.start_date,
          endDate: project.end_date,
        },
        financialSummary: {
          revenue: Number(finalRevenue.toFixed(2)),
          totalExecutedRevenue: Number(totalExecutedRevenue.toFixed(2)),
          directCosts: {
            material: Number(materialExpenses.toFixed(2)),
            labor: Number(laborExpenses.toFixed(2)),
            equipment: Number(equipmentExpenses.toFixed(2)),
            other: Number(otherExpenses.toFixed(2)),
            totalDirect: Number(directCosts.toFixed(2)),
          },
          overheadExpenses: Number(overheadExpenses.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          grossProfit: Number(grossProfit.toFixed(2)),
          grossMarginPct,
          netProfit: Number(netProfit.toFixed(2)),
          netProfitMarginPct,
        },
        costStructurePercentages: {
          materialPct: totalCost > 0 ? Number(((materialExpenses / totalCost) * 100).toFixed(1)) : 0,
          laborPct: totalCost > 0 ? Number(((laborExpenses / totalCost) * 100).toFixed(1)) : 0,
          equipmentPct: totalCost > 0 ? Number(((equipmentExpenses / totalCost) * 100).toFixed(1)) : 0,
          overheadPct: totalCost > 0 ? Number(((overheadExpenses / totalCost) * 100).toFixed(1)) : 0,
          otherPct: totalCost > 0 ? Number(((otherExpenses / totalCost) * 100).toFixed(1)) : 0,
        },
        workItems: workItemAnalysis,
      };
    });
  }
}
