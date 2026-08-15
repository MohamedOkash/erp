import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateIncentiveRuleDto } from './dto/create-incentive-rule.dto';
import { UpdateIncentiveRuleDto } from './dto/update-incentive-rule.dto';
import { CalculateIncentivesDto } from './dto/calculate-incentives.dto';
import { ApproveIncentivesDto } from './dto/approve-incentives.dto';
import { QueryIncentiveDto } from './dto/query-incentive.dto';

@Injectable()
export class IncentivesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create an incentive rule
   */
  async createIncentiveRule(companyId: string, dto: CreateIncentiveRuleDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const dupRes = await client.query(
        `SELECT id FROM incentive_rules WHERE company_id = $1 AND name = $2`,
        [companyId, dto.name],
      );

      if (dupRes.rows.length > 0) {
        throw new ConflictException({
          code: 'INCENTIVE_RULE_NAME_DUPLICATE',
          message: 'Incentive rule name already exists',
        });
      }

      const isEnabled = dto.enabled !== undefined ? dto.enabled : true;

      const insertRes = await client.query(
        `INSERT INTO incentive_rules (
           company_id, name, rule_type, threshold_percentage, reward_amount, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, company_id, name, rule_type, threshold_percentage, reward_amount, is_active, created_at, updated_at`,
        [
          companyId,
          dto.name,
          dto.type,
          dto.thresholdPercentage,
          dto.rewardAmount,
          isEnabled,
        ],
      );

      return insertRes.rows[0];
    });
  }

  /**
   * List incentive rules with pagination
   */
  async findIncentiveRules(companyId: string, query: QueryIncentiveDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM incentive_rules WHERE company_id = $1`,
        [companyId],
      );
      const total = countRes.rows[0]?.total || 0;

      const dataRes = await client.query(
        `SELECT id, company_id, name, rule_type, threshold_percentage, reward_amount, is_active, created_at, updated_at
         FROM incentive_rules
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
   * Get single incentive rule
   */
  async getIncentiveRuleById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, name, rule_type, threshold_percentage, reward_amount, is_active, created_at, updated_at
         FROM incentive_rules
         WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'INCENTIVE_RULE_NOT_FOUND',
          message: 'Incentive rule not found',
        });
      }

      return res.rows[0];
    });
  }

  /**
   * Update incentive rule
   */
  async updateIncentiveRule(companyId: string, id: string, dto: UpdateIncentiveRuleDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const currentRes = await client.query(
        `SELECT * FROM incentive_rules WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (currentRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'INCENTIVE_RULE_NOT_FOUND',
          message: 'Incentive rule not found',
        });
      }

      const current = currentRes.rows[0];

      if (dto.name && dto.name !== current.name) {
        const dupRes = await client.query(
          `SELECT id FROM incentive_rules WHERE company_id = $1 AND name = $2 AND id != $3`,
          [companyId, dto.name, id],
        );
        if (dupRes.rows.length > 0) {
          throw new ConflictException({
            code: 'INCENTIVE_RULE_NAME_DUPLICATE',
            message: 'Incentive rule name already exists',
          });
        }
      }

      const updateRes = await client.query(
        `UPDATE incentive_rules
         SET name = COALESCE($3, name),
             rule_type = COALESCE($4, rule_type),
             threshold_percentage = COALESCE($5, threshold_percentage),
             reward_amount = COALESCE($6, reward_amount),
             is_active = COALESCE($7, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, name, rule_type, threshold_percentage, reward_amount, is_active, created_at, updated_at`,
        [
          companyId,
          id,
          dto.name || null,
          dto.type || null,
          dto.thresholdPercentage !== undefined ? dto.thresholdPercentage : null,
          dto.rewardAmount !== undefined ? dto.rewardAmount : null,
          dto.enabled !== undefined ? dto.enabled : null,
        ],
      );

      return updateRes.rows[0];
    });
  }

  /**
   * Delete incentive rule
   */
  async deleteIncentiveRule(companyId: string, id: string): Promise<void> {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `DELETE FROM incentive_rules WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );

      if (res.rowCount === 0) {
        throw new NotFoundException({
          code: 'INCENTIVE_RULE_NOT_FOUND',
          message: 'Incentive rule not found',
        });
      }
    });
  }

  /**
   * Calculate incentives based on production performance and active rules
   * Formula: compare (actual / target) * 100 with threshold_percentage
   */
  async calculateIncentives(companyId: string, dto: CalculateIncentivesDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      // 1. Fetch active incentive rules
      const rulesRes = await client.query(
        `SELECT * FROM incentive_rules WHERE company_id = $1 AND is_active = true`,
        [companyId],
      );
      const rules = rulesRes.rows;

      if (rules.length === 0) {
        return { calculations: [], totalAmount: 0 };
      }

      // 2. Fetch employee performance from production records and workers
      let filterEmp = '';
      const params: any[] = [companyId];
      if (dto.employeeIds && dto.employeeIds.length > 0) {
        filterEmp = ` AND pw.employee_id = ANY($2::uuid[])`;
        params.push(dto.employeeIds);
      }

      const prodRes = await client.query(
        `SELECT 
           pw.employee_id AS "employeeId",
           e.name AS "employeeName",
           pr.project_id AS "projectId",
           COALESCE(SUM(pw.individual_quantity), 0) AS "totalActual",
           COALESCE(SUM(pr.target_quantity), 0) AS "totalTarget"
         FROM production_workers pw
         JOIN production_records pr ON pw.production_record_id = pr.id AND pw.company_id = pr.company_id
         JOIN employees e ON pw.employee_id = e.id AND pw.company_id = e.company_id
         WHERE pr.company_id = $1
           ${filterEmp}
         GROUP BY pw.employee_id, e.name, pr.project_id`,
        params,
      );

      const calculations: any[] = [];
      let totalAmount = 0;

      // Check production rules
      const prodRules = rules.filter((r) => r.rule_type === 'production_bonus' || r.rule_type === 'quality_bonus');
      if (prodRules.length > 0 && prodRes.rows.length > 0) {
        for (const prod of prodRes.rows) {
          const totalActual = parseFloat(prod.totalActual);
          const totalTarget = parseFloat(prod.totalTarget);
          const percentage = totalTarget > 0 ? (totalActual / totalTarget) * 100 : (totalActual > 0 ? 120 : 0);

          for (const rule of prodRules) {
            const threshold = parseFloat(rule.threshold_percentage);
            if (percentage >= threshold) {
              const reward = parseFloat(rule.reward_amount);
              totalAmount += reward;
              calculations.push({
                employeeId: prod.employeeId,
                employeeName: prod.employeeName,
                projectId: prod.projectId,
                ruleId: rule.id,
                ruleName: rule.name,
                amount: reward,
                reason: `تحقيق نسبة إنجاز ${percentage.toFixed(1)}% متجاوزة الحد المستهدف (${threshold}%)`,
                percentage: Number(percentage.toFixed(1)),
              });
            }
          }
        }
      }

      // Check attendance rules
      const attRules = rules.filter((r) => r.rule_type === 'attendance_bonus');
      if (attRules.length > 0) {
        const attRes = await client.query(
          `SELECT 
             a.employee_id AS "employeeId",
             e.name AS "employeeName",
             a.project_id AS "projectId",
             COUNT(a.id)::int AS "daysPresent"
           FROM attendance a
           JOIN attendance_statuses s ON a.status_id = s.id
           JOIN employees e ON a.employee_id = e.id AND a.company_id = e.company_id
           WHERE a.company_id = $1 AND s.code = 'present'
           GROUP BY a.employee_id, e.name, a.project_id`,
          [companyId],
        );

        for (const att of attRes.rows) {
          for (const rule of attRules) {
            const threshold = parseFloat(rule.threshold_percentage);
            if (att.daysPresent >= threshold || threshold <= 100) {
              const reward = parseFloat(rule.reward_amount);
              totalAmount += reward;
              calculations.push({
                employeeId: att.employeeId,
                employeeName: att.employeeName,
                projectId: att.projectId,
                ruleId: rule.id,
                ruleName: rule.name,
                amount: reward,
                reason: `حضور منتظم ${att.daysPresent} يوم عمل`,
                percentage: 100,
              });
            }
          }
        }
      }


      return {
        calculations,
        totalAmount: Number(totalAmount.toFixed(2)),
      };
    });
  }

  /**
   * Approve incentives and create entries in incentive_ledger
   */
  async approveIncentives(companyId: string, dto: ApproveIncentivesDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      let createdCount = 0;
      let totalAmount = 0;

      for (const calc of dto.calculations) {
        const amount = Number(calc.amount);
        totalAmount += amount;

        await client.query(
          `INSERT INTO incentive_ledger (
             company_id, rule_id, employee_id, project_id, date, amount, status, notes
           ) VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, 'approved', $7)`,
          [
            companyId,
            calc.ruleId,
            calc.employeeId,
            calc.projectId || null,
            calc.date || null,
            amount,
            calc.reason || calc.notes || 'حافز معتمد',
          ],
        );
        createdCount++;
      }

      return {
        createdCount,
        totalAmount: Number(totalAmount.toFixed(2)),
      };
    });
  }

  /**
   * List ledger entries with filters and summary totals
   */
  async findIncentiveLedger(companyId: string, query: QueryIncentiveDto) {
    return this.db.withTenantClient(companyId, async (client) => {
      const conditions: string[] = ['l.company_id = $1'];
      const params: any[] = [companyId];
      let paramIdx = 2;

      if (query.fromDate) {
        conditions.push(`l.date >= $${paramIdx++}`);
        params.push(query.fromDate);
      }

      if (query.toDate) {
        conditions.push(`l.date <= $${paramIdx++}`);
        params.push(query.toDate);
      }

      if (query.employeeId) {
        conditions.push(`l.employee_id = $${paramIdx++}`);
        params.push(query.employeeId);
      }

      if (query.status) {
        conditions.push(`l.status = $${paramIdx++}`);
        params.push(query.status);
      }

      const whereClause = conditions.join(' AND ');
      const limit = query.limit || 20;
      const page = query.page || 1;
      const offset = (page - 1) * limit;

      const summaryRes = await client.query(
        `SELECT 
           COUNT(*)::int AS total,
           COALESCE(SUM(CASE WHEN l.status IN ('pending', 'approved') THEN l.amount ELSE 0 END), 0) AS total_pending,
           COALESCE(SUM(CASE WHEN l.status = 'paid' THEN l.amount ELSE 0 END), 0) AS total_paid,
           COALESCE(SUM(l.amount), 0) AS grand_total
         FROM incentive_ledger l
         WHERE ${whereClause}`,
        params,
      );

      const total = summaryRes.rows[0]?.total || 0;
      const totalPending = parseFloat(summaryRes.rows[0]?.total_pending || '0');
      const totalPaid = parseFloat(summaryRes.rows[0]?.total_paid || '0');
      const grandTotal = parseFloat(summaryRes.rows[0]?.grand_total || '0');

      const dataSql = `
        SELECT 
          l.id, l.company_id, l.rule_id, l.employee_id, l.project_id, l.date, l.amount, l.status, l.notes,
          l.created_at, l.updated_at,
          e.name AS employee_name, e.code AS employee_code,
          r.name AS rule_name,
          p.name AS project_name
        FROM incentive_ledger l
        JOIN employees e ON l.employee_id = e.id AND l.company_id = e.company_id
        LEFT JOIN incentive_rules r ON l.rule_id = r.id AND l.company_id = r.company_id
        LEFT JOIN projects p ON l.project_id = p.id AND l.company_id = p.company_id
        WHERE ${whereClause}
        ORDER BY l.date DESC, l.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      const dataRes = await client.query(dataSql, [...params, limit, offset]);

      return {
        data: dataRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
        summary: {
          totalPending,
          totalPaid,
          grandTotal,
        },
      };
    });
  }

  /**
   * Mark an incentive ledger entry as paid
   */
  async markLedgerPaid(companyId: string, id: string) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const res = await client.query(
        `UPDATE incentive_ledger
         SET status = 'paid', updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING *`,
        [companyId, id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'INCENTIVE_LEDGER_ENTRY_NOT_FOUND',
          message: 'Incentive ledger entry not found',
        });
      }

      return res.rows[0];
    });
  }
}
