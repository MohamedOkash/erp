import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeeResponseDto } from './dto/employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('employees')
@UseGuards(SessionAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  /**
   * Search employee immediately by National Identity Number (Section 3 & 9 item 3 of HANDOFF.md)
   * Route: GET /api/v1/employees/by-identity/:identityNumber
   */
  @Get('by-identity/:identityNumber')
  async getByIdentity(
    @Param('identityNumber') identityNumber: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ): Promise<EmployeeResponseDto> {
    const companyId = user?.companyId || headerCompanyId;
    return this.employeesService.findByIdentityNumber(companyId, identityNumber);
  }

  /**
   * Create new employee (Section 3 & 9 of HANDOFF.md)
   * Route: POST /api/v1/employees
   */
  @Post()
  async createEmployee(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ): Promise<EmployeeResponseDto> {
    const companyId = user?.companyId || headerCompanyId;
    return this.employeesService.createEmployee(companyId, dto);
  }
}

