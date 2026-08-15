import {
  Controller,
  Get,
  Headers,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('exports')
@UseGuards(SessionAuthGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  /**
   * Export all employees to XLSX
   * Route: GET /api/v1/exports/employees.xlsx
   */
  @Get('employees.xlsx')
  async exportEmployees(
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ) {
    const companyId = user?.companyId || headerCompanyId;
    const buffer = await this.exportsService.exportEmployeesXlsx(companyId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employees.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  /**
   * Export production records to XLSX
   * Route: GET /api/v1/exports/production.xlsx
   */
  @Get('production.xlsx')
  async exportProduction(
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ) {
    const companyId = user?.companyId || headerCompanyId;
    const buffer = await this.exportsService.exportProductionXlsx(companyId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="production.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  /**
   * Export BOQ items to XLSX
   * Route: GET /api/v1/exports/boq.xlsx
   */
  @Get('boq.xlsx')
  async exportBoq(
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ) {
    const companyId = user?.companyId || headerCompanyId;
    const buffer = await this.exportsService.exportBoqXlsx(companyId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="boq.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}


