import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

import { AttendancePoliciesModule } from '../attendance-policies/attendance-policies.module';

@Module({
  imports: [DatabaseModule, AuthModule, AttendancePoliciesModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
