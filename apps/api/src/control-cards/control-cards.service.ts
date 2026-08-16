import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ControlCardsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 1) List control cards summary for work items
   */
  async getControlCardsList(
    companyId: string,
    query: { projectId?: string; categoryId?: string; search?: string },
  ) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['w.company_id = $1', 'w.is_active = true'];
      const params: any[] = [companyId];
      let pIdx = 2;

      if (query.categoryId) {
        conditions.push(`w.category_id = $${pIdx++}`);
        params.push(query.categoryId);
      }

      if (query.search) {
        conditions.push(`(w.name ILIKE $${pIdx} OR w.code ILIKE $${pIdx} OR w.category ILIKE $${pIdx})`);
        params.push(`%${query.search}%`);
        pIdx++;
      }

      const whereClause = conditions.join(' AND ');

      // Get work items with unit and category
      const sql = `
        SELECT 
          w.id AS work_item_id,
          w.name,
          w.code,
          w.category,
          w.category_id,
          w.default_daily_target,
          w.default_unit_rate,
          u.name AS unit_name,
          u.symbol AS unit_symbol,
          p.contract_price,
          p.material_price,
          p.labor_rate_skilled,
          p.labor_rate_unskilled
        FROM work_items w
        LEFT JOIN units u ON w.unit_id = u.id
        LEFT JOIN LATERAL (
          SELECT contract_price, material_price, labor_rate_skilled, labor_rate_unskilled
          FROM work_item_prices
          WHERE work_item_id = w.id AND company_id = w.company_id
          ORDER BY effective_from DESC, created_at DESC
          LIMIT 1
        ) p ON true
        WHERE ${whereClause}
        ORDER BY w.created_at ASC
      `;

      const res = await client.query(sql, params);

      // Get progress if projectId provided
      let progressMap: Record<string, { boqQty: number; weightedDone: number; progressPct: number }> = {};
      if (query.projectId) {
        const progRes = await client.query(
          `SELECT work_item_id, 
                  SUM(weighted_done) AS total_weighted_done,
                  MAX(boq_quantity) AS boq_qty,
                  CASE WHEN MAX(boq_quantity) > 0 THEN (SUM(weighted_done) / MAX(boq_quantity)) * 100 ELSE 0 END AS progress_pct
           FROM v_boq_progress_weighted
           WHERE company_id = $1 AND project_id = $2
           GROUP BY work_item_id`,
          [companyId, query.projectId],
        );
        progRes.rows.forEach((r: any) => {
          progressMap[r.work_item_id] = {
            boqQty: Number(r.boq_qty) || 0,
            weightedDone: Number(r.total_weighted_done) || 0,
            progressPct: Number(Number(r.progress_pct).toFixed(1)) || 0,
          };
        });
      }

      // Format response cards
      return res.rows.map((row: any) => {
        const perDay = Number(row.default_daily_target) || 20;
        const skilledDaily = Number(row.labor_rate_skilled) || 224;
        const unskilledDaily = Number(row.labor_rate_unskilled) || 208;
        const crewDailyCost = skilledDaily * 1 + unskilledDaily * 1; // 432
        const laborCostPerUnit = perDay > 0 ? Number((crewDailyCost / perDay).toFixed(2)) : 0;
        const price = Number(row.contract_price || row.default_unit_rate || 0);
        const materialPrice = Number(row.material_price || 0);
        const marginPerUnit = Number((price - materialPrice - laborCostPerUnit).toFixed(2));
        const liveProg = progressMap[row.work_item_id] || { boqQty: 0, weightedDone: 0, progressPct: 0 };

        return {
          workItemId: row.work_item_id,
          name: row.name,
          code: row.code,
          category: row.category,
          unit: row.unit_symbol || row.unit_name || 'م²',
          totalPerDay: perDay,
          crewDailyCost,
          laborCostPerUnit,
          contractPrice: price,
          materialPrice,
          marginPerUnit,
          progressPct: liveProg.progressPct,
        };
      });
    });
  }

  /**
   * 2) Get Full Live Control Card for a specific Work Item
   */
  async getControlCardDetail(
    companyId: string,
    workItemId: string,
    projectId?: string,
  ) {
    return this.db.withTenantClient(companyId, async (client) => {
      // 1. Fetch item
      const itemRes = await client.query(
        `SELECT w.id, w.name, w.code, w.category, w.default_daily_target, w.default_unit_rate,
                u.name AS unit_name, u.symbol AS unit_symbol
         FROM work_items w
         LEFT JOIN units u ON w.unit_id = u.id
         WHERE w.id = $1 AND w.company_id = $2`,
        [workItemId, companyId],
      );

      if (itemRes.rows.length === 0) {
        throw new NotFoundException(`Work item ${workItemId} not found`);
      }
      const itemRow = itemRes.rows[0];

      // 2. Fetch stages
      const stagesRes = await client.query(
        `SELECT id, name, code, percentage, standard_productivity,
                COALESCE(crew_skilled_count, 1) AS crew_skilled_count,
                COALESCE(crew_unskilled_count, 1) AS crew_unskilled_count,
                sort_order
         FROM work_item_stages
         WHERE work_item_id = $1 AND company_id = $2 AND is_active = true
         ORDER BY sort_order ASC, created_at ASC`,
        [workItemId, companyId],
      );

      // 3. Fetch latest prices
      const priceRes = await client.query(
        `SELECT contract_price, material_price, labor_rate_skilled, labor_rate_unskilled
         FROM work_item_prices
         WHERE work_item_id = $1 AND company_id = $2
         ORDER BY effective_from DESC, created_at DESC
         LIMIT 1`,
        [workItemId, companyId],
      );
      const priceRow = priceRes.rows[0] || {};

      // 4. Fetch company standard labor rates
      const ratesRes = await client.query(
        `SELECT rate_type, daily_rate FROM labor_rates WHERE company_id = $1`,
        [companyId],
      );
      let skilledDaily = Number(priceRow.labor_rate_skilled) || 224;
      let unskilledDaily = Number(priceRow.labor_rate_unskilled) || 208;
      ratesRes.rows.forEach((r: any) => {
        if (r.rate_type === 'skilled' && !priceRow.labor_rate_skilled) skilledDaily = Number(r.daily_rate);
        if (r.rate_type === 'unskilled' && !priceRow.labor_rate_unskilled) unskilledDaily = Number(r.daily_rate);
      });

      // Calculations
      const perDay = Number(itemRow.default_daily_target) || 20;

      const formattedStages = stagesRes.rows.map((stg: any) => {
        const percentage = Number(stg.percentage) || 0;
        const standardProductivity = Number(stg.standard_productivity) || perDay;
        const actualTotalProductivity = Number((percentage * perDay).toFixed(2));
        return {
          id: stg.id,
          name: stg.name,
          code: stg.code,
          percentage,
          standardProductivity,
          actualTotalProductivity,
          crew: {
            skilled: Number(stg.crew_skilled_count) || 1,
            unskilled: Number(stg.crew_unskilled_count) || 1,
          },
        };
      });

      // Crew calculations (from first stage or standard)
      const primaryCrew = formattedStages[0]?.crew || { skilled: 1, unskilled: 1 };
      const totalCrewMembers = primaryCrew.skilled + primaryCrew.unskilled; // 2
      const perHour = totalCrewMembers > 0 ? Number((perDay / (totalCrewMembers * 8)).toFixed(2)) : 0; // 20 / 16 = 1.25

      const crewDailyCost = skilledDaily * primaryCrew.skilled + unskilledDaily * primaryCrew.unskilled; // 432
      const laborCostPerUnit = perDay > 0 ? Number((crewDailyCost / perDay).toFixed(2)) : 0; // 21.6

      const price = Number(priceRow.contract_price || itemRow.default_unit_rate || 0); // 235
      const materialPrice = Number(priceRow.material_price || 0); // 0
      const marginPerUnit = Number((price - materialPrice - laborCostPerUnit).toFixed(2)); // 213.4

      // Live metrics from site executions
      let liveMetrics = {
        boqQuantity: 0,
        weightedDone: 0,
        progressPct: 0,
        actualDailyAvg: 0,
        variancePct: 0,
        remainingDays: 0,
      };

      if (projectId) {
        // BOQ quantity
        const boqRes = await client.query(
          `SELECT total_quantity FROM boq_items 
           WHERE work_item_id = $1 AND company_id = $2`,
          [workItemId, companyId],
        );
        const boqQty = Number(boqRes.rows[0]?.total_quantity) || 0;

        // Weighted progress
        const progRes = await client.query(
          `SELECT SUM(weighted_done) AS total_weighted_done
           FROM v_boq_progress_weighted
           WHERE work_item_id = $1 AND project_id = $2 AND company_id = $3`,
          [workItemId, projectId, companyId],
        );
        const weightedDone = Number(progRes.rows[0]?.total_weighted_done) || 0;
        const progressPct = boqQty > 0 ? Number(((weightedDone / boqQty) * 100).toFixed(1)) : 0;

        // Average actual execution over last 7 active days
        const avgRes = await client.query(
          `SELECT date, SUM(actual_quantity) AS day_qty
           FROM production_records
           WHERE work_item_id = $1 AND project_id = $2 AND company_id = $3 AND status = 'final_approved'
           GROUP BY date
           ORDER BY date DESC
           LIMIT 7`,
          [workItemId, projectId, companyId],
        );

        let actualDailyAvg = 0;
        if (avgRes.rows.length > 0) {
          const totalRecent = avgRes.rows.reduce((acc: number, r: any) => acc + Number(r.day_qty), 0);
          actualDailyAvg = Number((totalRecent / avgRes.rows.length).toFixed(1));
        }

        const variancePct = perDay > 0 && actualDailyAvg > 0 
          ? Number((((actualDailyAvg - perDay) / perDay) * 100).toFixed(1)) 
          : 0;

        const remainingQty = Math.max(0, boqQty - weightedDone);
        const remainingDays = actualDailyAvg > 0 
          ? Number((remainingQty / actualDailyAvg).toFixed(1)) 
          : perDay > 0 ? Number((remainingQty / perDay).toFixed(1)) : 0;

        liveMetrics = {
          boqQuantity: boqQty,
          weightedDone,
          progressPct,
          actualDailyAvg,
          variancePct,
          remainingDays,
        };
      }

      return {
        item: {
          id: itemRow.id,
          name: itemRow.name,
          code: itemRow.code,
          unit: itemRow.unit_symbol || itemRow.unit_name || 'م²',
        },
        stages: formattedStages,
        totals: {
          perDay,
          perHour,
        },
        labor: {
          skilledDaily,
          unskilledDaily,
          crewDailyCost,
          laborCostPerUnit,
        },
        contract: {
          price,
          materialPrice,
          marginPerUnit,
        },
        live: liveMetrics,
      };
    });
  }

  /**
   * 3) Daily Control Report for Project
   */
  async getDailyControlReport(
    companyId: string,
    projectId: string,
    date: string,
  ) {
    return this.db.withTenantClient(companyId, async (client) => {
      const sql = `
        SELECT 
          pr.id AS record_id,
          pr.date,
          pr.work_item_id,
          w.name AS work_item_name,
          w.code AS work_item_code,
          w.default_daily_target AS item_daily_target,
          u.symbol AS unit_symbol,
          u.name AS unit_name,
          pr.work_item_stage_id,
          wis.name AS stage_name,
          wis.percentage AS stage_percentage,
          wis.standard_productivity AS stage_standard_productivity,
          pr.actual_quantity,
          pr.target_quantity,
          pr.status,
          emp.name AS supervisor_name,
          COUNT(DISTINCT pw.employee_id) AS workers_count,
          SUM(
            CASE 
              WHEN pw.skill_level = 'skilled' THEN 224.00 * (COALESCE(pw.hours_worked, 8) / 8.0) + (COALESCE(pw.overtime_hours, 0) * (224.00 / 8.0 * 1.5))
              ELSE 208.00 * (COALESCE(pw.hours_worked, 8) / 8.0) + (COALESCE(pw.overtime_hours, 0) * (208.00 / 8.0 * 1.5))
            END
          ) AS daily_labor_cost
        FROM production_records pr
        JOIN work_items w ON pr.work_item_id = w.id
        LEFT JOIN units u ON w.unit_id = u.id
        LEFT JOIN work_item_stages wis ON pr.work_item_stage_id = wis.id
        LEFT JOIN employees emp ON pr.supervisor_id = emp.id
        LEFT JOIN production_workers pw ON pr.id = pw.production_record_id
        WHERE pr.company_id = $1 
          AND pr.project_id = $2 
          AND pr.date = $3
          AND pr.status NOT IN ('rejected', 'cancelled')
        GROUP BY pr.id, pr.date, pr.work_item_id, w.name, w.code, w.default_daily_target,
                 u.symbol, u.name, pr.work_item_stage_id, wis.name, wis.percentage,
                 wis.standard_productivity, pr.actual_quantity, pr.target_quantity,
                 pr.status, emp.name
        ORDER BY w.name ASC, pr.created_at ASC
      `;

      const res = await client.query(sql, [companyId, projectId, date]);

      return res.rows.map((row: any) => {
        const actualQuantity = Number(row.actual_quantity) || 0;
        const stagePercentage = Number(row.stage_percentage) || 1.0;
        const weightedDone = Number((actualQuantity * stagePercentage).toFixed(2));
        const standardTarget = Number(row.target_quantity || row.stage_standard_productivity || row.item_daily_target || 1);
        const productivityPct = standardTarget > 0 ? Number(((actualQuantity / standardTarget) * 100).toFixed(1)) : 100;
        const workersCount = Number(row.workers_count) || 1;
        const dailyLaborCost = Number(Number(row.daily_labor_cost || 432).toFixed(2));

        return {
          recordId: row.record_id,
          date: row.date,
          workItemId: row.work_item_id,
          workItemName: row.work_item_name,
          workItemCode: row.work_item_code,
          stageId: row.work_item_stage_id,
          stageName: row.stage_name || 'كامل البند',
          unit: row.unit_symbol || row.unit_name || 'م²',
          actualQuantity,
          stagePercentage,
          weightedDone,
          workersCount,
          dailyLaborCost,
          standardTarget,
          productivityPct,
          status: row.status,
          supervisorName: row.supervisor_name || 'مشرف الموقع',
        };
      });
    });
  }
}
