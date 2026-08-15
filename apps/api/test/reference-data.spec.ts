import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Reference Data Module (Part 1)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const adminUserId = '00000000-0000-0000-0003-000000000001';
  let authToken: string;

  let createdBranchId: string;
  let createdProjectId: string;
  let createdWorkItemId: string;
  let createdWorkAreaId: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    // Create session token for admin user
    authToken = 'test-token-ref-data-' + Date.now();
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

  // ==========================================
  // Branches Tests
  // ==========================================
  it('test 1: should create a new branch with 201', async () => {
    const payload = {
      name: 'فرع الرياض الرئيسي',
      code: 'BR-RYD-01',
      location: 'الرياض - طريق الملك فهد',
      phone: '0501234567',
      isActive: true,
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe(payload.name);
    expect(res.body.code).toBe(payload.code);
    createdBranchId = res.body.id;
  });

  it('test 2: should list branches with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('test 3: should update branch with 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/branches/${createdBranchId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ location: 'الرياض - حي الملز' })
      .expect(200);

    expect(res.body.id).toBe(createdBranchId);
    expect(res.body.location).toBe('الرياض - حي الملز');
  });

  // ==========================================
  // Projects Tests
  // ==========================================
  it('test 4: should create a new project with 201', async () => {
    const payload = {
      branchId: createdBranchId,
      name: 'مشروع برج الأندلس',
      code: 'PRJ-AND-01',
      clientName: 'شركة الأندلس العقارية',
      location: 'الرياض',
      startDate: '2026-09-01',
      endDate: '2027-09-01',
      status: 'active',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe(payload.name);
    expect(res.body.code).toBe(payload.code);
    createdProjectId = res.body.id;
  });

  it('test 5: should list projects with filters', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('test 6: should update project with 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ clientName: 'شركة الأندلس القابضة' })
      .expect(200);

    expect(res.body.id).toBe(createdProjectId);
    expect(res.body.client_name).toBe('شركة الأندلس القابضة');
  });

  // ==========================================
  // Work Items Tests
  // ==========================================
  it('test 7: should create a new work item with 201', async () => {
    const payload = {
      name: 'أعمال عزل مائي وحراري',
      code: 'WI-ISO-01',
      category: 'عزل',
      description: 'عزل فوم مع بيتومين',
      defaultUnitRate: 85,
      defaultDailyTarget: 40,
      branchId: createdBranchId,
      customUnitRate: 90,
      customDailyTarget: 45,
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/work-items')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe(payload.name);
    createdWorkItemId = res.body.id;
  });

  it('test 8: should list work items with branch rates', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/work-items?branchId=${createdBranchId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('test 9: should update work item with 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/work-items/${createdWorkItemId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'عزل فوم بولي يوريثان 5 سم' })
      .expect(200);

    expect(res.body.id).toBe(createdWorkItemId);
    expect(res.body.description).toBe('عزل فوم بولي يوريثان 5 سم');
  });

  // ==========================================
  // Work Areas Tests
  // ==========================================
  it('test 10: should create hierarchical work areas with correct level and path', async () => {
    // 1. Root area
    const rootRes = await request(app.getHttpServer())
      .post('/api/v1/work-areas')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        projectId: createdProjectId,
        name: 'المبنى الرئيسي',
        code: 'BLD-A',
        sortOrder: 1,
      })
      .expect(201);

    expect(rootRes.body.level).toBe(1);
    expect(rootRes.body.path).toBe('/BLD-A');

    // 2. Child area
    const childRes = await request(app.getHttpServer())
      .post('/api/v1/work-areas')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        projectId: createdProjectId,
        parentId: rootRes.body.id,
        name: 'الدور الأرضي',
        code: 'FLR-00',
        sortOrder: 1,
      })
      .expect(201);

    expect(childRes.body.level).toBe(2);
    expect(childRes.body.path).toBe('/BLD-A/FLR-00');
    createdWorkAreaId = childRes.body.id;
  });

  it('test 11: should list work areas by project with 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/work-areas?projectId=${createdProjectId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBe(2);
  });

  it('test 12: should update work area with 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/work-areas/${createdWorkAreaId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'الدور الأرضي - بهو الاستقبال' })
      .expect(200);

    expect(res.body.id).toBe(createdWorkAreaId);
    expect(res.body.name).toBe('الدور الأرضي - بهو الاستقبال');
  });

  // ==========================================
  // BOQ Progress Tests
  // ==========================================
  it('test 13: should return BOQ progress with calculated progress percentage', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/boq')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);

    const firstItem = res.body.data[0];
    expect(firstItem.totalQuantity).toBeDefined();
    expect(firstItem.executedQuantity).toBeDefined();
    expect(firstItem.remainingQuantity).toBeDefined();
    expect(firstItem.progressPercentage).toBeDefined();
  });
});
