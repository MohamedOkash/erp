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
import { AlertsService } from './alerts.service';
import { AlertsEvaluationService } from './alerts-evaluation.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { QueryAlertRuleDto } from './dto/query-alert-rule.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('alert-rules')
@UseGuards(SessionAuthGuard)
export class AlertRulesController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * List alert rules
   * Route: GET /api/v1/alert-rules
   */
  @Get()
  async listAlertRules(
    @Query() query: QueryAlertRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertsService.findAlertRules(user.companyId, query);
  }

  /**
   * Get single alert rule
   * Route: GET /api/v1/alert-rules/:id
   */
  @Get(':id')
  async getAlertRule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertsService.getAlertRuleById(user.companyId, id);
  }

  /**
   * Create alert rule
   * Route: POST /api/v1/alert-rules
   */
  @Post()
  async createAlertRule(
    @Body() dto: CreateAlertRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertsService.createAlertRule(user.companyId, dto);
  }

  /**
   * Update alert rule
   * Route: PATCH /api/v1/alert-rules/:id
   */
  @Patch(':id')
  async updateAlertRule(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertsService.updateAlertRule(user.companyId, id, dto);
  }

  /**
   * Delete alert rule
   * Route: DELETE /api/v1/alert-rules/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAlertRule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertsService.deleteAlertRule(user.companyId, id);
  }
}

@Controller('alerts')
@UseGuards(SessionAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsEvaluationService: AlertsEvaluationService,
  ) {}

  /**
   * Trigger manual evaluation of active alert rules
   * Route: POST /api/v1/alerts/evaluate
   */
  @Post('evaluate')
  async evaluateAlerts(@CurrentUser() user: AuthenticatedUser) {
    return this.alertsEvaluationService.evaluateCompanyAlerts(user.companyId);
  }
}
