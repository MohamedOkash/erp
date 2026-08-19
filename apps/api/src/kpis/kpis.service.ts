import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface QueryCascadeKpiDto {
  projectId?: string;
  date?: string;
  foremanId?: string;
  crewId?: string;
}

@Injectable()
export class KpisService {
  constructor(private readonly db: DatabaseService) {}

  async getCascadeKpis(companyId: string, query: QueryCascadeKpiDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['pr.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.projectId) {
        conditions.push(`pr.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      if (query.date) {
        conditions.push(`pr.date = $${paramIdx++}`);
        params.push(query.date);
      }

      if (query.foremanId) {
        conditions.push(`pr.foreman_id = $${paramIdx++}`);
        params.push(query.foremanId);
      }

      if (query.crewId) {
        conditions.push(`pr.crew_id = $${paramIdx++}`);
        params.push(query.crewId);
      }

      const sql = `
        SELECT 
          pr.id AS record_id,
          pr.project_id,
          p.name AS project_name,
          pr.date AS production_date,
          pr.status AS record_status,
          pr.crew_id,
          c.code AS crew_code,
          c.crew_type,
          c.crew_number,
          ct.name AS template_name,
          pr.foreman_id,
          COALESCE(u_foreman.full_name, u_foreman.username) AS foreman_name,
          pr.engineer_approved_by,
          COALESCE(u_eng.full_name, u_eng.username) AS engineer_name,
          pr.work_area_id,
          wa.name AS work_area_name,
          wa.area_m2 AS room_area_m2,
          pr.work_item_id,
          wi.name AS work_item_name,
          wi.code AS work_item_code,
          pr.work_item_stage_id,
          wis.name AS stage_name,
          COALESCE(wis.standard_productivity, wi.default_daily_target, 20.0) AS standard_daily_target,
          COALESCE(wis.percentage, 100.0) AS stage_weight_pct,
          COALESCE(
            json_agg(
              json_build_object(
                'workerId', pw.id,
                'employeeId', pw.employee_id,
                'employeeName', e.name,
                'profession', COALESCE(e.profession, 'صنايعي'),
                'companyEmployeeId', e.company_employee_id,
                'projectEmployeeId', e.project_employee_id,
                'roleInCrew', COALESCE(pw.role_in_crew, cm.role, 'maallem'),
                'actualQuantity', COALESCE(pw.individual_quantity, 0),
                'hoursWorked', COALESCE(pw.hours_worked, 8),
                'overtimeHours', COALESCE(pw.overtime_hours, 0),
                'hourlyRate', COALESCE(e.hourly_rate, 28)
              )
            ) FILTER (WHERE pw.id IS NOT NULL),
            '[]'
          ) AS workers
        FROM production_records pr
        JOIN projects p ON pr.project_id = p.id
        LEFT JOIN crews c ON pr.crew_id = c.id
        LEFT JOIN crew_templates ct ON c.template_id = ct.id
        LEFT JOIN users u_foreman ON pr.foreman_id = u_foreman.id
        LEFT JOIN users u_eng ON pr.engineer_approved_by = u_eng.id
        LEFT JOIN work_areas wa ON pr.work_area_id = wa.id
        LEFT JOIN work_items wi ON pr.work_item_id = wi.id
        LEFT JOIN work_item_stages wis ON pr.work_item_stage_id = wis.id
        LEFT JOIN production_workers pw ON pr.id = pw.production_record_id
        LEFT JOIN employees e ON pw.employee_id = e.id
        LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.employee_id = pw.employee_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY pr.id, pr.project_id, p.name, pr.date, pr.status, pr.crew_id, c.code,
                 c.crew_type, c.crew_number, ct.name, pr.foreman_id, u_foreman.full_name, u_foreman.username,
                 pr.engineer_approved_by, u_eng.full_name, u_eng.username, pr.work_area_id, wa.name, wa.area_m2,
                 pr.work_item_id, wi.name, wi.code, pr.work_item_stage_id, wis.name,
                 wis.standard_productivity, wi.default_daily_target, wis.percentage
        ORDER BY pr.date DESC, pr.created_at DESC
      `;

      const res = await client.query(sql, params);
      const rows = res.rows;

      const flatWorkers: any[] = [];
      const crewStatsMap = new Map<string, { totalKpi: number; count: number; name: string; foremanName: string; engineerName: string }>();
      const foremanStatsMap = new Map<string, { totalKpi: number; count: number; name: string; engineerName: string }>();
      const engineerStatsMap = new Map<string, { totalKpi: number; count: number; name: string }>();

      let overallGreen = 0;
      let overallYellow = 0;
      let overallRed = 0;
      let sumWorkerKpis = 0;
      let totalEvaluatedWorkers = 0;

      for (const record of rows) {
        const standardTarget = parseFloat(record.standard_daily_target || '20') || 20;
        const workers = Array.isArray(record.workers) ? record.workers : [];

        const skilledWorkers: any[] = [];
        const helperWorkers: any[] = [];

        for (const w of workers) {
          const role = String(w.roleInCrew || '').toLowerCase();
          if (role === 'helper' || role === 'labor' || role === 'عامل') {
            helperWorkers.push(w);
          } else {
            skilledWorkers.push(w);
          }
        }

        // 1. Calculate skilled worker KPIs
        const skilledKpis: number[] = [];
        for (const w of skilledWorkers) {
          const actualQty = parseFloat(w.actualQuantity || '0');
          const efficiencyPct = Math.round((actualQty / standardTarget) * 1000) / 10;
          skilledKpis.push(efficiencyPct);

          const status = efficiencyPct >= 100 ? 'excellent' : efficiencyPct >= 80 ? 'good' : 'poor';
          const color = efficiencyPct >= 100 ? '#10b981' : efficiencyPct >= 80 ? '#f59e0b' : '#ef4444';

          if (efficiencyPct >= 100) overallGreen++;
          else if (efficiencyPct >= 80) overallYellow++;
          else overallRed++;

          sumWorkerKpis += efficiencyPct;
          totalEvaluatedWorkers++;

          flatWorkers.push({
            id: w.workerId,
            employeeId: w.employeeId,
            employeeName: w.employeeName,
            profession: w.profession,
            roleInCrew: 'skilled',
            roleLabel: 'صنايعي / معلم',
            actualQuantity: actualQty,
            standardTarget,
            unit: 'م²',
            efficiencyPct,
            status,
            color,
            crewCode: record.crew_code || record.crew_number || 'طاقم عام',
            crewType: record.crew_type || 'A',
            foremanName: record.foreman_name || 'مراقب الموقع',
            engineerName: record.engineer_name || 'مهندس الموقع',
            projectName: record.project_name,
            productionDate: record.production_date,
            workItemName: record.work_item_name,
            stageName: record.stage_name,
            roomName: record.work_area_name,
          });
        }

        // 2. Helper KPI = Average of Skilled Craftsmen in their Crew
        const avgSkilledKpi = skilledKpis.length > 0
          ? Math.round((skilledKpis.reduce((a, b) => a + b, 0) / skilledKpis.length) * 10) / 10
          : 100;

        for (const h of helperWorkers) {
          const efficiencyPct = avgSkilledKpi;
          const status = efficiencyPct >= 100 ? 'excellent' : efficiencyPct >= 80 ? 'good' : 'poor';
          const color = efficiencyPct >= 100 ? '#10b981' : efficiencyPct >= 80 ? '#f59e0b' : '#ef4444';

          if (efficiencyPct >= 100) overallGreen++;
          else if (efficiencyPct >= 80) overallYellow++;
          else overallRed++;

          sumWorkerKpis += efficiencyPct;
          totalEvaluatedWorkers++;

          flatWorkers.push({
            id: h.workerId,
            employeeId: h.employeeId,
            employeeName: h.employeeName,
            profession: h.profession || 'مساعد',
            roleInCrew: 'helper',
            roleLabel: 'عامل مساعد (متوسط الطاقم)',
            actualQuantity: null, // Helpers do not log independent meters
            standardTarget,
            unit: 'م²',
            efficiencyPct,
            status,
            color,
            crewCode: record.crew_code || record.crew_number || 'طاقم عام',
            crewType: record.crew_type || 'A',
            foremanName: record.foreman_name || 'مراقب الموقع',
            engineerName: record.engineer_name || 'مهندس الموقع',
            projectName: record.project_name,
            productionDate: record.production_date,
            workItemName: record.work_item_name,
            stageName: record.stage_name,
            roomName: record.work_area_name,
          });
        }

        // Aggregate crew stats
        const crewKey = record.crew_id || record.crew_code || 'default_crew';
        const crewEntry = crewStatsMap.get(crewKey) || {
          totalKpi: 0,
          count: 0,
          name: record.crew_code || 'طاقم عام',
          foremanName: record.foreman_name || 'مراقب الموقع',
          engineerName: record.engineer_name || 'مهندس الموقع',
        };
        crewEntry.totalKpi += avgSkilledKpi;
        crewEntry.count += 1;
        crewStatsMap.set(crewKey, crewEntry);

        // Aggregate foreman stats
        const foremanKey = record.foreman_id || record.foreman_name || 'default_foreman';
        const foremanEntry = foremanStatsMap.get(foremanKey) || {
          totalKpi: 0,
          count: 0,
          name: record.foreman_name || 'مراقب الموقع',
          engineerName: record.engineer_name || 'مهندس الموقع',
        };
        foremanEntry.totalKpi += avgSkilledKpi;
        foremanEntry.count += 1;
        foremanStatsMap.set(foremanKey, foremanEntry);

        // Aggregate engineer stats
        const engKey = record.engineer_approved_by || record.engineer_name || 'default_eng';
        const engEntry = engineerStatsMap.get(engKey) || {
          totalKpi: 0,
          count: 0,
          name: record.engineer_name || 'مهندس الموقع',
        };
        engEntry.totalKpi += avgSkilledKpi;
        engEntry.count += 1;
        engineerStatsMap.set(engKey, engEntry);
      }

      const crewsList = Array.from(crewStatsMap.entries()).map(([id, val]) => ({
        id,
        name: val.name,
        foremanName: val.foremanName,
        engineerName: val.engineerName,
        efficiencyPct: val.count > 0 ? Math.round((val.totalKpi / val.count) * 10) / 10 : 100,
        status: (val.totalKpi / (val.count || 1)) >= 100 ? 'excellent' : (val.totalKpi / (val.count || 1)) >= 80 ? 'good' : 'poor',
      }));

      const foremenList = Array.from(foremanStatsMap.entries()).map(([id, val]) => ({
        id,
        name: val.name,
        engineerName: val.engineerName,
        efficiencyPct: val.count > 0 ? Math.round((val.totalKpi / val.count) * 10) / 10 : 100,
        status: (val.totalKpi / (val.count || 1)) >= 100 ? 'excellent' : (val.totalKpi / (val.count || 1)) >= 80 ? 'good' : 'poor',
      }));

      const engineersList = Array.from(engineerStatsMap.entries()).map(([id, val]) => ({
        id,
        name: val.name,
        efficiencyPct: val.count > 0 ? Math.round((val.totalKpi / val.count) * 10) / 10 : 100,
        status: (val.totalKpi / (val.count || 1)) >= 100 ? 'excellent' : (val.totalKpi / (val.count || 1)) >= 80 ? 'good' : 'poor',
      }));

      const avgKpi = totalEvaluatedWorkers > 0 ? Math.round((sumWorkerKpis / totalEvaluatedWorkers) * 10) / 10 : 100;

      return {
        summary: {
          totalEvaluatedWorkers,
          avgKpi,
          greenCount: overallGreen,
          yellowCount: overallYellow,
          redCount: overallRed,
          crewsCount: crewsList.length,
          foremenCount: foremenList.length,
          engineersCount: engineersList.length,
        },
        engineers: engineersList,
        foremen: foremenList,
        crews: crewsList,
        workers: flatWorkers,
      };
    });
  }
}
