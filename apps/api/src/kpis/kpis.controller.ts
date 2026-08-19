import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { KpisService, QueryCascadeKpiDto } from './kpis.service';

@Controller('kpis')
@UseGuards(SessionAuthGuard)
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get('cascade')
  async getCascadeKpis(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryCascadeKpiDto,
  ) {
    return this.kpisService.getCascadeKpis(user.companyId, query);
  }
}
