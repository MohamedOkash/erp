import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Multi-Country Support & Saudi Arabia Data Model (Part 4)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const adminUserId = '00000000-0000-0000-0003-000000000001';
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

    authToken = 'test-token-multi-country-' + Date.now();
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

  // Test 1: إنشاء موظف مع identityType = 'iqama' و nationality = 'Egyptian' و identityExpiryDate → توقع 201
  it('test 1: should create employee with iqama, nationality and expiry date with 201', async () => {
    const payload = {
      name: 'محمود عبد الفتاح',
      identityNumber: '2456789012',
      identityType: 'iqama',
      nationality: 'Egyptian',
      identityExpiryDate: '2027-08-16',
      roleType: 'worker',
      dailyWage: 250,
      code: 'EMP-IQM-01',
      phone: '0509876543',
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.identityNumber).toBe('2456789012');
    expect(res.body.identityType).toBe('iqama');
    expect(res.body.nationality).toBe('Egyptian');
    expect(res.body.identityExpiryDate).toContain('2027-08-16');
  });

  // Test 2: البحث عن الموظف بـ identityNumber → توقع 200
  it('test 2: should find employee by identity number with 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/employees/by-identity/2456789012')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.identityNumber).toBe('2456789012');
    expect(res.body.name).toBe('محمود عبد الفتاح');
    expect(res.body.identityType).toBe('iqama');
    expect(res.body.nationality).toBe('Egyptian');
  });

  // Test 3: محاولة إنشاء نوع هوية غير مدعوم → توقع 400
  it('test 3: should reject unsupported identityType with 400 Bad Request', async () => {
    const payload = {
      name: 'سائق تجربة',
      identityNumber: '9988776655',
      identityType: 'driver_license', // Unsupported
      roleType: 'worker',
      dailyWage: 200,
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });
});
