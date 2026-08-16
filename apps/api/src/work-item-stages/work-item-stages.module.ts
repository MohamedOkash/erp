import { Module } from '@nestjs/common';
import { WorkItemStagesController } from './work-item-stages.controller';
import { WorkItemStagesService } from './work-item-stages.service';

@Module({
  controllers: [WorkItemStagesController],
  providers: [WorkItemStagesService],
  exports: [WorkItemStagesService],
})
export class WorkItemStagesModule {}
