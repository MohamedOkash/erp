import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ControlCardsService } from './control-cards.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller()
@UseGuards(SessionAuthGuard)
export class ControlCardsController {
  constructor(private readonly controlCardsService: ControlCardsService) {}

  /**
   * 1) List control cards summaries
   * GET /api/v1/control-cards
   */
  @Get('control-cards')
  async listCards(
    @Query('projectId') projectId: string,
    @Query('categoryId') categoryId: string,
    @Query('search') search: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.controlCardsService.getControlCardsList(user.companyId, {
      projectId,
      categoryId,
      search,
    });
  }

  /**
   * 2) Get Full Live Control Card for a specific Work Item
   * GET /api/v1/control-cards/:workItemId
   */
  @Get('control-cards/:workItemId')
  async getCardDetail(
    @Param('workItemId') workItemId: string,
    @Query('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.controlCardsService.getControlCardDetail(
      user.companyId,
      workItemId,
      projectId,
    );
  }

  /**
   * 3) Get Daily Control Report
   * GET /api/v1/control-reports/daily
   */
  @Get('control-reports/daily')
  async getDailyReport(
    @Query('projectId') projectId: string,
    @Query('date') date: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const reportDate = date || new Date().toISOString().split('T')[0];
    return this.controlCardsService.getDailyControlReport(
      user.companyId,
      projectId,
      reportDate,
    );
  }
}
