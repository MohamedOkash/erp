import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { AuthService } from '../src/auth/auth.service';

describe('NestJS Backend Architecture & Employees Module E2E', () => {
  let app: INestApplication;
  let dbService: DatabaseService;
  let authService: AuthService;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    // Initialize in-memory PostgreSQL engine and apply migrations
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    // Mock DatabaseService to route queries to PGlite with full PostgreSQL compatibility
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dbService = moduleFixture.get<DatabaseService>(DatabaseService);
    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (pglite) {
      await pglite.close();
    }
  });

  describe('1. Password Hashing with Bcrypt & Session Management', () => {
    it('should hash plain password and successfully verify with bcrypt', async () => {
      const plain = '123456';
      const hash = await authService.hashPassword(plain);

      expect(hash).not.toEqual(plain);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await authService.comparePassword(plain, hash);
      expect(isValid).toBe(true);

      const isInvalid = await authService.comparePassword('wrong_pwd', hash);
      expect(isInvalid).toBe(false);
    });

    it('should create authenticated session in sessions table and validate it', async () => {
      const userId = '00000000-0000-0000-0003-000000000001';
      const session = await authService.createSession(userId, companyId, '127.0.0.1', 'jest-agent');

      expect(session.token).toBeDefined();
      expect(session.expiresAt).toBeDefined();

      const user = await authService.validateSession(session.token);
      expect(user.userId).toBe(userId);
      expect(user.companyId).toBe(companyId);
      expect(user.username).toBe('admin');
      expect(user.roles.length).toBeGreaterThan(0);
      expect(user.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('2. Tenant Isolation via set_config inside Transaction', () => {
    it('should set app.company_id within transaction and retrieve it', async () => {
      await dbService.withTenantTransaction(companyId, async (client) => {
        const configRes = await client.query("SELECT current_setting('app.company_id', true) AS current_company");
        expect(configRes.rows[0].current_company).toBe(companyId);
      });
    });
  });

  describe('3. GET /api/v1/employees/by-identity/:identityNumber', () => {
    it('should return engineer Ahmed Elsayed by national ID 28501010100111 with project assignment', async () => {
      const nationalId = '28501010100111';

      const res = await request(app.getHttpServer())
        .get(`/api/v1/employees/by-identity/${nationalId}`)
        .set('x-company-id', companyId)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.nationalId).toBe(nationalId);
      expect(res.body.name).toBe('م. أحمد السيد');
      expect(res.body.code).toBe('ENG-01');
      expect(res.body.roleType).toBe('engineer');
      expect(res.body.dailyWage).toBe(450);
      expect(Array.isArray(res.body.assignments)).toBe(true);
      expect(res.body.assignments.length).toBe(1);
      expect(res.body.assignments[0].projectCode).toBe('PRJ-MEV');
    });

    it('should return worker Mahmoud Ali by national ID 29501010100601', async () => {
      const nationalId = '29501010100601';

      const res = await request(app.getHttpServer())
        .get(`/api/v1/employees/by-identity/${nationalId}`)
        .set('x-company-id', companyId)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.nationalId).toBe(nationalId);
      expect(res.body.name).toContain('محمود علي');
      expect(res.body.code).toBe('WRK-01');
      expect(res.body.roleType).toBe('worker');
      expect(res.body.dailyWage).toBe(220);
    });

    it('should return supervisor Hassan Ibrahim by national ID 29003030100333', async () => {
      const nationalId = '29003030100333';

      const res = await request(app.getHttpServer())
        .get(`/api/v1/employees/by-identity/${nationalId}`)
        .set('x-company-id', companyId)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.nationalId).toBe(nationalId);
      expect(res.body.name).toContain('حسن إبراهيم');
      expect(res.body.code).toBe('SUP-01');
      expect(res.body.roleType).toBe('supervisor');
      expect(res.body.dailyWage).toBe(300);
      expect(res.body.assignments.length).toBe(1);
    });

    it('should return 404 for non-existent national ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/employees/by-identity/99999999999999')
        .set('x-company-id', companyId)
        .expect(404);

      expect(res.body.message).toContain('not found');
    });

    it('should reject unauthenticated request without session or tenant headers', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employees/by-identity/28501010100111')
        .expect(401);
    });

    it('should authenticate request using active session token', async () => {
      const session = await authService.createSession(
        '00000000-0000-0000-0003-000000000001',
        companyId,
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/employees/by-identity/28501010100111')
        .set('Authorization', `Bearer ${session.token}`)
        .expect(200);

      expect(res.body.nationalId).toBe('28501010100111');
    });
  });
});
