import { Module } from '@nestjs/common';
import { CostsService } from './costs.service';
import { CostsController } from './costs.controller';
import { CompanySettingsModule } from '../company-settings/company-settings.module';

@Module({
  imports: [CompanySettingsModule],
  controllers: [CostsController],
  providers: [CostsService],
  exports: [CostsService],
})
export class CostsModule {}
