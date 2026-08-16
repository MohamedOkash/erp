import { Module } from '@nestjs/common';
import { WorkItemPricesController } from './work-item-prices.controller';
import { WorkItemPricesService } from './work-item-prices.service';

@Module({
  controllers: [WorkItemPricesController],
  providers: [WorkItemPricesService],
  exports: [WorkItemPricesService],
})
export class WorkItemPricesModule {}
