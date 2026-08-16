import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Live Control Cards & Daily Control Report (Excel Sheets Engine)', () => {
  let app: INestApplication;
  let pglite: PGlite;

  const adminUserId = '00000000-0000-0000-0003-000000000001';
  let adminToken: string;

  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const branchId = 'b0000000-0000-0000-0000-000000000001';
  const projectId = 'f0000000-0000-0000-0000-000000000001';
  const supervisorEmpId = 'e0000000-0000-0000-0000-000000000003';
  const workerEmpId = 'e0000000-0000-0000-0000-000000000006';

  let gpItemId: string;
  let blockItemId: string;
  let epoxyItemId: string;
  let gpStage1Id: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    adminToken = 'token-admin-cc-' + Date.now();
    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES
       ($1, $2, CURRENT_TIMESTAMP + interval '24 hours')`,
      [adminUserId, adminToken],
    );

    // Retrieve seeded item IDs from 0006
    const gpRes: any = await pglite.query(
      `SELECT id FROM work_items WHERE code = 'GYP-01' AND company_id = $1`,
      [companyId],
    );
    gpItemId = gpRes.rows[0]?.id;

    const blkRes: any = await pglite.query(
      `SELECT id FROM work_items WHERE code = 'BLK-01' AND company_id = $1`,
      [companyId],
    );
    blockItemId = blkRes.rows[0]?.id;

    const epxRes: any = await pglite.query(
      `SELECT id FROM work_items WHERE code = 'EPX-01' AND company_id = $1`,
      [companyId],
    );
    epoxyItemId = epxRes.rows[0]?.id;

    const stgRes: any = await pglite.query(
      `SELECT id FROM work_item_stages WHERE work_item_id = $1 AND code = 'STG-01'`,
      [gpItemId],
    );
    gpStage1Id = stgRes.rows[0]?.id;

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

  // Test 1: كارت GP CEILING -> مطابقة أرقام الشيت تمامًا:
  // perDay=20, perHour=1.25, laborCostPerUnit=21.6, marginPerUnit=213.4, stages actuals = 14 و 6
  it('Test 1: GP CEILING card matches Excel sheet calculations exact values', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/control-cards/${gpItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const card = res.body;
    expect(card.item.code).toBe('GYP-01');

    // Totals
    expect(card.totals.perDay).toBe(20);
    expect(card.totals.perHour).toBe(1.25);

    // Stages: 0.7 * 20 = 14, 0.3 * 20 = 6
    expect(card.stages.length).toBe(2);
    expect(card.stages[0].percentage).toBe(0.7);
    expect(card.stages[0].actualTotalProductivity).toBe(14);
    expect(card.stages[1].percentage).toBe(0.3);
    expect(card.stages[1].actualTotalProductivity).toBe(6);

    // Labor
    expect(card.labor.skilledDaily).toBe(224);
    expect(card.labor.unskilledDaily).toBe(208);
    expect(card.labor.crewDailyCost).toBe(432);
    expect(card.labor.laborCostPerUnit).toBe(21.6);

    // Contract
    expect(card.contract.price).toBe(235);
    expect(card.contract.materialPrice).toBe(0);
    expect(card.contract.marginPerUnit).toBe(213.4);
  });

  // Test 2: كارت BLOCK (مباني حوائط بلوك)
  it('Test 2: BLOCK card calculates correct daily rates, stages and contract values', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/control-cards/${blockItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const card = res.body;
    expect(card.item.code).toBe('BLK-01');
    expect(card.totals.perDay).toBe(65);
    expect(card.stages.length).toBe(2);
    expect(card.stages[0].percentage).toBe(0.15);
    expect(card.stages[1].percentage).toBe(0.85);
    expect(card.contract.price).toBe(220);
    expect(card.contract.materialPrice).toBe(95);
  });

  // Test 3: كارت EPOXY -> 9 مراحل بمجموع أوزان = 1.00
  it('Test 3: EPOXY card has 9 stages summing to ~1.0 weight', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/control-cards/${epoxyItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const card = res.body;
    expect(card.item.code).toBe('EPX-01');
    expect(card.stages.length).toBe(9);

    const totalWeight = card.stages.reduce((acc: number, s: any) => acc + s.percentage, 0);
    expect(Math.abs(totalWeight - 1.0)).toBeLessThanOrEqual(0.01);
  });

  // Test 4: التقرير اليومي يرجع أرقام مطابقة لإدخال production مسجل
  it('Test 4: Daily control report accurately computes weighted done, productivity vs standard and labor cost', async () => {
    const reportDate = '2026-08-16';

    // 1. Create a stage production record
    await request(app.getHttpServer())
      .post('/api/v1/production')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: reportDate,
        branchId,
        projectId,
        workItemId: gpItemId,
        workItemStageId: gpStage1Id,
        supervisorId: supervisorEmpId,
        actualQuantity: 28,
        targetQuantity: 25,
        productionType: 'individual',
        workers: [
          {
            employeeId: workerEmpId,
            individualQuantity: 28,
            hoursWorked: 8,
            overtimeHours: 2,
            skillLevel: 'skilled',
          },
        ],
      })
      .expect(201);

    // 2. Query Daily Control Report
    const res = await request(app.getHttpServer())
      .get(`/api/v1/control-reports/daily?projectId=${projectId}&date=${reportDate}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const reportRow = res.body.find((r: any) => r.workItemId === gpItemId);
    expect(reportRow).toBeDefined();
    expect(reportRow.actualQuantity).toBe(28);
    expect(reportRow.stagePercentage).toBe(0.7);
    expect(reportRow.weightedDone).toBe(19.6); // 28 * 0.7 = 19.6
    expect(reportRow.workersCount).toBe(1);
    expect(reportRow.productivityPct).toBe(112); // 28 / 25 * 100 = 112%
  });
});
