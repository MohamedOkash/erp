import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLaborRateDto } from './dto/create-labor-rate.dto';
import { UpdateLaborRateDto } from './dto/update-labor-rate.dto';

@Injectable()
export class LaborRatesService {
  constructor(private readonly db: DatabaseService) {}

  async listLaborRates(companyId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, rate_type, hourly_rate, daily_rate, effective_from, created_at, updated_at
         FROM labor_rates
         WHERE company_id = $1
         ORDER BY effective_from DESC, rate_type ASC`,
        [companyId],
      );
      return res.rows;
    });
  }

  async getLaborRateById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT id, company_id, rate_type, hourly_rate, daily_rate, effective_from, created_at, updated_at
         FROM labor_rates
         WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'LABOR_RATE_NOT_FOUND',
          message: 'Labor rate record not found',
        });
      }
      return res.rows[0];
    });
  }

  async createLaborRate(companyId: string, dto: CreateLaborRateDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const effectiveDate = dto.effectiveFrom || new Date().toISOString().split('T')[0];

      const insertRes = await client.query(
        `INSERT INTO labor_rates (
           company_id, rate_type, hourly_rate, daily_rate, effective_from
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, rate_type, effective_from)
         DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate,
                       daily_rate = EXCLUDED.daily_rate,
                       updated_at = CURRENT_TIMESTAMP
         RETURNING id, company_id, rate_type, hourly_rate, daily_rate, effective_from, created_at, updated_at`,
        [companyId, dto.rateType, dto.hourlyRate, dto.dailyRate, effectiveDate],
      );
      return insertRes.rows[0];
    });
  }

  async updateLaborRate(companyId: string, id: string, dto: UpdateLaborRateDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT id FROM labor_rates WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'LABOR_RATE_NOT_FOUND',
          message: 'Labor rate record not found',
        });
      }

      const updateRes = await client.query(
        `UPDATE labor_rates
         SET rate_type = COALESCE($3, rate_type),
             hourly_rate = COALESCE($4, hourly_rate),
             daily_rate = COALESCE($5, daily_rate),
             effective_from = COALESCE($6, effective_from),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, rate_type, hourly_rate, daily_rate, effective_from, created_at, updated_at`,
        [
          companyId,
          id,
          dto.rateType || null,
          dto.hourlyRate !== undefined ? dto.hourlyRate : null,
          dto.dailyRate !== undefined ? dto.dailyRate : null,
          dto.effectiveFrom || null,
        ],
      );
      return updateRes.rows[0];
    });
  }
}
