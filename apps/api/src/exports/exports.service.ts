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
}
