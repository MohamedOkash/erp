import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { ProductionModule } from './production/production.module';
import { ImportsModule } from './imports/imports.module';
import { ExportsModule } from './exports/exports.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceModule } from './attendance/attendance.module';
import { AttendancePoliciesModule } from './attendance-policies/attendance-policies.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AlertsModule } from './alerts/alerts.module';
import { CostsModule } from './costs/costs.module';
import { IncentivesModule } from './incentives/incentives.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportsModule } from './reports/reports.module';
import { BranchesModule } from './branches/branches.module';
import { ProjectsModule } from './projects/projects.module';
import { WorkItemsModule } from './work-items/work-items.module';
import { WorkAreasModule } from './work-areas/work-areas.module';
import { BoqModule } from './boq/boq.module';
import { WorkCategoriesModule } from './work-categories/work-categories.module';
import { WorkItemStagesModule } from './work-item-stages/work-item-stages.module';
import { WorkItemPricesModule } from './work-item-prices/work-item-prices.module';
import { LaborRatesModule } from './labor-rates/labor-rates.module';
import { TransfersModule } from './transfers/transfers.module';
import { ControlCardsModule } from './control-cards/control-cards.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    BranchesModule,
    ProjectsModule,
    WorkItemsModule,
    WorkAreasModule,
    BoqModule,
    WorkCategoriesModule,
    WorkItemStagesModule,
    WorkItemPricesModule,
    LaborRatesModule,
    TransfersModule,
    ControlCardsModule,
    EmployeesModule,
    ProductionModule,
    AttendanceModule,
    AttendancePoliciesModule,
    NotificationsModule,
    AlertsModule,
    CostsModule,
    IncentivesModule,
    DocumentsModule,
    ReportsModule,
    ImportsModule,
    ExportsModule,
  ],

  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
