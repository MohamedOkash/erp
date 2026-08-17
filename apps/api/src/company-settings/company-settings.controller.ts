import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('company-settings')
@UseGuards(SessionAuthGuard)
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get()
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.companySettingsService.getCompanySettings(user.companyId);
  }

  @Put()
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    return this.companySettingsService.updateCompanySettings(
      user.companyId,
      dto.settings,
    );
  }
}
