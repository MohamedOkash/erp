import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmployeeResponseDto } from './dto/employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * List employees with filters, multi-country identity fields, profession and pagination
   */
  async findEmployees(companyId: string, query: QueryEmployeeDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['e.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      const branchId = query.branchId;
      if (branchId) {
        conditions.push(`e.primary_branch_id = $${paramIdx++}`);
        params.push(branchId);
      }

      const role = query.role || query.roleType;
      if (role) {
        conditions.push(`e.role_type = $${paramIdx++}`);
        params.push(role);
      }

      if (query.profession) {
        conditions.push(`e.profession ILIKE $${paramIdx++}`);
        params.push(`%${query.profession}%`);
      }

      const idNumber = query.identityNumber || query.nationalId;
      if (idNumber) {
        conditions.push(`e.identity_number = $${paramIdx++}`);
        params.push(idNumber);
      }

      if (query.code) {
        conditions.push(`e.code = $${paramIdx++}`);
        params.push(query.code);
      }

      if (query.isActive !== undefined) {
        conditions.push(`e.is_active = $${paramIdx++}`);
        params.push(query.isActive);
      }

      if (query.search) {
        conditions.push(`(e.name ILIKE $${paramIdx} OR e.code ILIKE $${paramIdx} OR e.identity_number ILIKE $${paramIdx} OR e.profession ILIKE $${paramIdx})`);
        params.push(`%${query.search}%`);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 50;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM employees e WHERE ${whereClause}`,
        params,
      );
      const total = countRes.rows[0]?.total || 0;

      const dataSql = `
        SELECT 
          e.id, e.company_id, e.identity_number, e.identity_type, e.identity_expiry_date, e.nationality,
          e.name, e.code, e.company_employee_id, e.project_employee_id, e.phone, e.role_type,
          e.profession, e.hourly_rate, e.primary_branch_id, e.daily_wage, e.hire_date, e.is_active,
          e.created_at, e.updated_at,
          b.name AS branch_name
        FROM employees e
        LEFT JOIN branches b ON e.primary_branch_id = b.id AND e.company_id = b.company_id
        WHERE ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      const dataRes = await client.query(dataSql, [...params, limit, offset]);

      const formatted = dataRes.rows.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        identityNumber: row.identity_number,
        nationalId: row.identity_number,
        identityType: row.identity_type,
        identityExpiryDate: row.identity_expiry_date,
        nationality: row.nationality,
        name: row.name,
        code: row.code,
        companyEmployeeId: row.company_employee_id || row.code,
        projectEmployeeId: row.project_employee_id,
        phone: row.phone,
        roleType: row.role_type,
        role: row.role_type,
        profession: row.profession,
        hourlyRate: parseFloat(row.hourly_rate || '0') || Math.round((parseFloat(row.daily_wage || '0') / 8.0) * 100) / 100,
        primaryBranchId: row.primary_branch_id,
        branchId: row.primary_branch_id,
        branchName: row.branch_name,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
      }));

      return {
        data: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      };
    });
  }

  /**
   * Get employee by ID with active assignments and per-project codes
   */
  async getEmployeeById(companyId: string, id: string): Promise<EmployeeResponseDto> {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT e.id, e.company_id, e.identity_number, e.identity_type, e.identity_expiry_date, e.nationality,
                e.name, e.code, e.company_employee_id, e.project_employee_id, e.phone, e.role_type,
                e.profession, e.hourly_rate, e.primary_branch_id, e.daily_wage, e.hire_date, e.is_active,
                b.name AS branch_name
         FROM employees e
         LEFT JOIN branches b ON e.primary_branch_id = b.id AND e.company_id = b.company_id
         WHERE e.company_id = $1 AND e.id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'EMPLOYEE_NOT_FOUND',
          message: 'Employee not found',
        });
      }

      const row = res.rows[0];

      const assignmentsRes = await client.query(
        `SELECT ea.project_id, p.name AS project_name, p.code AS project_code,
                ea.assigned_role, ea.start_date
         FROM employee_assignments ea
         JOIN projects p ON ea.project_id = p.id AND ea.company_id = p.company_id
         WHERE ea.employee_id = $1 AND ea.is_active = true`,
        [row.id],
      );

      const projectCodesRes = await client.query(
        `SELECT epi.id, epi.project_id, p.name AS project_name, epi.project_employee_code
         FROM employee_project_ids epi
         JOIN projects p ON epi.project_id = p.id
         WHERE epi.company_id = $1 AND epi.employee_id = $2`,
        [companyId, row.id],
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
        identityNumber: row.identity_number,
        nationalId: row.identity_number,
        identityType: row.identity_type,
        identityExpiryDate: row.identity_expiry_date,
        nationality: row.nationality,
        name: row.name,
        code: row.code,
        companyEmployeeId: row.company_employee_id || row.code,
        projectEmployeeId: row.project_employee_id,
        phone: row.phone,
        roleType: row.role_type,
        role: row.role_type,
        profession: row.profession,
        hourlyRate: parseFloat(row.hourly_rate || '0') || Math.round((parseFloat(row.daily_wage || '0') / 8.0) * 100) / 100,
        primaryBranchId: row.primary_branch_id,
        branchName: row.branch_name,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
        assignments,
        projectCodes: projectCodesRes.rows,
      };
    });
  }

  /**
   * Find employee by identity number
   */
  async findByIdentityNumber(
    companyId: string,
    identityNumber: string,
  ): Promise<EmployeeResponseDto> {
    return this.db.withTenantClient(companyId, async (client) => {
      const employeeRes = await client.query(
        `SELECT e.id, e.company_id, e.identity_number, e.identity_type, e.identity_expiry_date, e.nationality,
                e.name, e.code, e.company_employee_id, e.project_employee_id, e.phone, e.role_type,
                e.profession, e.hourly_rate, e.primary_branch_id, e.daily_wage, e.hire_date, e.is_active,
                b.name AS branch_name
         FROM employees e
         LEFT JOIN branches b ON e.primary_branch_id = b.id AND e.company_id = b.company_id
         WHERE e.identity_number = $1`,
        [identityNumber],
      );

      if (employeeRes.rows.length === 0) {
        throw new NotFoundException(
          `Employee with identity number '${identityNumber}' not found`,
        );
      }

      const row = employeeRes.rows[0];

      const assignmentsRes = await client.query(
        `SELECT ea.project_id, p.name AS project_name, p.code AS project_code,
                ea.assigned_role, ea.start_date
         FROM employee_assignments ea
         JOIN projects p ON ea.project_id = p.id AND ea.company_id = p.company_id
         WHERE ea.employee_id = $1 AND ea.is_active = true`,
        [row.id],
      );

      const projectCodesRes = await client.query(
        `SELECT epi.id, epi.project_id, p.name AS project_name, epi.project_employee_code
         FROM employee_project_ids epi
         JOIN projects p ON epi.project_id = p.id
         WHERE epi.company_id = $1 AND epi.employee_id = $2`,
        [companyId, row.id],
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
        identityNumber: row.identity_number,
        nationalId: row.identity_number,
        identityType: row.identity_type,
        identityExpiryDate: row.identity_expiry_date,
        nationality: row.nationality,
        name: row.name,
        code: row.code,
        companyEmployeeId: row.company_employee_id || row.code,
        projectEmployeeId: row.project_employee_id,
        phone: row.phone,
        roleType: row.role_type,
        role: row.role_type,
        profession: row.profession,
        hourlyRate: parseFloat(row.hourly_rate || '0') || Math.round((parseFloat(row.daily_wage || '0') / 8.0) * 100) / 100,
        primaryBranchId: row.primary_branch_id,
        branchName: row.branch_name,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
        assignments,
        projectCodes: projectCodesRes.rows,
      };
    });
  }

  /**
   * Create a new employee
   */
  async createEmployee(
    companyId: string,
    dto: CreateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const identityNumber = dto.identityNumber || dto.nationalId;

      if (!identityNumber) {
        throw new BadRequestException({
          code: 'IDENTITY_NUMBER_REQUIRED',
          message: 'identityNumber or nationalId is required',
        });
      }

      const identityType = dto.identityType || 'national_id';

      const existing = await client.query(
        `SELECT id FROM employees WHERE identity_number = $1`,
        [identityNumber],
      );

      if (existing.rows.length > 0) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: `Employee with identity number '${identityNumber}' already exists in this company`,
            code: 'IDENTITY_DUPLICATE',
          },
          HttpStatus.CONFLICT,
        );
      }

      let dailyWage = dto.dailyWage || 0;
      let hourlyRate = dto.hourlyRate || 0;

      if (hourlyRate > 0 && dailyWage === 0) {
        dailyWage = Math.round(hourlyRate * 8.0 * 100) / 100;
      } else if (dailyWage > 0 && hourlyRate === 0) {
        hourlyRate = Math.round((dailyWage / 8.0) * 100) / 100;
      }

      const insertRes = await client.query(
        `INSERT INTO employees (
          company_id, identity_number, identity_type, identity_expiry_date, nationality,
          name, code, company_employee_id, project_employee_id, phone, role_type,
          profession, hourly_rate, primary_branch_id, daily_wage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, company_id, identity_number, identity_type, identity_expiry_date, nationality,
                  name, code, company_employee_id, project_employee_id, phone, role_type,
                  profession, hourly_rate, primary_branch_id, daily_wage, hire_date, is_active`,
        [
          companyId,
          identityNumber,
          identityType,
          dto.identityExpiryDate || null,
          dto.nationality || null,
          dto.name,
          dto.code || null,
          dto.companyEmployeeId || dto.code || null,
          dto.projectEmployeeId || null,
          dto.phone || null,
          dto.roleType,
          dto.profession || null,
          hourlyRate,
          dto.primaryBranchId || null,
          dailyWage,
        ],
      );

      const row = insertRes.rows[0];
      return {
        id: row.id,
        companyId: row.company_id,
        identityNumber: row.identity_number,
        nationalId: row.identity_number,
        identityType: row.identity_type,
        identityExpiryDate: row.identity_expiry_date,
        nationality: row.nationality,
        name: row.name,
        code: row.code,
        companyEmployeeId: row.company_employee_id || row.code,
        projectEmployeeId: row.project_employee_id,
        phone: row.phone,
        roleType: row.role_type,
        profession: row.profession,
        hourlyRate: parseFloat(row.hourly_rate || '0'),
        primaryBranchId: row.primary_branch_id,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
        assignments: [],
      };
    });
  }

  /**
   * Update employee details
   */
  async updateEmployee(companyId: string, id: string, dto: UpdateEmployeeDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT * FROM employees WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'EMPLOYEE_NOT_FOUND',
          message: 'Employee not found',
        });
      }

      const current = curRes.rows[0];
      const targetIdNumber = dto.identityNumber || dto.nationalId;

      if (targetIdNumber && targetIdNumber !== current.identity_number) {
        const dupRes = await client.query(
          `SELECT id FROM employees WHERE company_id = $1 AND identity_number = $2 AND id != $3`,
          [companyId, targetIdNumber, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'IDENTITY_DUPLICATE',
            message: `Employee with identity number '${targetIdNumber}' already exists in this company`,
          });
        }
      }

      let dailyWage = dto.dailyWage !== undefined ? dto.dailyWage : current.daily_wage;
      let hourlyRate = dto.hourlyRate !== undefined ? dto.hourlyRate : current.hourly_rate;

      if (dto.hourlyRate !== undefined && dto.dailyWage === undefined) {
        dailyWage = Math.round(Number(dto.hourlyRate) * 8.0 * 100) / 100;
      } else if (dto.dailyWage !== undefined && dto.hourlyRate === undefined) {
        hourlyRate = Math.round((Number(dto.dailyWage) / 8.0) * 100) / 100;
      }

      const updateRes = await client.query(
        `UPDATE employees
         SET name = COALESCE($3, name),
             identity_number = COALESCE($4, identity_number),
             identity_type = COALESCE($5, identity_type),
             identity_expiry_date = COALESCE($6, identity_expiry_date),
             nationality = COALESCE($7, nationality),
             code = COALESCE($8, code),
             company_employee_id = COALESCE($9, company_employee_id),
             project_employee_id = COALESCE($10, project_employee_id),
             phone = COALESCE($11, phone),
             role_type = COALESCE($12, role_type),
             profession = COALESCE($13, profession),
             hourly_rate = COALESCE($14, hourly_rate),
             primary_branch_id = COALESCE($15, primary_branch_id),
             daily_wage = COALESCE($16, daily_wage),
             is_active = COALESCE($17, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, identity_number, identity_type, identity_expiry_date, nationality,
                   name, code, company_employee_id, project_employee_id, phone, role_type,
                   profession, hourly_rate, primary_branch_id, daily_wage, hire_date, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.name || null,
          targetIdNumber || null,
          dto.identityType || null,
          dto.identityExpiryDate || null,
          dto.nationality || null,
          dto.code || null,
          dto.companyEmployeeId || null,
          dto.projectEmployeeId || null,
          dto.phone || null,
          dto.roleType || null,
          dto.profession || null,
          hourlyRate,
          dto.primaryBranchId || null,
          dailyWage,
          dto.isActive !== undefined ? dto.isActive : null,
        ],
      );

      const row = updateRes.rows[0];
      return {
        id: row.id,
        companyId: row.company_id,
        identityNumber: row.identity_number,
        nationalId: row.identity_number,
        identityType: row.identity_type,
        identityExpiryDate: row.identity_expiry_date,
        nationality: row.nationality,
        name: row.name,
        code: row.code,
        companyEmployeeId: row.company_employee_id || row.code,
        projectEmployeeId: row.project_employee_id,
        phone: row.phone,
        roleType: row.role_type,
        profession: row.profession,
        hourlyRate: parseFloat(row.hourly_rate || '0'),
        primaryBranchId: row.primary_branch_id,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
      };
    });
  }

  /**
   * Assign or update a per-project code for an employee
   */
  async assignProjectCode(companyId: string, employeeId: string, projectId: string, projectEmployeeCode: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `INSERT INTO employee_project_ids (company_id, employee_id, project_id, project_employee_code)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, employee_id, project_id)
         DO UPDATE SET project_employee_code = EXCLUDED.project_employee_code, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [companyId, employeeId, projectId, projectEmployeeCode],
      );
      return res.rows[0];
    });
  }

  /**
   * Get all per-project codes for an employee
   */
  async getProjectCodes(companyId: string, employeeId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT epi.id, epi.project_id, p.name AS project_name, p.code AS project_code, epi.project_employee_code, epi.created_at
         FROM employee_project_ids epi
         JOIN projects p ON epi.project_id = p.id
         WHERE epi.company_id = $1 AND epi.employee_id = $2
         ORDER BY p.name ASC`,
        [companyId, employeeId],
      );
      return { data: res.rows };
    });
  }

  /**
   * Soft delete employee (set is_active = false)
   */
  async deleteEmployee(companyId: string, id: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `UPDATE employees
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, name, is_active`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'EMPLOYEE_NOT_FOUND',
          message: 'Employee not found',
        });
      }

      return {
        id: res.rows[0].id,
        isActive: false,
        message: 'Employee deactivated successfully',
      };
    });
  }
}
