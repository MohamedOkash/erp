import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Phase 4: Stage-Based Production & Weighted Progress Calculation', () => {
  let app: INestApplication;
  let pglite: PGlite;

  const adminUserId = '00000000-0000-0000-0003-000000000001';
  const engineerUserId = '00000000-0000-0000-0003-000000000002';
  const pmUserId = '00000000-0000-0000-0003-000000000004';

  let adminToken: string;
  let engineerToken: string;
  let pmToken: string;

  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const branchId = 'b0000000-0000-0000-0000-000000000001';
  const projectId = 'f0000000-0000-0000-0000-000000000001';
  const supervisorEmpId = 'e0000000-0000-0000-0000-000000000003';
  const workerEmpId = 'e0000000-0000-0000-0000-000000000006';

  let testWorkItemId: string;
  let testStage1Id: string;
  let testStage2Id: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    adminToken = 'token-admin-p4-' + Date.now();
    engineerToken = 'token-eng-p4-' + Date.now();
    pmToken = 'token-pm-p4-' + Date.now();

    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES
       ($1, $2, CURRENT_TIMESTAMP + interval '24 hours'),
       ($3, $4, CURRENT_TIMESTAMP + interval '24 hours'),
       ($5, $6, CURRENT_TIMESTAMP + interval '24 hours')`,
      [
        adminUserId, adminToken,
        engineerUserId, engineerToken,
        pmUserId, pmToken,
      ],
    );

    // Create item & stages for testing weighted progress
    const itemRes: any = await pglite.query(
      `INSERT INTO work_items (company_id, unit_id, name, code, default_unit_rate, default_daily_target)
       VALUES ($1, '00000000-0000-0000-0004-000000000001', 'محارة فاخرة للأروقة', 'PLS-P4-01', 50.00, 30.00)
       RETURNING id`,
      [companyId],
    );
    testWorkItemId = itemRes.rows[0].id;

    // Stage 1 (70% weight, 25 standard productivity)
    const stg1Res: any = await pglite.query(
      `INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity)
       VALUES ($1, $2, 'مرحلة الطرطشة والبؤج', 'STG-01', 0.70, 25.00)
       RETURNING id`,
      [companyId, testWorkItemId],
    );
    testStage1Id = stg1Res.rows[0].id;

    // Stage 2 (30% weight, 40 standard productivity)
    const stg2Res: any = await pglite.query(
      `INSERT INTO work_item_stages (company_id, work_item_id, name, code, percentage, standard_productivity)
       VALUES ($1, $2, 'مرحلة التخشين والمس', 'STG-02', 0.30, 40.00)
       RETURNING id`,
      [companyId, testWorkItemId],
    );
    testStage2Id = stg2Res.rows[0].id;

    // Insert BOQ item for this work item (quantity: 1000)
    await pglite.query(
      `INSERT INTO boq_items (company_id, boq_id, work_item_id, unit_id, item_code, total_quantity, unit_rate)
       VALUES ($1, '00000000-0000-0000-0006-000000000001', $2, '00000000-0000-0000-0004-000000000001', 'BI-P4-01', 1000.00, 50.00)`,
      [companyId, testWorkItemId],
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

  let createdRecordId: string;

  // Test 1: تسجيل إنتاج بمرحلة محددة وإضافة overtime و bonus للعامل
  it('Test 1: create production record with workItemStageId and worker overtime/bonus -> success (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/production')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: '2026-08-16',
        branchId,
        projectId,
        workItemId: testWorkItemId,
        workItemStageId: testStage1Id,
        supervisorId: supervisorEmpId,
        actualQuantity: 500,
        productionType: 'individual',
        workers: [
          {
            employeeId: workerEmpId,
            individualQuantity: 500,
            hoursWorked: 8,
            overtimeHours: 2.5,
            bonusPercentage: 10,
            skillLevel: 'skilled',
          },
        ],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.work_item_stage_id).toBe(testStage1Id);
    expect(Number(res.body.target_quantity)).toBe(25); // Standard productivity suggested!
    expect(res.body.workers[0].overtime_hours).toBeDefined();
    expect(Number(res.body.workers[0].overtime_hours)).toBe(2.5);
    expect(Number(res.body.workers[0].bonus_percentage)).toBe(10);
    expect(res.body.workers[0].skill_level).toBe('skilled');

    createdRecordId = res.body.id;
  });

  // Test 2: دورة الاعتماد الكاملة للمرحلة الأولى حتى final_approved
  it('Test 2: approve stage production record to final_approved -> success (200/201)', async () => {
    // submit
    await request(app.getHttpServer())
      .post(`/api/v1/production/${createdRecordId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ step: 'submit' })
      .expect(201);

    // engineer approve
    await request(app.getHttpServer())
      .post(`/api/v1/production/${createdRecordId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ step: 'engineer' })
      .expect(201);

    // final approve
    const finalRes = await request(app.getHttpServer())
      .post(`/api/v1/production/${createdRecordId}/approve`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ step: 'final' })
      .expect(201);

    expect(finalRes.body.status).toBe('final_approved');
  });

  // Test 3: تسجيل واعتماد إنتاج للمرحلة الثانية (Stage 2)
  it('Test 3: create and final approve production for stage 2 -> success (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/production')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: '2026-08-16',
        branchId,
        projectId,
        workItemId: testWorkItemId,
        workItemStageId: testStage2Id,
        supervisorId: supervisorEmpId,
        actualQuantity: 400,
        productionType: 'individual',
        workers: [
          {
            employeeId: workerEmpId,
            individualQuantity: 400,
          },
        ],
      })
      .expect(201);

    const rec2Id = res.body.id;

    // Submit -> Engineer -> Final
    await request(app.getHttpServer())
      .post(`/api/v1/production/${rec2Id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ step: 'submit' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/production/${rec2Id}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ step: 'engineer' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/production/${rec2Id}/approve`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ step: 'final' })
      .expect(201);
  });

  // Test 4: التحقق من حساب الأوزان النسبية عبر v_boq_progress_weighted
  it('Test 4: check weighted BOQ progress calculation via view -> success (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/production/progress-weighted?projectId=${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Finding records for our test work item
    const itemRecords = res.body.filter(
      (r: any) => r.work_item_id === testWorkItemId,
    );
    expect(itemRecords.length).toBe(2);

    // Stage 1: actual 500 * 0.70 weight = 350 weighted done
    const stage1Row = itemRecords.find((r: any) => r.work_item_stage_id === testStage1Id);
    expect(Number(stage1Row.stage_done)).toBe(500);
    expect(Number(stage1Row.weighted_done)).toBe(350);

    // Stage 2: actual 400 * 0.30 weight = 120 weighted done
    const stage2Row = itemRecords.find((r: any) => r.work_item_stage_id === testStage2Id);
    expect(Number(stage2Row.stage_done)).toBe(400);
    expect(Number(stage2Row.weighted_done)).toBe(120);
  });
});
