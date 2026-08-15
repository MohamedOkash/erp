import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Auth Login & Profile (Task 10)', () => {
  let app: INestApplication;
  let pglite: PGlite;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;


    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    // Ensure seed admin user has 123456 password hash
    const adminHash = await bcrypt.hash('123456', 10);
    await pglite.query("UPDATE users SET password_hash = $1 WHERE username = 'admin'", [adminHash]);


    const mockDbService = {
      query: async (text: string, params?: any[]) => {
        const res = await pglite.query(text, params || []);
        return { rows: res.rows, rowCount: res.rows.length } as any;
      },
      withTenantTransaction: async (tenantCompanyId: string, op: any) => {
        return pglite.transaction(async (tx) => {
          await tx.query("SELECT set_config('app.company_id', $1, true)", [tenantCompanyId]);
          const clientShim = {
            query: async (t: string, p?: any[]) => {
              const r = await tx.query(t, p || []);
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
            const r = await pglite.query(t, p || []);
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

  // Test 1: login بـ credentials صحيحة (admin / 123456 من الـ seed) → توقع 200 + token + user info
  it('test 1: should login successfully with valid credentials and return token, expiresAt, and user info', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: '123456',
      })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.expiresAt).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('admin');
    expect(res.body.companyId).toBeDefined();


    // Verify session was created in DB
    const sessionRes = await pglite.query(
      `SELECT * FROM sessions WHERE token = $1`,
      [res.body.token],
    );
    expect(sessionRes.rows.length).toBe(1);

    // Also verify GET /auth/me with Bearer token
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${res.body.token}`)
      .expect(200);

    expect(meRes.body.user.username).toBe('admin');
    expect(meRes.body.companyId).toBe(res.body.companyId);
  });

  // Test 2: login بـ username غير موجود → توقع 401 USER_NOT_FOUND
  it('test 2: should reject login with 401 USER_NOT_FOUND when username does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'nonexistent_user_xyz',
        password: '123456',
      })
      .expect(401);

    expect(response.body.code).toBe('USER_NOT_FOUND');
  });

  // Test 3: login بـ password غلط → توقع 401 INVALID_CREDENTIALS
  it('test 3: should reject login with 401 INVALID_CREDENTIALS when password is incorrect', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'definitely_wrong_password_999',
      })
      .expect(401);

    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });
});
