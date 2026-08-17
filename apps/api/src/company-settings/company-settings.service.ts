import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CompanySettingRecord {
  id: string;
  company_id: string;
  key: string;
  value: string;
  data_type: string;
  category: string;
  display_name_ar: string;
  description_ar: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class CompanySettingsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get all company settings as structured records and as a fast lookup map
   */
  async getCompanySettings(companyId: string) {
    return this.db.withTenantClient(companyId, async (client) => {
      // Ensure default settings exist for this company
      await this.ensureDefaultSettings(client, companyId);

      const res = await client.query(
        `SELECT id, company_id, key, value, data_type, category, display_name_ar, description_ar, created_at, updated_at
         FROM company_settings
         WHERE company_id = $1
         ORDER BY category ASC, key ASC`,
        [companyId],
      );

      const settingsMap: Record<string, any> = {};
      res.rows.forEach((row: CompanySettingRecord) => {
        let parsedVal: any = row.value;
        if (row.data_type === 'number') {
          parsedVal = Number(row.value);
        } else if (row.data_type === 'boolean') {
          parsedVal = row.value === 'true';
        }
        settingsMap[row.key] = parsedVal;
      });

      return {
        list: res.rows,
        settings: settingsMap,
      };
    });
  }

  /**
   * Get raw map of key-value pairs for fast backend calculations
   */
  async getSettingsMap(companyId: string): Promise<Record<string, number>> {
    return this.db.withTenantClient(companyId, async (client) => {
      const res = await client.query(
        `SELECT key, value FROM company_settings WHERE company_id = $1`,
        [companyId],
      );

      const map: Record<string, number> = {
        hours_per_work_day: 8,
        overtime_multiplier: 1.5,
        rounding_decimals: 2,
        default_crew_skilled: 1,
        default_crew_unskilled: 1,
        default_daily_productivity: 20,
        default_skilled_daily_wage: 224,
        default_unskilled_daily_wage: 208,
      };

      res.rows.forEach((r: any) => {
        const num = parseFloat(r.value);
        if (!isNaN(num)) {
          map[r.key] = num;
        }
      });

      return map;
    });
  }

  /**
   * Update multiple or single company settings
   */
  async updateCompanySettings(
    companyId: string,
    settings: Record<string, string | number>,
  ) {
    await this.db.withTenantTransaction(companyId, async (client) => {
      for (const [key, rawValue] of Object.entries(settings)) {
        const strVal = String(rawValue);
        await client.query(
          `INSERT INTO company_settings (company_id, key, value, display_name_ar, updated_at)
           VALUES ($1, $2, $3, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (company_id, key)
           DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [companyId, key, strVal],
        );
      }
    });

    return this.getCompanySettings(companyId);
  }

  /**
   * Ensure default settings exist for a given company
   */
  private async ensureDefaultSettings(client: any, companyId: string) {
    await client.query(
      `INSERT INTO company_settings (company_id, key, value, data_type, category, display_name_ar, description_ar)
       SELECT 
           $1,
           defaults.key,
           defaults.value,
           defaults.data_type,
           defaults.category,
           defaults.display_name_ar,
           defaults.description_ar
       FROM (
           VALUES
               ('hours_per_work_day', '8', 'number', 'calculation', 'ساعات العمل اليومية القياسية', 'عدد ساعات يوم العمل المعتمدة في حساب إنتاجية الساعة وتكلفة الأجور'),
               ('overtime_multiplier', '1.5', 'number', 'calculation', 'معامل احتساب الوقت الإضافي', 'مضاعف أجر الساعة لساعات العمل الإضافية في حساب تكاليف العمالة'),
               ('rounding_decimals', '2', 'number', 'calculation', 'دقة التقريب العشري', 'عدد الخانات العشرية في احتساب المبالغ والكميات ونسب الإنجاز'),
               ('default_crew_skilled', '1', 'number', 'calculation', 'العدد الافتراضي للفنيين في الفرقة', 'عدد الفنيين (المعلمين) الافتراضي في طاقم العمل ببطاقات التحكم'),
               ('default_crew_unskilled', '1', 'number', 'calculation', 'العدد الافتراضي للمساعدين في الفرقة', 'عدد المساعدين (العمال) الافتراضي في طاقم العمل ببطاقات التحكم'),
               ('default_daily_productivity', '20', 'number', 'calculation', 'الإنتاجية اليومية القياسية للبند', 'معدل الإنتاج اليومي الافتراضي للبنود القياسية'),
               ('default_skilled_daily_wage', '224', 'number', 'calculation', 'أجر يومية الفني الافتراضي (ريال)', 'قيمة يومية المعلم / الفني الافتراضية في النظام'),
               ('default_unskilled_daily_wage', '208', 'number', 'calculation', 'أجر يومية المساعد الافتراضي (ريال)', 'قيمة يومية المساعد / العامل الافتراضية في النظام')
       ) AS defaults(key, value, data_type, category, display_name_ar, description_ar)
       ON CONFLICT (company_id, key) DO NOTHING`,
      [companyId],
    );
  }
}
