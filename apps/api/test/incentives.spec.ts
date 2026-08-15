import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Incentives Module (Task 15)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const adminUserId = '00000000-0000-0000-0003-000000000001';
  let authToken: string;
  let createdRuleId: string;
  let createdLedgerId: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    // Create session token for admin user
    authToken = 'test-token-incentives-' + Date.now();
    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + interval '24 hours')`,
      [adminUserId, authToken],
    );

    const mockDbService = {
      query: async (text: string, params?: any[]) => {
        const res = await pglite.query(text, params || []);
        return { rows: res.rows, rowCount: (res as any).affectedRows ?? res.rows.length } as any;
      },
      withTenantTransaction: async (tenantCompanyId: string, op: any) => {
        return pglite.transaction(async (tx) => {
          await tx.query("SELECT set_config('app.company_id', $1, true)", [tenantCompanyId]);
          const clientShim = {
            query: async (t: string, p?: any[]) => {
              const r = await tx.query(t, p || []);
              return { rows: r.rows, rowCount: (r as any).affectedRows ?? r.rows.length };
            },
          };
          return op(clientShim);
        });
      },
      withTenantClient: async (tenantCompanyId: string, op: any) => {
        await pglite.query("SELECT set_config('app.company_id', $1, true)", [tenantCompanyId]);
        const clientShim = {
          query: async (t: string, p?: any[]) => {
            const r = await pglite.query(t, p || []);
            return { rows: r.rows, rowCount: (r as any).affectedRows ?? r.rows.length };
          },
        };
        const result = await op(clientShim);
        await pglite.query("SELECT set_config('app.company_id', '', false)");
        return result;
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDbService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Test 1: إنشاء incentive rule → توقع 201
  it('test 1: should create valid incentive rule with 201', async () => {
    const payload = {
      name: 'مكافأة تجاوز معدل الإنتاج 110%',
      type: 'production_bonus',
      thresholdPercentage: 110,
      rewardAmount: 750,
      enabled: true,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/incentive-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe(payload.name);
    expect(parseFloat(response.body.reward_amount)).toBe(750);
    createdRuleId = response.body.id;
  });

  // Test 2: حساب الحوافز لموظف بإنتاج عالي → توقع amount > 0
  it('test 2: should calculate incentives for employees with high production', async () => {
    await pglite.query(
      `INSERT INTO production_records (id, company_id, branch_id, project_id, work_item_id, date, production_type, actual_quantity, target_quantity, supervisor_id, status)
       VALUES ('d0000000-0000-0000-0000-000000000099', $1, 'b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0005-000000000001', '2026-08-16', 'individual', 120, 100, 'e0000000-0000-0000-0000-000000000001', 'final_approved')
       ON CONFLICT (company_id, id) DO NOTHING`,
      [companyId],
    );

    await pglite.query(
      `INSERT INTO production_workers (company_id, production_record_id, employee_id, worker_type, individual_quantity, hours_worked)
       VALUES ($1, 'd0000000-0000-0000-0000-000000000099', 'e0000000-0000-0000-0000-000000000001', 'individual', 120, 8)
       ON CONFLICT (company_id, production_record_id, employee_id) DO NOTHING`,
      [companyId],
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/incentives/calculate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(201);


    expect(response.body.calculations).toBeDefined();
    expect(Array.isArray(response.body.calculations)).toBe(true);
    expect(response.body.calculations.length).toBeGreaterThanOrEqual(1);
    expect(response.body.totalAmount).toBeGreaterThan(0);
  });

  // Test 3: اعتماد الحوافز وإنشاء ledger entries → توقع createdCount صحيح
  it('test 3: should approve calculated incentives and create ledger entries', async () => {
    const payload = {
      calculations: [
        {
          employeeId: 'e0000000-0000-0000-0000-000000000001',
          ruleId: createdRuleId,
          amount: 750,
          notes: 'مكافأة إنتاج معتمدة لشهر أغسطس',
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/incentives/approve')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.createdCount).toBe(1);
    expect(response.body.totalAmount).toBe(750);
  });

  // Test 4: جلب ledger مع summary → توقع totals صحيحة
  it('test 4: should list incentive ledger entries with summary totals', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/incentive-ledger')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(response.body.summary).toBeDefined();
    expect(response.body.summary.totalPending).toBeGreaterThanOrEqual(750);

    createdLedgerId = response.body.data[0].id;
  });

  // Test 5: تعليم حافز كمدفوع → توقع 200 + updated status
  it('test 5: should mark incentive ledger entry as paid with 200', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/incentive-ledger/${createdLedgerId}/mark-paid`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.id).toBe(createdLedgerId);
    expect(response.body.status).toBe('paid');
  });

  // Test 6: محاولة إنشاء rule بنفس الاسم → توقع 409
  it('test 6: should reject duplicate incentive rule name with 409', async () => {
    const duplicatePayload = {
      name: 'مكافأة تجاوز معدل الإنتاج 110%',
      type: 'production_bonus',
      thresholdPercentage: 110,
      rewardAmount: 500,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/incentive-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send(duplicatePayload)
      .expect(409);

    expect(response.body.code).toBe('INCENTIVE_RULE_NAME_DUPLICATE');
  });
});
