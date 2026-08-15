import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Strict Production Approval State Machine & RBAC (Part 3)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';

  // Users from seed:
  // Admin user: 00000000-0000-0000-0003-000000000001 (role: company_admin)
  // Engineer user: 00000000-0000-0000-0003-000000000002 (role: engineer)
  // Supervisor user: 00000000-0000-0000-0003-000000000003 (role: supervisor)

  const adminUserId = '00000000-0000-0000-0003-000000000001';
  const engineerUserId = '00000000-0000-0000-0003-000000000002';
  const supervisorUserId = '00000000-0000-0000-0003-000000000003';

  let adminToken: string;
  let engineerToken: string;
  let supervisorToken: string;

  let draftRecordId: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    // Create session tokens for each role
    adminToken = 'test-token-admin-' + Date.now();
    engineerToken = 'test-token-eng-' + Date.now();
    supervisorToken = 'test-token-sup-' + Date.now();

    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES
       ($1, $2, CURRENT_TIMESTAMP + interval '24 hours'),
       ($3, $4, CURRENT_TIMESTAMP + interval '24 hours'),
       ($5, $6, CURRENT_TIMESTAMP + interval '24 hours')`,
      [adminUserId, adminToken, engineerUserId, engineerToken, supervisorUserId, supervisorToken],
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

    // Create a new draft record
    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/production')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: '2026-08-16',
        branchId: 'b0000000-0000-0000-0000-000000000001',
        projectId: 'f0000000-0000-0000-0000-000000000001',
        workItemId: '00000000-0000-0000-0005-000000000001',
        supervisorId: 'e0000000-0000-0000-0000-000000000003',
        targetQuantity: 100,
        actualQuantity: 100,
        productionType: 'individual',
        workers: [
          {
            employeeId: 'e0000000-0000-0000-0000-000000000006',
            individualQuantity: 100,
          },
        ],
      })
      .expect(201);

    draftRecordId = draftRes.body.id;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Test 1: محاولة تخطي مرحلة (draft إلى engineer_approved) → توقع 422 INVALID_TRANSITION
  it('test 1: should reject skipping approval stages (draft -> engineer_approved) with 422 INVALID_TRANSITION', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/production/${draftRecordId}/approve`)
      .set('Authorization', `Bearer ${engineerToken}`)
      .send({ step: 'engineer' })
      .expect(422);

    expect(res.body.code).toBe('INVALID_TRANSITION');
  });

  // Test 2: محاولة approve بدور غير مخول (supervisor يحاول final_approved) → توقع 403 ROLE_NOT_AUTHORIZED_FOR_APPROVAL
  it('test 2: should reject approval with unauthorized role (supervisor -> final approval) with 403 ROLE_NOT_AUTHORIZED_FOR_APPROVAL', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/production/${draftRecordId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ step: 'final' })
      .expect(403);

    expect(res.body.code).toBe('ROLE_NOT_AUTHORIZED_FOR_APPROVAL');
  });

  // Test 3: محاولة تصحيح سجل لسه draft مش final_approved → توقع 422 RECORD_NOT_LOCKED
  it('test 3: should reject correction on draft record with 422 RECORD_NOT_LOCKED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/production/${draftRecordId}/correction`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'quantity_adjust',
        delta: 10,
        reason: 'تصحيح خطأ كمية',
      })
      .expect(422);

    expect(res.body.code).toBe('RECORD_NOT_LOCKED');
  });
});
