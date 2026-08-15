import { Module } from '@nestjs/common';
import { WorkAreasService } from './work-areas.service';
import { WorkAreasController } from './work-areas.controller';

@Module({
  controllers: [WorkAreasController],
  providers: [WorkAreasService],
  exports: [WorkAreasService],
})
export class WorkAreasModule {}
