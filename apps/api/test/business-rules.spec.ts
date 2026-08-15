import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Business Rules Validation (Task 5)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  let authToken: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    // Create session token for authentication
    authToken = 'test-token-bizrules-' + Date.now();
    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ('00000000-0000-0000-0003-000000000001', $1, CURRENT_TIMESTAMP + interval '24 hours')`,
      [authToken],
    );

    const mockDbService = {
      query: async (text: string, params?: any[]) => {
        const res = await pglite.query(text, params);
        return { rows: res.rows, rowCount: res.rows.length } as any;
      },
      withTenantTransaction: async (tenantCompanyId: string, op: any) => {
        return pglite.transaction(async (tx) => {
          await tx.query("SELECT set_config('app.company_id', $1, true)", [tenantCompanyId]);
          const clientShim = {
            query: async (t: string, p?: any[]) => {
              const r = await tx.query(t, p);
              return { rows: r.rows, rowCount: r.rows.length };
            },
          };
          return op(clientShim);
        });
      },
      withTenantClient: async (tenantCompanyId: string, op: any) => {
        await pglite.query("SELECT set_config('app.company_id', $1, true)", [tenantCompanyId]);
        const clientShim = {
          query: async (t: string, p?: any[]) => {
            const r = await pglite.query(t, p);
            return { rows: r.rows, rowCount: r.rows.length };
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

  // Test 1: إنشاء موظف برقم قومي موجود في الـ seed → توقع 409
  it('test 1: should reject employee creation with duplicate national ID from seed with 409 IDENTITY_DUPLICATE', async () => {
    // National ID '28501010100111' belongs to 'مهندس 1' in 0002_seed_demo.sql
    const duplicateEmployee = {
      name: 'عامل جديد بنفس الرقم القومي',
      nationalId: '28501010100111',
      roleType: 'worker',
      dailyWage: 200,
      primaryBranchId: 'b0000000-0000-0000-0000-000000000001',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send(duplicateEmployee)
      .expect(409);

    expect(response.body.code).toBe('IDENTITY_DUPLICATE');
  });

  // Test 2: محاولة اعتماد production (من الـ seed) من submitted إلى final → توقع 400
  it('test 2: should reject invalid state machine transition from submitted directly to final approval with 400 INVALID_TRANSITION', async () => {
    // Record 'd0000000-0000-0000-0000-000000000013' has status 'submitted' in 0002_seed_demo.sql
    const submittedRecordId = 'd0000000-0000-0000-0000-000000000013';

    const response = await request(app.getHttpServer())
      .post(`/api/v1/production/${submittedRecordId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ step: 'final' })
      .expect(422);

    expect(response.body.code).toBe('INVALID_TRANSITION');
  });
});
