import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { KpisController } from './kpis.controller';
import { KpisService } from './kpis.service';

@Module({
  imports: [DatabaseModule],
  controllers: [KpisController],
  providers: [KpisService],
  exports: [KpisService],
})
export class KpisModule {}
