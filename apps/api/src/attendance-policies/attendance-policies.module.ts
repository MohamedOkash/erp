import { Module } from '@nestjs/common';
import { AttendancePoliciesService } from './attendance-policies.service';
import { AttendancePoliciesController } from './attendance-policies.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AttendancePoliciesController],
  providers: [AttendancePoliciesService],
  exports: [AttendancePoliciesService],
})
export class AttendancePoliciesModule {}
