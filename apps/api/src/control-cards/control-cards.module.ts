import { Module } from '@nestjs/common';
import { ControlCardsController } from './control-cards.controller';
import { ControlCardsService } from './control-cards.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ControlCardsController],
  providers: [ControlCardsService],
  exports: [ControlCardsService],
})
export class ControlCardsModule {}
