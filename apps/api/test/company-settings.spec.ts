import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Company Settings & Dynamic Calculation Parameters', () => {
  let app: INestApplication;
  let pglite: PGlite;

  const adminUserId = '00000000-0000-0000-0003-000000000001';
  let adminToken: string;
  const companyId = 'c0000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    adminToken = 'token-admin-settings-' + Date.now();
    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES
       ($1, $2, CURRENT_TIMESTAMP + interval '24 hours')`,
      [adminUserId, adminToken],
    );

    const mockDbService = {
      query: async (text: string, params?: any[]) => {
        const sanitized = (params || []).map((p) => (p === undefined ? null : p));
        const res = await pglite.query(text, sanitized);
        return { rows: res.rows, rowCount: (res as any).affectedRows ?? res.rows.length } as any;
      },
      withTenantTransaction: async (tenantCompanyId: string, op: any) => {
        return pglite.transaction(async (tx) => {
          await tx.query("SELECT set_config('app.company_id', $1, true)", [tenantCompanyId]);
          const clientShim = {
            query: async (t: string, p?: any[]) => {
              const sanitized = (p || []).map((x) => (x === undefined ? null : x));
              const r = await tx.query(t, sanitized);
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
            const sanitized = (p || []).map((x) => (x === undefined ? null : x));
            const r = await pglite.query(t, sanitized);
            return { rows: r.rows, rowCount: (r as any).affectedRows ?? r.rows.length };
          },
        };
        return op(clientShim);
      },
      getClient: async () => pglite,
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDbService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('1. GET /api/v1/company-settings should return default calculation settings', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/company-settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.settings).toBeDefined();
    expect(res.body.settings.hours_per_work_day).toBe(8);
    expect(res.body.settings.overtime_multiplier).toBe(1.5);
    expect(res.body.settings.rounding_decimals).toBe(2);
    expect(res.body.list.length).toBeGreaterThanOrEqual(8);
  });

  it('2. PUT /api/v1/company-settings should update calculation parameters dynamically', async () => {
    const updateRes = await request(app.getHttpServer())
      .put('/api/v1/company-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        settings: {
          hours_per_work_day: 10,
          overtime_multiplier: 2.0,
          rounding_decimals: 3,
          default_skilled_daily_wage: 300,
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.settings.hours_per_work_day).toBe(10);
    expect(updateRes.body.settings.overtime_multiplier).toBe(2.0);
    expect(updateRes.body.settings.rounding_decimals).toBe(3);
    expect(updateRes.body.settings.default_skilled_daily_wage).toBe(300);
  });

  it('3. GET /api/v1/control-cards should use updated calculation settings', async () => {
    const ccRes = await request(app.getHttpServer())
      .get('/api/v1/control-cards')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(ccRes.status).toBe(200);
    expect(Array.isArray(ccRes.body)).toBe(true);
    expect(ccRes.body.length).toBeGreaterThan(0);
  });
});
