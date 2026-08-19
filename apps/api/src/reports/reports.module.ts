import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { FinancialReportsController } from './financial-reports.controller';

@Module({
  controllers: [ReportsController, FinancialReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

