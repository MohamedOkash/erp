import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateSavedReportDto } from './dto/create-saved-report.dto';
import { UpdateSavedReportDto } from './dto/update-saved-report.dto';
import { QuerySavedReportDto } from './dto/query-saved-report.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('saved-reports')
@UseGuards(SessionAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * List saved reports visible to the user
   * Route: GET /api/v1/saved-reports
   */
  @Get()
  async listReports(
    @Query() query: QuerySavedReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.findSavedReports(
      user.companyId,
      user.userId,
      query,
    );
  }

  /**
   * Create new saved report
   * Route: POST /api/v1/saved-reports
   */
  @Post()
  async createReport(
    @Body() dto: CreateSavedReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.createSavedReport(
      user.companyId,
      user.userId,
      dto,
    );
  }

  /**
   * Run saved report dynamically
   * Route: POST /api/v1/saved-reports/:id/run
   */
  @Post(':id/run')
  async runReport(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.runSavedReport(user.companyId, id);
  }

  /**
   * Share saved report with specific users
   * Route: POST /api/v1/saved-reports/:id/share
   */
  @Post(':id/share')
  async shareReport(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.shareSavedReport(
      user.companyId,
      id,
      userIds || [],
    );
  }

  /**
   * Get single saved report metadata
   * Route: GET /api/v1/saved-reports/:id
   */
  @Get(':id')
  async getReport(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getSavedReportById(user.companyId, id);
  }

  /**
   * Update saved report
   * Route: PATCH /api/v1/saved-reports/:id
   */
  @Patch(':id')
  async updateReport(
    @Param('id') id: string,
    @Body() dto: UpdateSavedReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.updateSavedReport(
      user.companyId,
      user.userId,
      id,
      dto,
    );
  }

  /**
   * Delete saved report
   * Route: DELETE /api/v1/saved-reports/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReport(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.deleteSavedReport(user.companyId, id);
  }
}
