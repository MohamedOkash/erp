import {
  Body,
  Controller,
  Get,
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
   * Create production record
   * Route: POST /api/v1/production
   */
  @Post()
  async createRecord(
    @Body() dto: CreateProductionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productionService.createProductionRecord(user.companyId, dto);
  }

  /**
   * List production records with filters
   * Route: GET /api/v1/production
   */
  @Get()
  async listRecords(
    @Query() query: QueryProductionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productionService.findProductionRecords(user.companyId, query);
  }

  /**
   * Request correction on locked final_approved record
   * Route: POST /api/v1/production/:id/correct & POST /api/v1/production/:id/correction
   */
  @Post(':id/correct')
  async requestCorrectionAlias(
    @Param('id') id: string,
    @Body() dto: CreateCorrectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productionService.requestCorrection(user.companyId, id, dto);
  }

  @Post(':id/correction')
  async requestCorrection(
    @Param('id') id: string,
    @Body() dto: CreateCorrectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productionService.requestCorrection(user.companyId, id, dto);
  }

  /**
   * Approve production record step with strict state machine and role checks
   * Route: POST /api/v1/production/:id/approve
   */
  @Post(':id/approve')
  async approveRecord(
    @Param('id') id: string,
    @Body() dto: ApproveProductionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const roleCodes = (user.roles || []).map((r: any) =>
      typeof r === 'string' ? r : r.roleCode,
    );
    return this.productionService.approveProductionRecord(
      user.companyId,
      id,
      dto,
      roleCodes,
    );
  }
}
