import { Module } from '@nestjs/common';
import { ControlCardsController } from './control-cards.controller';
import { ControlCardsService } from './control-cards.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CompanySettingsModule } from '../company-settings/company-settings.module';

@Module({
  imports: [DatabaseModule, AuthModule, CompanySettingsModule],
  controllers: [ControlCardsController],
  providers: [ControlCardsService],
  exports: [ControlCardsService],
})
export class ControlCardsModule {}
