import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('financial-reports')
@UseGuards(SessionAuthGuard)
export class FinancialReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Get Project Financial Report and Break-even Analysis
   * Route: GET /api/v1/financial-reports/project/:id
   */
  @Get('project/:id')
  async getProjectFinancialReport(
    @Param('id') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getProjectFinancialReport(
      user.companyId,
      projectId,
    );
  }
}
