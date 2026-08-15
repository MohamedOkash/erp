import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { QueryAlertRuleDto } from './dto/query-alert-rule.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new alert rule
   */
  async createAlertRule(companyId: string, dto: CreateAlertRuleDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const dupRes = await client.query(
        `SELECT id FROM alert_rules WHERE company_id = $1 AND name = $2`,
        [companyId, dto.name],
      );

      if (dupRes.rows.length > 0) {
        throw new ConflictException({
          code: 'ALERT_RULE_NAME_DUPLICATE',
          message: 'Alert rule name already exists',
        });
      }

      const conditionConfig = {
        type: dto.type,
        condition: dto.condition || {},
        threshold: dto.threshold !== undefined ? dto.threshold : null,
        scope: dto.scope || {},
        notificationUserIds: dto.notificationUserIds || [],
      };

      const isEnabled = dto.enabled !== undefined ? dto.enabled : true;

      const insertRes = await client.query(
        `INSERT INTO alert_rules (
           company_id, name, rule_type, condition_config, is_active
         ) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, company_id, name, rule_type, condition_config, is_active, created_at, updated_at`,
        [
          companyId,
          dto.name,
          dto.type,
          JSON.stringify(conditionConfig),
          isEnabled,
        ],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * List alert rules for the company with pagination
   */
  async findAlertRules(companyId: string, query: QueryAlertRuleDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM alert_rules WHERE company_id = $1`,
        [companyId],
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await client.query(
        `SELECT id, company_id, name, rule_type, condition_config, is_active, created_at, updated_at
         FROM alert_rules
         WHERE company_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [companyId, limit, offset],
      );

      return {
        data: dataRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      };
    });
  }

  /**
   * Get single alert rule by ID
   */
  async getAlertRuleById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, name, rule_type, condition_config, is_active, created_at, updated_at
         FROM alert_rules
         WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'ALERT_RULE_NOT_FOUND',
          message: 'Alert rule not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(
    companyId: string,
    id: string,
    dto: UpdateAlertRuleDto,
  ) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const currentRes = await client.query(
        `SELECT * FROM alert_rules WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (currentRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'ALERT_RULE_NOT_FOUND',
          message: 'Alert rule not found',
        });
      }

      const current = currentRes.rows[0];

      if (dto.name && dto.name !== current.name) {
        const dupRes = await client.query(
          `SELECT id FROM alert_rules WHERE company_id = $1 AND name = $2 AND id != $3`,
          [companyId, dto.name, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'ALERT_RULE_NAME_DUPLICATE',
            message: 'Alert rule name already exists',
          });
        }
      }

      const currentConfig = typeof current.condition_config === 'string'
        ? JSON.parse(current.condition_config)
        : current.condition_config || {};

      const updatedConfig = {
        ...currentConfig,
        type: dto.type !== undefined ? dto.type : currentConfig.type || current.rule_type,
        condition: dto.condition !== undefined ? dto.condition : currentConfig.condition,
        threshold: dto.threshold !== undefined ? dto.threshold : currentConfig.threshold,
        scope: dto.scope !== undefined ? dto.scope : currentConfig.scope,
        notificationUserIds: dto.notificationUserIds !== undefined ? dto.notificationUserIds : currentConfig.notificationUserIds,
      };

      const updateRes = await client.query(
        `UPDATE alert_rules
         SET name = COALESCE($3, name),
             rule_type = COALESCE($4, rule_type),
             condition_config = $5,
             is_active = COALESCE($6, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, name, rule_type, condition_config, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.name || null,
          dto.type || null,
          JSON.stringify(updatedConfig),
          dto.enabled !== undefined ? dto.enabled : null,
        ],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM alert_rules WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'ALERT_RULE_NOT_FOUND',
          message: 'Alert rule not found',
        });
      }
    });
  }
}
