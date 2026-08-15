import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AlertsEvaluationService {
  private readonly logger = new Logger(AlertsEvaluationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Evaluate active alert rules for a specific company
   */
  async evaluateCompanyAlerts(companyId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const rulesRes = await client.query(
        `SELECT id, company_id, name, rule_type, condition_config, is_active
         FROM alert_rules
         WHERE company_id = $1 AND is_active = true`,
        [companyId],
      );

      const rules = rulesRes.rows;
      let alertsTriggered = 0;
      const details: any[] = [];

      for (const rule of rules) {
        const config = typeof rule.condition_config === 'string'
          ? JSON.parse(rule.condition_config)
          : rule.condition_config || {};

        const ruleType = rule.rule_type || config.type;
        const threshold = config.threshold !== undefined && config.threshold !== null
          ? Number(config.threshold)
          : null;
        const operator = config.condition?.operator || '>=';

        let conditionMet = false;
        let evaluatedValue: number | null = null;

        if (ruleType === 'production_threshold') {
          // Check actual production quantity
          const prodRes = await client.query(
            `SELECT COALESCE(SUM(actual_quantity), 0) AS total_qty,
                    COALESCE(MAX(actual_quantity), 0) AS max_qty
             FROM production_records
             WHERE company_id = $1`,
            [companyId],
          );

          const metric = config.condition?.metric || 'total_quantity';
          evaluatedValue = metric === 'max_quantity'
            ? parseFloat(prodRes.rows[0].max_qty)
            : parseFloat(prodRes.rows[0].total_qty);

          if (threshold !== null) {
            conditionMet = this.compare(evaluatedValue, operator, threshold);
          }
        } else if (ruleType === 'attendance_absence') {
          // Check count of absent records
          const attRes = await client.query(
            `SELECT COUNT(*)::int AS count
             FROM attendance a
             JOIN attendance_statuses s ON a.status_id = s.id
             WHERE a.company_id = $1 AND s.code = 'absent'`,
            [companyId],
          );

          evaluatedValue = attRes.rows[0]?.count || 0;
          if (threshold !== null) {
            conditionMet = this.compare(evaluatedValue, operator, threshold);
          }
        } else if (ruleType === 'cost_overrun') {
          // Check cost entries sum
          const costRes = await client.query(
            `SELECT COALESCE(SUM(amount), 0) AS total_cost
             FROM cost_entries
             WHERE company_id = $1`,
            [companyId],
          );
          evaluatedValue = parseFloat(costRes.rows[0].total_cost);
          if (threshold !== null) {
            conditionMet = this.compare(evaluatedValue, operator, threshold);
          }
        } else {
          // Generic fallback evaluation
          if (threshold !== null) {
            evaluatedValue = 0;
            conditionMet = this.compare(evaluatedValue, operator, threshold);
          }
        }

        if (conditionMet) {
          alertsTriggered++;
          const targetUserIds = Array.isArray(config.notificationUserIds) && config.notificationUserIds.length > 0
            ? config.notificationUserIds
            : undefined;

          await this.notificationsService.createNotification(companyId, {
            type: 'alert',
            title: `تنبيه: ${rule.name}`,
            message: `تم تفعيل التنبيه "${rule.name}" لتحقق الشرط (القيمة: ${evaluatedValue}, الحد: ${threshold})`,
            metadata: {
              ruleId: rule.id,
              ruleType,
              evaluatedValue,
              threshold,
            },
            userIds: targetUserIds,
          });

          details.push({
            ruleId: rule.id,
            name: rule.name,
            status: 'triggered',
            evaluatedValue,
            threshold,
          });
        } else {
          details.push({
            ruleId: rule.id,
            name: rule.name,
            status: 'skipped',
            evaluatedValue,
            threshold,
          });
        }
      }

      return {
        rulesEvaluated: rules.length,
        alertsTriggered,
        details,
      };
    });
  }

  /**
   * Helper comparison
   */
  private compare(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '==':
      case '=':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return value >= threshold;
    }
  }

  /**
   * Scheduled Cron Job: Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async evaluateAll() {
    this.logger.log('Running scheduled alert evaluation...');
    try {
      const companiesRes = await this.db.query(
        `SELECT id FROM companies WHERE is_active = true`,
      );

      for (const comp of companiesRes.rows) {
        await this.evaluateCompanyAlerts(comp.id);
      }
    } catch (err) {
      this.logger.error('Error during scheduled alert evaluation', err);
    }
  }
}
