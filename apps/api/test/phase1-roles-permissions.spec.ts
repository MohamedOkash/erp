import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Phase 1: Roles, Permissions Matrix & Approval Chain Restructure', () => {
  let app: INestApplication;
  let pglite: PGlite;

  const adminUserId = '00000000-0000-0000-0003-000000000001'; // company_admin
  const engineerUserId = '00000000-0000-0000-0003-000000000002'; // engineer
  const supervisorUserId = '00000000-0000-0000-0003-000000000003'; // supervisor
  const pmUserId = '00000000-0000-0000-0003-000000000004'; // project_manager
  const pgmUserId = '00000000-0000-0000-0003-000000000005'; // program_manager

  let adminToken: string;
  let engineerToken: string;
  let supervisorToken: string;
  let pmToken: string;
  let pgmToken: string;

  const testWorkItemId = '00000000-0000-0000-0005-000000000001';
  const testEmployeeId = 'e0000000-0000-0000-0000-000000000006';

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    // Generate tokens
    adminToken = 'token-admin-' + Date.now();
    engineerToken = 'token-eng-' + Date.now();
    supervisorToken = 'token-sup-' + Date.now();
    pmToken = 'token-pm-' + Date.now();
    pgmToken = 'token-pgm-' + Date.now();

    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES
       ($1, $2, CURRENT_TIMESTAMP + interval '24 hours'),
       ($3, $4, CURRENT_TIMESTAMP + interval '24 hours'),
       ($5, $6, CURRENT_TIMESTAMP + interval '24 hours'),
       ($7, $8, CURRENT_TIMESTAMP + interval '24 hours'),
       ($9, $10, CURRENT_TIMESTAMP + interval '24 hours')`,
      [
        adminUserId, adminToken,
        engineerUserId, engineerToken,
        supervisorUserId, supervisorToken,
        pmUserId, pmToken,
        pgmUserId, pgmToken,
      ],
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

  // Test 1: Supervisor creates and submits production -> Success (201)
  it('Test 1: supervisor creates production record successfully (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/production')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        date: '2026-08-16',
        branchId: 'b0000000-0000-0000-0000-000000000001',
        projectId: 'f0000000-0000-0000-0000-000000000001',
        workItemId: testWorkItemId,
        supervisorId: 'e0000000-0000-0000-0000-000000000003',
        targetQuantity: 100,
        actualQuantity: 100,
        productionType: 'individual',
        workers: [
          {
            employeeId: testEmployeeId,
            individualQuantity: 100,
          },
        ],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('draft');
    createdRecordId = res.body.id;

    // Submit draft to submitted
    const submitRes = await request(app.getHttpServer())
      .post(`/api/v1/production/${createdRecordId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ step: 'submit' })
      .expect(201);

    expect(submitRes.body.status).toBe('submitted');
  });

  // Test 2: Supervisor tries to approve -> 403 ROLE_NOT_AUTHORIZED_FOR_APPROVAL
  it('Test 2: supervisor tries to approve -> rejected with 403 ROLE_NOT_AUTHORIZED_FOR_APPROVAL', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/production/${createdRecordId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ step: 'engineer' })
      .expect(403);

    expect(res.body.code).toBe('ROLE_NOT_AUTHORIZED_FOR_APPROVAL');
  });

  // Test 3: Engineer approves submitted production -> Success (200/201, engineer_approved)
  it('Test 3: engineer approves submitted record -> success with engineer_approved status', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/production/${createdRecordId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ step: 'engineer' })
      .expect(201);

    expect(res.body.status).toBe('engineer_approved');

    // And Project Manager can final approve
    const finalRes = await request(app.getHttpServer())
      .post(`/api/v1/production/${createdRecordId}/approve`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ step: 'final' })
      .expect(201);

    expect(finalRes.body.status).toBe('final_approved');
  });

  // Test 4: Project manager modifies target -> Success (200)
  it('Test 4: project manager modifies target -> success (200)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/work-items/${testWorkItemId}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        defaultDailyTarget: 150,
      })
      .expect(200);

    expect(Number(res.body.default_daily_target)).toBe(150);
  });

  // Test 5: Engineer tries to modify target -> 403 FORBIDDEN
  it('Test 5: engineer tries to modify target -> 403 FORBIDDEN', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/work-items/${testWorkItemId}`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        defaultDailyTarget: 200,
      })
      .expect(403);

    expect(res.body.code).toBe('FORBIDDEN');
  });

  // Test 6: Admin updates / sets salary and wage -> Success (200)
  it('Test 6: admin updates daily wage / salary -> success (200)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/employees/${testEmployeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dailyWage: 250,
      })
      .expect(200);

    expect(Number(res.body.dailyWage ?? res.body.daily_wage)).toBe(250);
  });
});
