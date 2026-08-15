import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeeResponseDto } from './dto/employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('employees')
@UseGuards(SessionAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  /**
   * List employees with filters and pagination
   * Route: GET /api/v1/employees
   */
  @Get()
  async listEmployees(
    @Query() query: QueryEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.findEmployees(user.companyId, query);
  }

  /**
   * Search employee immediately by National Identity Number
   * Route: GET /api/v1/employees/by-identity/:identityNumber
   */
  @Get('by-identity/:identityNumber')
  async getByIdentity(
    @Param('identityNumber') identityNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.findByIdentityNumber(user.companyId, identityNumber);
  }

  /**
   * Get employee by ID
   * Route: GET /api/v1/employees/:id
   */
  @Get(':id')
  async getEmployeeById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.getEmployeeById(user.companyId, id);
  }

  /**
   * Create new employee
   * Route: POST /api/v1/employees
   */
  @Post()
  async createEmployee(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.createEmployee(user.companyId, dto);
  }

  /**
   * Update employee details
   * Route: PATCH /api/v1/employees/:id
   */
  @Patch(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.updateEmployee(user.companyId, id, dto);
  }

  /**
   * Soft delete / Deactivate employee (isActive = false)
   * Route: DELETE /api/v1/employees/:id
   */
  @Delete(':id')
  async deleteEmployee(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.deleteEmployee(user.companyId, id);
  }
}
