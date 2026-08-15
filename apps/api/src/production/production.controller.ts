import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductionService } from './production.service';
import { ApproveProductionDto } from './dto/approve-production.dto';
import { CreateProductionDto } from './dto/create-production.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { QueryProductionDto } from './dto/query-production.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('production')
@UseGuards(SessionAuthGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  /**
   * Create production record (Section 3 & 4 & 9 of HANDOFF.md)
   * Route: POST /api/v1/production
   */
  @Post()
  async createRecord(
    @Body() dto: CreateProductionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ) {
    const companyId = user?.companyId || headerCompanyId;
    return this.productionService.createProductionRecord(companyId, dto);
  }

  /**
   * List production records with filters (Section 9 of HANDOFF.md)
   * Route: GET /api/v1/production
   */
  @Get()
  async listRecords(
    @Query() query: QueryProductionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ) {
    const companyId = user?.companyId || headerCompanyId;
    return this.productionService.findProductionRecords(companyId, query);
  }

  /**
   * Request correction on locked final_approved record (Section 3 & 9 of HANDOFF.md)
   * Route: POST /api/v1/production/:id/correct
   */
  @Post(':id/correct')
  async requestCorrection(
    @Param('id') id: string,
    @Body() dto: CreateCorrectionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-company-id') headerCompanyId?: string,
  ) {
    const companyId = user?.companyId || headerCompanyId;
    return this.productionService.requestCorrection(companyId, id, dto);
  }

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
