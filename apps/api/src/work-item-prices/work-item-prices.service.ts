import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWorkItemPriceDto } from './dto/create-work-item-price.dto';
import { UpdateWorkItemPriceDto } from './dto/update-work-item-price.dto';

@Injectable()
export class WorkItemPricesService {
  constructor(private readonly db: DatabaseService) {}

  async listPrices(companyId: string, workItemId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT p.id, p.company_id, p.work_item_id, p.branch_id, b.name AS branch_name,
                p.contract_price, p.material_price, p.labor_rate_skilled, p.labor_rate_unskilled,
                p.effective_from, p.created_at, p.updated_at
         FROM work_item_prices p
         LEFT JOIN branches b ON p.branch_id = b.id AND p.company_id = b.company_id
         WHERE p.company_id = $1 AND p.work_item_id = $2
         ORDER BY p.effective_from DESC, p.created_at DESC`,
        [companyId, workItemId],
      );
      return res.rows;
    });
  }

  async getPriceById(companyId: string, id: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT p.id, p.company_id, p.work_item_id, p.branch_id, b.name AS branch_name,
                p.contract_price, p.material_price, p.labor_rate_skilled, p.labor_rate_unskilled,
                p.effective_from, p.created_at, p.updated_at
         FROM work_item_prices p
         LEFT JOIN branches b ON p.branch_id = b.id AND p.company_id = b.company_id
         WHERE p.company_id = $1 AND p.id = $2`,
        [companyId, id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException({
          code: 'PRICE_NOT_FOUND',
          message: 'Work item price record not found',
        });
      }
      return res.rows[0];
    });
  }

  async createPrice(companyId: string, workItemId: string, dto: CreateWorkItemPriceDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const effectiveDate = dto.effectiveFrom || new Date().toISOString().split('T')[0];

      const insertRes = await client.query(
        `INSERT INTO work_item_prices (
           company_id, work_item_id, branch_id, contract_price, material_price,
           labor_rate_skilled, labor_rate_unskilled, effective_from
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (company_id, work_item_id, branch_id, effective_from)
         DO UPDATE SET contract_price = EXCLUDED.contract_price,
                       material_price = EXCLUDED.material_price,
                       labor_rate_skilled = EXCLUDED.labor_rate_skilled,
                       labor_rate_unskilled = EXCLUDED.labor_rate_unskilled,
                       updated_at = CURRENT_TIMESTAMP
         RETURNING id, company_id, work_item_id, branch_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled, effective_from, created_at, updated_at`,
        [
          companyId,
          workItemId,
          dto.branchId || null,
          dto.contractPrice,
          dto.materialPrice || 0,
          dto.laborRateSkilled !== undefined ? dto.laborRateSkilled : 224,
          dto.laborRateUnskilled !== undefined ? dto.laborRateUnskilled : 208,
          effectiveDate,
        ],
      );
      return insertRes.rows[0];
    });
  }

  async updatePrice(companyId: string, id: string, dto: UpdateWorkItemPriceDto) {
    return this.db.withTenantTransaction(companyId, async (client) => {
      const curRes = await client.query(
        `SELECT id FROM work_item_prices WHERE company_id = $1 AND id = $2`,
        [companyId, id],
      );
      if (curRes.rows.length === 0) {
        throw new NotFoundException({
          code: 'PRICE_NOT_FOUND',
          message: 'Work item price record not found',
        });
      }

      const updateRes = await client.query(
        `UPDATE work_item_prices
         SET branch_id = COALESCE($3, branch_id),
             contract_price = COALESCE($4, contract_price),
             material_price = COALESCE($5, material_price),
             labor_rate_skilled = COALESCE($6, labor_rate_skilled),
             labor_rate_unskilled = COALESCE($7, labor_rate_unskilled),
             effective_from = COALESCE($8, effective_from),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1 AND id = $2
         RETURNING id, company_id, work_item_id, branch_id, contract_price, material_price, labor_rate_skilled, labor_rate_unskilled, effective_from, created_at, updated_at`,
        [
          companyId,
          id,
          dto.branchId !== undefined ? dto.branchId : null,
          dto.contractPrice !== undefined ? dto.contractPrice : null,
          dto.materialPrice !== undefined ? dto.materialPrice : null,
          dto.laborRateSkilled !== undefined ? dto.laborRateSkilled : null,
          dto.laborRateUnskilled !== undefined ? dto.laborRateUnskilled : null,
          dto.effectiveFrom || null,
        ],
      );
      return updateRes.rows[0];
    });
  }
}
