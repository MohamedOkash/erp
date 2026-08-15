import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Costs Module (Task 14)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const branchId = 'b0000000-0000-0000-0000-000000000001';
  const projectId = 'f0000000-0000-0000-0000-000000000001';
  const adminUserId = '00000000-0000-0000-0003-000000000001';
  let authToken: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    // Create session token for admin user
    authToken = 'test-token-costs-' + Date.now();
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

  // Test 1: إنشاء cost entry صحيح (material) → توقع 201 ومبلغ محسوب
  it('test 1: should create valid material cost entry with 201 and computed amount (quantity * unitCost)', async () => {
    const payload = {
      date: '2026-08-16',
      projectId,
      branchId,
      costType: 'material',
      quantity: 50,
      unitCost: 120, // 50 * 120 = 6000
      description: 'شراء أسمنت بورتلاندي',
      referenceNumber: 'PO-2026-001',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/costs')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.project_id).toBe(projectId);
    expect(response.body.category).toBe('material');
    expect(parseFloat(response.body.amount)).toBe(6000);
    expect(response.body.reference_number).toBe(payload.referenceNumber);
  });

  // Test 2: إنشاء cost entry صحيح (labor) مربوط بـ production_record → توقع 201
  it('test 2: should create valid labor cost entry linked to production record with 201', async () => {
    const payload = {
      date: '2026-08-16',
      projectId,
      branchId,
      costType: 'labor',
      amount: 3500,
      description: 'أجور عمالة صب الخرسانة',
      referenceId: 'PR-2026-08-16-001',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/costs')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.category).toBe('labor');
    expect(parseFloat(response.body.amount)).toBe(3500);
    expect(response.body.reference_number).toBe(payload.referenceId);
  });

  // Test 3: محاولة إنشاء cost entry لمشروع غير موجود → توقع 404 PROJECT_NOT_FOUND
  it('test 3: should reject cost entry for non-existent project with 404', async () => {
    const invalidPayload = {
      date: '2026-08-16',
      projectId: '00000000-9999-9999-9999-000000000000',
      branchId,
      costType: 'material',
      amount: 1000,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/costs')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidPayload)
      .expect(404);

    expect(response.body.code).toBe('PROJECT_NOT_FOUND');
  });

  // Test 4: جلب summary مع فلاتر → توقع totals صحيحة
  it('test 4: should get cost summary with aggregate totals by project, branch and category', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/costs/summary?projectId=${projectId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.totalLabor).toBe(3500);
    expect(response.body.totalMaterial).toBe(6000);
    expect(response.body.grandTotal).toBe(9500);
    expect(Array.isArray(response.body.byProject)).toBe(true);
    expect(Array.isArray(response.body.byBranch)).toBe(true);
    expect(Array.isArray(response.body.byCategory)).toBe(true);
  });

  // Test 5: تحديث cost entry → توقع 200
  it('test 5: should update existing cost entry with 200 and return updated data', async () => {
    const firstRes = await pglite.query<{ id: string }>(
      `SELECT id FROM cost_entries WHERE company_id = $1 LIMIT 1`,
      [companyId],
    );
    const costId = firstRes.rows[0].id;

    const updatePayload = {
      description: 'تعديل البيان بعد مراجعة الفاتورة',
      amount: 6500,
    };

    const response = await request(app.getHttpServer())
      .put(`/api/v1/costs/${costId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatePayload)
      .expect(200);

    expect(response.body.id).toBe(costId);
    expect(response.body.description).toBe(updatePayload.description);
    expect(parseFloat(response.body.amount)).toBe(6500);
  });

  // Test 6: حساب تكاليف العمالة تلقائيًا من الحضور → توقع أرقام منطقية
  it('test 6: should auto-calculate estimated labor costs from attendance records', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/costs/labor-auto-calculate')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.totalEstimatedLaborCost).toBeGreaterThan(0);
    expect(response.body.employeeCount).toBeGreaterThan(0);

    const firstEmp = response.body.data[0];
    expect(firstEmp.employeeId).toBeDefined();
    expect(firstEmp.employeeName).toBeDefined();
    expect(firstEmp.daysPresent).toBeGreaterThan(0);
    expect(firstEmp.estimatedLaborCost).toBeGreaterThan(0);
  });
});
