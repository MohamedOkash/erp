import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkItemPricesService } from './work-item-prices.service';
import { CreateWorkItemPriceDto } from './dto/create-work-item-price.dto';
import { UpdateWorkItemPriceDto } from './dto/update-work-item-price.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller()
@UseGuards(SessionAuthGuard)
export class WorkItemPricesController {
  constructor(private readonly pricesService: WorkItemPricesService) {}

  @Get('work-items/:itemId/prices')
  async listPrices(
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricesService.listPrices(user.companyId, itemId);
  }

  @Post('work-items/:itemId/prices')
  async createPrice(
    @Param('itemId') itemId: string,
    @Body() dto: CreateWorkItemPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricesService.createPrice(user.companyId, itemId, dto);
  }

  @Get('work-item-prices/:id')
  async getPrice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricesService.getPriceById(user.companyId, id);
  }

  @Patch('work-item-prices/:id')
  async updatePrice(
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pricesService.updatePrice(user.companyId, id, dto);
  }
}
