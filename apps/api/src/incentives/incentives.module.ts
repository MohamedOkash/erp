import { Module } from '@nestjs/common';
import { IncentivesService } from './incentives.service';
import {
  IncentiveRulesController,
  IncentivesController,
  IncentiveLedgerController,
} from './incentives.controller';

@Module({
  controllers: [
    IncentiveRulesController,
    IncentivesController,
    IncentiveLedgerController,
  ],
  providers: [IncentivesService],
  exports: [IncentivesService],
})
export class IncentivesModule {}
