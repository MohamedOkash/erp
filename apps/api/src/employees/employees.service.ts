import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmployeeResponseDto } from './dto/employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';

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

  /**
   * Create a new employee with duplicate national ID check (Section 3 & 9 of HANDOFF.md)
   */
  async createEmployee(
    companyId: string,
    dto: CreateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      // Check duplicate nationalId
      const existing = await client.query(
        `SELECT id FROM employees WHERE national_id = $1`,
        [dto.nationalId],
      );

      if (existing.rows.length > 0) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: `Employee with national ID '${dto.nationalId}' already exists in this company`,
            code: 'IDENTITY_DUPLICATE',
          },
          HttpStatus.CONFLICT,
        );
      }

      const insertRes = await client.query(
        `INSERT INTO employees (
          company_id, national_id, name, code, phone, role_type, primary_branch_id, daily_wage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, company_id, national_id, name, code, phone, role_type, primary_branch_id, daily_wage, hire_date, is_active`,
        [
          companyId,
          dto.nationalId,
          dto.name,
          dto.code || null,
          dto.phone || null,
          dto.roleType,
          dto.primaryBranchId || null,
          dto.dailyWage || 0,
        ],
      );

      const row = insertRes.rows[0];
      return {
        id: row.id,
        companyId: row.company_id,
        nationalId: row.national_id,
        name: row.name,
        code: row.code,
        phone: row.phone,
        roleType: row.role_type,
        primaryBranchId: row.primary_branch_id,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
        assignments: [],
      };
    });
  }
}

