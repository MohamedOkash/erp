import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Phase 3: Staff Transfers System & Approvals', () => {
  let app: INestApplication;
  let pglite: PGlite;

  const adminUserId = '00000000-0000-0000-0003-000000000001';
  const engineerUserId = '00000000-0000-0000-0003-000000000002';
  const supervisorUserId = '00000000-0000-0000-0003-000000000003';
  const pmUserId = '00000000-0000-0000-0003-000000000004';

  let adminToken: string;
  let engineerToken: string;
  let supervisorToken: string;
  let pmToken: string;

  const targetSupervisorEmpId = 'e0000000-0000-0000-0000-000000000003'; // المشرف 1
  const project1Id = 'f0000000-0000-0000-0000-000000000001';
  const project2Id = 'f0000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    adminToken = 'token-admin-p3-' + Date.now();
    engineerToken = 'token-eng-p3-' + Date.now();
    supervisorToken = 'token-sup-p3-' + Date.now();
    pmToken = 'token-pm-p3-' + Date.now();

    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES
       ($1, $2, CURRENT_TIMESTAMP + interval '24 hours'),
       ($3, $4, CURRENT_TIMESTAMP + interval '24 hours'),
       ($5, $6, CURRENT_TIMESTAMP + interval '24 hours'),
       ($7, $8, CURRENT_TIMESTAMP + interval '24 hours')`,
      [
        adminUserId, adminToken,
        engineerUserId, engineerToken,
        supervisorUserId, supervisorToken,
        pmUserId, pmToken,
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

  let createdTransferId: string;

  // Test 1: مهندس يطلب نقل مشرف → ينجح (status: pending)
  it('Test 1: engineer requests supervisor transfer -> success (201, pending)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers/request')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        employeeId: targetSupervisorEmpId,
        fromProjectId: project1Id,
        toProjectId: project2Id,
        reason: 'حاجة ماسة للإشراف على صب الأسقف في مشروع 2',
        urgency: 'urgent',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('pending');
    expect(res.body.urgency).toBe('urgent');
    createdTransferId = res.body.id;
  });

  // Test 2: مشرف يحاول يطلب نقل → 403 Forbidden
  it('Test 2: supervisor tries to request transfer -> 403 FORBIDDEN', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers/request')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        employeeId: targetSupervisorEmpId,
        toProjectId: project2Id,
      })
      .expect(403);

    expect(res.body.code).toBe('FORBIDDEN');
  });

  // Test 3: مهندس يحاول يوافق على النقل → 403 Forbidden
  it('Test 3: engineer tries to approve transfer -> 403 FORBIDDEN', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/transfers/${createdTransferId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .expect(403);

    expect(res.body.code).toBe('FORBIDDEN');
  });

  // Test 4: مدير المشروع يوافق على النقل → ينجح (status: approved)
  it('Test 4: project manager approves transfer -> success (201/200, approved)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/transfers/${createdTransferId}/approve`)
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(201);

    expect(res.body.status).toBe('approved');
    expect(res.body.approved_by).toBe(pmUserId);
  });

  // Test 5: تنفيذ النقل → يغير حالة النقل ويحدّث تعيين الموظف
  it('Test 5: execute transfer -> success (status executed & assignment updated)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/transfers/${createdTransferId}/execute`)
      .set('Authorization', `Bearer ${pmToken}`)
      .expect(201);

    expect(res.body.status).toBe('executed');

    // Verify employee assignments in database
    const empRes = await request(app.getHttpServer())
      .get(`/api/v1/employees/${targetSupervisorEmpId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const activeAssignments = empRes.body.activeAssignments || empRes.body.assignments || [];
    const hasNewProject = activeAssignments.some(
      (a: any) => a.projectId === project2Id || a.project_id === project2Id,
    );
    expect(hasNewProject).toBe(true);
  });

  // Test 6: إمكانية طلب نقل ثاني لنفس المشرف في نفس اليوم → ينجح
  it('Test 6: multiple transfers on the same day allowed -> success (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transfers/request')
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({
        employeeId: targetSupervisorEmpId,
        fromProjectId: project2Id,
        toProjectId: project1Id,
        reason: 'إعادة المشرف بعد انتهاء الأعمال العاجلة',
        urgency: 'normal',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('pending');
  });
});
