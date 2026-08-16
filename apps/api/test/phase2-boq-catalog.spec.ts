import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Phase 2: Hierarchical BOQ, Finishing Catalog, Stages & Prices', () => {
  let app: INestApplication;
  let pglite: PGlite;

  const adminUserId = '00000000-0000-0000-0003-000000000001';
  let adminToken: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    adminToken = 'token-admin-p2-' + Date.now();

    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + interval '24 hours')`,
      [adminUserId, adminToken],
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

  let createdCategoryId: string;
  let createdWorkItemId: string;
  let createdStageId: string;
  let createdRateId: string;

  // Test 1: إنشاء category → ينجح
  it('Test 1: create work category -> success (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/work-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'أعمال الديكورات الخاصة',
        code: 'DEPT-SPECIAL-DEC',
        level: 1,
        description: 'أعمال وتكسيات ديكورية تخصصية',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.code).toBe('DEPT-SPECIAL-DEC');
    createdCategoryId = res.body.id;
  });

  // Test 2: إنشاء item تحت category → ينجح
  it('Test 2: create work item under category -> success (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/work-items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'بانوهات خشبية كلاسيك',
        code: 'DEC-PANEL-01',
        category: 'ديكورات',
        defaultUnitRate: 180,
        defaultDailyTarget: 15,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('بانوهات خشبية كلاسيك');
    createdWorkItemId = res.body.id;
  });

  // Test 3: إنشاء stages لبند → ينجح
  it('Test 3: create stages for work item -> success (201)', async () => {
    const res1 = await request(app.getHttpServer())
      .post(`/api/v1/work-items/${createdWorkItemId}/stages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'التثبيت والوزن بالليزر',
        code: 'STG-01',
        percentage: 0.6,
        standardProductivity: 20,
      })
      .expect(201);

    expect(res1.body.id).toBeDefined();
    expect(Number(res1.body.percentage)).toBe(0.6);
    createdStageId = res1.body.id;

    const res2 = await request(app.getHttpServer())
      .post(`/api/v1/work-items/${createdWorkItemId}/stages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'المعجون والدهان النهائي',
        code: 'STG-02',
        percentage: 0.4,
        standardProductivity: 30,
      })
      .expect(201);

    expect(res2.body.id).toBeDefined();

    // Verify listing stages for item
    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/work-items/${createdWorkItemId}/stages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body.length).toBe(2);
  });

  // Test 4: تعديل نسبة stage → ينجح
  it('Test 4: update stage percentage -> success (200)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/work-item-stages/${createdStageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        percentage: 0.65,
      })
      .expect(200);

    expect(Number(res.body.percentage)).toBe(0.65);
  });

  // Test 5: تعديل labor rate → ينجح
  it('Test 5: update labor rate -> success (200/201)', async () => {
    const createRateRes = await request(app.getHttpServer())
      .post('/api/v1/labor-rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rateType: 'foreman',
        hourlyRate: 35,
        dailyRate: 280,
      })
      .expect(201);

    expect(createRateRes.body.id).toBeDefined();
    createdRateId = createRateRes.body.id;

    const updateRateRes = await request(app.getHttpServer())
      .patch(`/api/v1/labor-rates/${createdRateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dailyRate: 300,
      })
      .expect(200);

    expect(Number(updateRateRes.body.daily_rate)).toBe(300);
  });
});
