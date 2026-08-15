import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsEvaluationService } from './alerts-evaluation.service';
import { AlertRulesController, AlertsController } from './alerts.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AlertRulesController, AlertsController],
  providers: [AlertsService, AlertsEvaluationService],
  exports: [AlertsService, AlertsEvaluationService],
})
export class AlertsModule {}
