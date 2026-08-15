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
import { IncentivesService } from './incentives.service';
import { CreateIncentiveRuleDto } from './dto/create-incentive-rule.dto';
import { UpdateIncentiveRuleDto } from './dto/update-incentive-rule.dto';
import { CalculateIncentivesDto } from './dto/calculate-incentives.dto';
import { ApproveIncentivesDto } from './dto/approve-incentives.dto';
import { QueryIncentiveDto } from './dto/query-incentive.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('incentive-rules')
@UseGuards(SessionAuthGuard)
export class IncentiveRulesController {
  constructor(private readonly incentivesService: IncentivesService) {}

  @Get()
  async listRules(
    @Query() query: QueryIncentiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.findIncentiveRules(user.companyId, query);
  }

  @Get(':id')
  async getRule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.getIncentiveRuleById(user.companyId, id);
  }

  @Post()
  async createRule(
    @Body() dto: CreateIncentiveRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.createIncentiveRule(user.companyId, dto);
  }

  @Patch(':id')
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateIncentiveRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.updateIncentiveRule(user.companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.deleteIncentiveRule(user.companyId, id);
  }
}

@Controller('incentives')
@UseGuards(SessionAuthGuard)
export class IncentivesController {
  constructor(private readonly incentivesService: IncentivesService) {}

  @Post('calculate')
  async calculateIncentives(
    @Body() dto: CalculateIncentivesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.calculateIncentives(user.companyId, dto);
  }

  @Post('approve')
  async approveIncentives(
    @Body() dto: ApproveIncentivesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.approveIncentives(user.companyId, dto);
  }
}

@Controller('incentive-ledger')
@UseGuards(SessionAuthGuard)
export class IncentiveLedgerController {
  constructor(private readonly incentivesService: IncentivesService) {}

  @Get()
  async listLedger(
    @Query() query: QueryIncentiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.findIncentiveLedger(user.companyId, query);
  }

  @Patch(':id/mark-paid')
  async markPaid(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentivesService.markLedgerPaid(user.companyId, id);
  }
}
