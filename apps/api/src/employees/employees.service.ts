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
   * List employees with filters, multi-country identity fields and pagination
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
        conditions.push(`(e.name ILIKE $${paramIdx} OR e.code ILIKE $${paramIdx} OR e.identity_number ILIKE $${paramIdx})`);
        params.push(`%${query.search}%`);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 20;
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
          e.name, e.code, e.phone, e.role_type, e.primary_branch_id, e.daily_wage, e.hire_date, e.is_active,
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
        phone: row.phone,
        roleType: row.role_type,
        role: row.role_type,
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
   * Get employee by ID with active assignments
   */
  async getEmployeeById(companyId: string, id: string): Promise<EmployeeResponseDto> {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT e.id, e.company_id, e.identity_number, e.identity_type, e.identity_expiry_date, e.nationality,
                e.name, e.code, e.phone, e.role_type, e.primary_branch_id, e.daily_wage, e.hire_date, e.is_active,
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
        phone: row.phone,
        roleType: row.role_type,
        role: row.role_type,
        primaryBranchId: row.primary_branch_id,
        branchName: row.branch_name,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
        assignments,
      };
    });
  }

  /**
   * Find employee by identity number (National ID / Iqama / Passport)
   */
  async findByIdentityNumber(
    companyId: string,
    identityNumber: string,
  ): Promise<EmployeeResponseDto> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const employeeRes = await client.query(
        `SELECT e.id, e.company_id, e.identity_number, e.identity_type, e.identity_expiry_date, e.nationality,
                e.name, e.code, e.phone, e.role_type, e.primary_branch_id, e.daily_wage, e.hire_date, e.is_active,
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
        phone: row.phone,
        roleType: row.role_type,
        primaryBranchId: row.primary_branch_id,
        branchName: row.branch_name,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
        assignments,
      };
    });
  }

  /**
   * Create a new employee with duplicate identity check
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

      const insertRes = await client.query(
        `INSERT INTO employees (
          company_id, identity_number, identity_type, identity_expiry_date, nationality,
          name, code, phone, role_type, primary_branch_id, daily_wage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, company_id, identity_number, identity_type, identity_expiry_date, nationality,
                  name, code, phone, role_type, primary_branch_id, daily_wage, hire_date, is_active`,
        [
          companyId,
          identityNumber,
          identityType,
          dto.identityExpiryDate || null,
          dto.nationality || null,
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
        identityNumber: row.identity_number,
        nationalId: row.identity_number,
        identityType: row.identity_type,
        identityExpiryDate: row.identity_expiry_date,
        nationality: row.nationality,
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

  /**
   * Update employee details with duplicate identityNumber check
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

      const updateRes = await client.query(
        `UPDATE employees
         SET name = COALESCE($3, name),
             identity_number = COALESCE($4, identity_number),
             identity_type = COALESCE($5, identity_type),
             identity_expiry_date = COALESCE($6, identity_expiry_date),
             nationality = COALESCE($7, nationality),
             code = COALESCE($8, code),
             phone = COALESCE($9, phone),
             role_type = COALESCE($10, role_type),
             primary_branch_id = COALESCE($11, primary_branch_id),
             daily_wage = COALESCE($12, daily_wage),
             is_active = COALESCE($13, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, identity_number, identity_type, identity_expiry_date, nationality,
                   name, code, phone, role_type, primary_branch_id, daily_wage, hire_date, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.name || null,
          targetIdNumber || null,
          dto.identityType || null,
          dto.identityExpiryDate || null,
          dto.nationality || null,
          dto.code || null,
          dto.phone || null,
          dto.roleType || null,
          dto.primaryBranchId || null,
          dto.dailyWage !== undefined ? dto.dailyWage : null,
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
        phone: row.phone,
        roleType: row.role_type,
        primaryBranchId: row.primary_branch_id,
        dailyWage: parseFloat(row.daily_wage || '0'),
        hireDate: row.hire_date,
        isActive: row.is_active,
      };
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
