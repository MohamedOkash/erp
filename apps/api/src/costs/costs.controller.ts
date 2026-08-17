import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CostsService } from './costs.service';
import { CreateCostDto } from './dto/create-cost.dto';
import { UpdateCostDto } from './dto/update-cost.dto';
import { QueryCostDto } from './dto/query-cost.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('costs')
@UseGuards(SessionAuthGuard)
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  /**
   * List cost entries with filters, pagination and summary
   * Route: GET /api/v1/costs
   */
  @Get()
  async listCosts(
    @Query() query: QueryCostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costsService.findCosts(user.companyId, query, user);
  }

  /**
   * Aggregate summary of costs by project, branch and category
   * Route: GET /api/v1/costs/summary
   */
  @Get('summary')
  async getCostSummary(
    @Query() query: QueryCostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costsService.getCostSummary(user.companyId, query);
  }

  /**
   * Auto-calculate labor costs from attendance records
   * Route: GET /api/v1/costs/labor-auto-calculate
   */
  @Get('labor-auto-calculate')
  async autoCalculateLaborCosts(
    @Query() query: QueryCostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costsService.autoCalculateLaborCosts(user.companyId, query);
  }

  /**
   * Get single cost entry by ID
   * Route: GET /api/v1/costs/:id
   */
  @Get(':id')
  async getCostById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costsService.getCostById(user.companyId, id);
  }

  /**
   * Create new cost entry
   * Route: POST /api/v1/costs
   */
  @Post()
  async createCost(
    @Body() dto: CreateCostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costsService.createCost(user.companyId, user.userId, dto, user);
  }

  /**
   * Update cost entry
   * Route: PUT /api/v1/costs/:id
   */
  @Put(':id')
  async updateCost(
    @Param('id') id: string,
    @Body() dto: UpdateCostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costsService.updateCost(user.companyId, user.userId, id, dto);
  }

  /**
   * Delete cost entry
   * Route: DELETE /api/v1/costs/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCost(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costsService.deleteCost(user.companyId, id);
  }
}
