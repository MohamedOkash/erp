import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Saved Reports Module (Task 17)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const adminUserId = '00000000-0000-0000-0003-000000000001';
  const engineerUserId = '00000000-0000-0000-0003-000000000002';
  let authToken: string;
  let prodReportId: string;
  let costReportId: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    // Create session token for admin user
    authToken = 'test-token-reports-' + Date.now();
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

  // Test 1: إنشاء تقرير محفوظ → توقع 201
  it('test 1: should create a new saved report with 201', async () => {
    const payload = {
      name: 'تقرير الإنتاج اليومي للمشاريع',
      reportType: 'production',
      filters: { status: 'final_approved' },
      columns: ['date', 'actual_quantity', 'daily_target', 'project_name'],
      isPublic: true,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/saved-reports')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe(payload.name);
    expect(response.body.report_type).toBe('production');
    prodReportId = response.body.id;
  });

  // Test 2: تشغيل تقرير production → توقع data من production_records
  it('test 2: should run production saved report and return aggregated data', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/saved-reports/${prodReportId}/run`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(response.body.report).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(response.body.summary).toBeDefined();
  });

  // Test 3: تشغيل تقرير costs → توقع data من cost_entries
  it('test 3: should run costs saved report and return data from cost_entries', async () => {
    // Create a cost report
    const costReportPayload = {
      name: 'تقرير التكاليف والمصروفات',
      reportType: 'costs',
      filters: {},
    };

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/saved-reports')
      .set('Authorization', `Bearer ${authToken}`)
      .send(costReportPayload)
      .expect(201);

    costReportId = createRes.body.id;

    const response = await request(app.getHttpServer())
      .post(`/api/v1/saved-reports/${costReportId}/run`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.summary).toBeDefined();
  });

  // Test 4: مشاركة التقرير مع مستخدم → توقع sharedCount
  it('test 4: should share saved report with specific user IDs', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/saved-reports/${prodReportId}/share`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userIds: [engineerUserId] })
      .expect(201);

    expect(response.body.sharedCount).toBe(1);
  });

  // Test 5: حذف التقرير → توقع 204
  it('test 5: should delete saved report with 204', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/saved-reports/${costReportId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);

    const checkRes = await pglite.query(`SELECT id FROM saved_reports WHERE id = $1`, [costReportId]);
    expect(checkRes.rows.length).toBe(0);
  });
});
