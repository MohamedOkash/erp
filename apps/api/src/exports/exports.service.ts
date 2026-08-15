import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ExportsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Export all employees of current company to XLSX
   * Columns: Name, Identity, Phone, Branch, Wage
   */
  async exportEmployeesXlsx(companyId: string): Promise<Buffer> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const employeesRes = await client.query(
        `SELECT e.name, e.national_id, e.phone, b.name AS branch_name, e.daily_wage
         FROM employees e
         LEFT JOIN branches b ON e.primary_branch_id = b.id AND e.company_id = b.company_id
         WHERE e.company_id = $1
         ORDER BY e.created_at ASC`,
        [companyId],
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Employees');

      worksheet.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Identity', key: 'identity', width: 20 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Wage', key: 'wage', width: 15 },
      ];

      // Make header row bold
      worksheet.getRow(1).font = { bold: true };

      for (const emp of employeesRes.rows) {
        worksheet.addRow({
          name: emp.name,
          identity: emp.national_id,
          phone: emp.phone || '',
          branch: emp.branch_name || '',
          wage: parseFloat(emp.daily_wage || '0'),
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    });
  }

  /**
   * Export production records to XLSX
   * Columns: Date, Branch, Project, Area, Item, Type, Target, Actual, Prod%, Status, Supervisor, Team Code
   */
  async exportProductionXlsx(
    companyId: string,
    query?: { fromDate?: string; toDate?: string; branchId?: string; projectId?: string },
  ): Promise<Buffer> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const conditions: string[] = ['pr.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query?.fromDate) {
        conditions.push(`pr.date >= $${paramIdx++}`);
        params.push(query.fromDate);
      }
      if (query?.toDate) {
        conditions.push(`pr.date <= $${paramIdx++}`);
        params.push(query.toDate);
      }
      if (query?.branchId) {
        conditions.push(`pr.branch_id = $${paramIdx++}`);
        params.push(query.branchId);
      }
      if (query?.projectId) {
        conditions.push(`pr.project_id = $${paramIdx++}`);
        params.push(query.projectId);
      }

      const sql = `
        SELECT to_char(pr.date, 'YYYY-MM-DD') AS date_str,
               b.name AS branch_name,
               p.name AS project_name,
               wa.name AS area_name,
               wi.name AS item_name,
               pr.production_type,
               pr.target_quantity,
               pr.actual_quantity,
               pr.status,
               sup.name AS supervisor_name,
               pr.team_code
        FROM production_records pr
        JOIN branches b ON pr.branch_id = b.id AND pr.company_id = b.company_id
        JOIN projects p ON pr.project_id = p.id AND pr.company_id = p.company_id
        JOIN work_items wi ON pr.work_item_id = wi.id AND pr.company_id = wi.company_id
        LEFT JOIN work_areas wa ON pr.work_area_id = wa.id AND pr.company_id = wa.company_id
        LEFT JOIN employees sup ON pr.supervisor_id = sup.id AND pr.company_id = sup.company_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY pr.date ASC, pr.created_at ASC
      `;

      const prodRes = await client.query(sql, params);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Production');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Branch', key: 'branch', width: 18 },
        { header: 'Project', key: 'project', width: 20 },
        { header: 'Area', key: 'area', width: 18 },
        { header: 'Item', key: 'item', width: 22 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Target', key: 'target', width: 12 },
        { header: 'Actual', key: 'actual', width: 12 },
        { header: 'Prod%', key: 'prodPercent', width: 12 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Supervisor', key: 'supervisor', width: 20 },
        { header: 'Team Code', key: 'teamCode', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };

      for (const row of prodRes.rows) {
        const target = parseFloat(row.target_quantity || '0');
        const actual = parseFloat(row.actual_quantity || '0');
        const prodPercent = target > 0 ? `${((actual / target) * 100).toFixed(1)}%` : '-';

        worksheet.addRow({
          date: row.date_str,
          branch: row.branch_name || '',
          project: row.project_name || '',
          area: row.area_name || '',
          item: row.item_name || '',
          type: row.production_type || '',
          target,
          actual,
          prodPercent,
          status: row.status || '',
          supervisor: row.supervisor_name || '',
          teamCode: row.team_code || '',
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    });
  }
}

