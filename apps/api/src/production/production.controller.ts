import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ProductionService } from './production.service';
import { ApproveProductionDto } from './dto/approve-production.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('production')
@UseGuards(SessionAuthGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  /**
   * Approve production record step (Section 3 & 4 of HANDOFF.md)
   * Route: POST /api/v1/production/:id/approve
   */
  @Post(':id/approve')
  async approveRecord(
    @Param('id') id: string,
    @Body() dto: ApproveProductionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ) {
    const companyId = user?.companyId || headerCompanyId;
    return this.productionService.approveProductionRecord(companyId, id, dto);
  }
}
