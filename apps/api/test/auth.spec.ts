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

  // Test 4: طلب بـ token صحيح → توقع 200 + data
  it('test 4: should allow access to protected route with valid bearer token', async () => {
    // Generate valid session
    const validToken = 'valid-test-token-' + Date.now();
    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ('00000000-0000-0000-0003-000000000001', $1, CURRENT_TIMESTAMP + interval '24 hours')`,
      [validToken],
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.username).toBe('admin');
    expect(response.body.companyId).toBe('c0000000-0000-0000-0000-000000000001');
  });

  // Test 5: طلب بدون token → توقع 401 MISSING_TOKEN
  it('test 5: should reject request with 401 MISSING_TOKEN when no token is provided', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);

    expect(response.body.code).toBe('MISSING_TOKEN');
  });

  // Test 6: طلب بـ token منتهي (expires_at في الماضي) → توقع 401 INVALID_OR_EXPIRED_TOKEN
  it('test 6: should reject request with 401 INVALID_OR_EXPIRED_TOKEN when token is expired', async () => {
    const expiredToken = 'expired-test-token-' + Date.now();
    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ('00000000-0000-0000-0003-000000000001', $1, CURRENT_TIMESTAMP - interval '1 hour')`,
      [expiredToken],
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });
});

