import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmployeeResponseDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Find employee by national ID (identity number) within tenant company scope.
   * Uses withTenantTransaction to ensure app.company_id is set within PostgreSQL.
   */
  async findByIdentityNumber(
    companyId: string,
    identityNumber: string,
  ): Promise<EmployeeResponseDto> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const employeeRes = await client.query(
        `SELECT e.id, e.company_id, e.national_id, e.name, e.code, e.phone,
                e.role_type, e.primary_branch_id, e.daily_wage, e.hire_date, e.is_active,
                b.name AS branch_name
         FROM employees e
         LEFT JOIN branches b ON e.primary_branch_id = b.id AND e.company_id = b.company_id
         WHERE e.national_id = $1`,
        [identityNumber],
      );

      if (employeeRes.rows.length === 0) {
        throw new NotFoundException(
          `Employee with identity number '${identityNumber}' not found`,
        );
      }

      const row = employeeRes.rows[0];

      // Fetch active project assignments
      const assignmentsRes = await client.query(
        `SELECT ea.project_id, p.name AS project_name, p.code AS project_code,
                ea.assigned_role, ea.start_date
         FROM employee_assignments ea
         JOIN projects p ON ea.project_id = p.id AND ea.company_id = p.company_id
         WHERE ea.employee_id = $1 AND ea.is_active = true`,
        [row.id],
      );

      const assignments = assignmentsRes.rows.map((a) => ({
        projectId: a.project_id,
        projectName: a.project_name,
        projectCode: a.project_code,
        assignedRole: a.assigned_role,
        startDate: a.start_date,
      }));

      return {
        id: row.id,
        companyId: row.company_id,
        nationalId: row.national_id,
        name: row.name,
        code: row.code,
        phone: row.phone,
        roleType: row.role_type,
        primaryBranchId: row.primary_branch_id,
        branchName: row.branch_name,
        dailyWage: parseFloat(row.daily_wage),
        hireDate: row.hire_date,
        isActive: row.is_active,
        assignments,
      };
    });
  }
}
