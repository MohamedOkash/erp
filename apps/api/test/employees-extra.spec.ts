import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Employees Extra & Auth Logout (Part 2)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const adminUserId = '00000000-0000-0000-0003-000000000001';
  let authToken: string;
  let employee1Id: string;
  let employee2Id: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    authToken = 'test-token-emp-extra-' + Date.now();
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

    // Create 2 employees for testing
    const createRes1 = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'عامل تجربة 1',
        nationalId: '29801011234501',
        roleType: 'worker',
        dailyWage: 200,
      });
    employee1Id = createRes1.body.id;

    const createRes2 = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'عامل تجربة 2',
        nationalId: '29801011234502',
        roleType: 'worker',
        dailyWage: 220,
      });
    employee2Id = createRes2.body.id;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Test 1: تعديل موظف → توقع 200 + updated data
  it('test 1: should update employee with 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/employees/${employee1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'عامل تجربة 1 بعد التعديل',
        dailyWage: 260,
      })
      .expect(200);

    expect(res.body.id).toBe(employee1Id);
    expect(res.body.name).toBe('عامل تجربة 1 بعد التعديل');
    expect(res.body.dailyWage).toBe(260);
  });

  // Test 2: محاولة تعديل موظف برقم قومي مكرر → توقع 409
  it('test 2: should reject updating employee to existing nationalId with 409', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/employees/${employee2Id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nationalId: '29801011234501', // Already taken by employee1
      })
      .expect(409);

    expect(res.body.code).toBe('IDENTITY_DUPLICATE');
  });

  // Test 3: soft delete موظف → توقع 200 + isActive = false
  it('test 3: should soft delete employee (isActive = false) with 200', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/employees/${employee1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(employee1Id);
    expect(res.body.isActive).toBe(false);

    // Verify in database
    const dbCheck = await pglite.query(`SELECT is_active FROM employees WHERE id = $1`, [employee1Id]);
    expect((dbCheck.rows[0] as any).is_active).toBe(false);
  });

  // Test 4: logout → توقع 200 + session محذوف من قاعدة البيانات
  it('test 4: should logout and invalidate session from database', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify session token is removed
    const sessionCheck = await pglite.query(`SELECT id FROM sessions WHERE token = $1`, [authToken]);
    expect(sessionCheck.rows.length).toBe(0);
  });
});
