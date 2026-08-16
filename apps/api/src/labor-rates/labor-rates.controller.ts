import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LaborRatesService } from './labor-rates.service';
import { CreateLaborRateDto } from './dto/create-labor-rate.dto';
import { UpdateLaborRateDto } from './dto/update-labor-rate.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('labor-rates')
@UseGuards(SessionAuthGuard)
export class LaborRatesController {
  constructor(private readonly laborRatesService: LaborRatesService) {}

  @Get()
  async listRates(@CurrentUser() user: AuthenticatedUser) {
    return this.laborRatesService.listLaborRates(user.companyId);
  }

  @Get(':id')
  async getRate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.laborRatesService.getLaborRateById(user.companyId, id);
  }

  @Post()
  async createRate(
    @Body() dto: CreateLaborRateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.laborRatesService.createLaborRate(user.companyId, dto);
  }

  @Patch(':id')
  async updateRate(
    @Param('id') id: string,
    @Body() dto: UpdateLaborRateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.laborRatesService.updateLaborRate(user.companyId, id, dto);
  }
}
