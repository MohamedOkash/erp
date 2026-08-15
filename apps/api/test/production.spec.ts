import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Production Endpoints & Business Rules (R5 & Corrections)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Test 1: إنشاء سجل فردي بمجموع عمال لا يساوي الفعلي → توقع 400 WORKER_SUM_MISMATCH
  it('test 1: should reject individual production record when worker quantities sum does not match actual quantity with 400 WORKER_SUM_MISMATCH', async () => {
    const invalidRecord = {
      date: '2026-08-15',
      branchId: 'b0000000-0000-0000-0000-000000000001',
      projectId: 'f0000000-0000-0000-0000-000000000001',
      workItemId: '00000000-0000-0000-0005-000000000001',
      workAreaId: 'a0000000-0000-0000-0000-000000000003',
      supervisorId: 'e0000000-0000-0000-0000-000000000003',
      targetQuantity: 100,
      actualQuantity: 100,
      productionType: 'individual',
      workers: [
        {
          employeeId: 'e0000000-0000-0000-0000-000000000006',
          individualQuantity: 40,
        },
        {
          employeeId: 'e0000000-0000-0000-0000-000000000007',
          individualQuantity: 40, // 40 + 40 = 80 !== 100
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/production')
      .set('x-company-id', companyId)
      .send(invalidRecord)
      .expect(400);

    expect(response.body.code).toBe('WORKER_SUM_MISMATCH');
  });

  // Test 2: إنشاء سجل فردي صحيح (مجموع = فعلي) → توقع 201
  it('test 2: should successfully create individual production record when worker quantities sum matches actual quantity with 201', async () => {
    const validRecord = {
      date: '2026-08-15',
      branchId: 'b0000000-0000-0000-0000-000000000001',
      projectId: 'f0000000-0000-0000-0000-000000000001',
      workItemId: '00000000-0000-0000-0005-000000000001',
      workAreaId: 'a0000000-0000-0000-0000-000000000003',
      supervisorId: 'e0000000-0000-0000-0000-000000000003',
      targetQuantity: 100,
      actualQuantity: 100,
      productionType: 'individual',
      workers: [
        {
          employeeId: 'e0000000-0000-0000-0000-000000000006',
          individualQuantity: 50,
        },
        {
          employeeId: 'e0000000-0000-0000-0000-000000000007',
          individualQuantity: 50, // 50 + 50 = 100 === 100
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/production')
      .set('x-company-id', companyId)
      .send(validRecord)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.status).toBe('draft');
    expect(response.body.workers).toHaveLength(2);
  });

  // Test 3: طلب تصحيح على سجل مش final_approved → توقع 400 RECORD_NOT_LOCKED
  it('test 3: should reject correction request on a record that is not final_approved with 400 RECORD_NOT_LOCKED', async () => {
    // Record 'd0000000-0000-0000-0000-000000000013' has status 'submitted' in 0002_seed_demo.sql
    const submittedRecordId = 'd0000000-0000-0000-0000-000000000013';

    const correctionRequest = {
      type: 'quantity_adjust',
      delta: 5,
      reason: 'طلب تعديل كمية بسبب خطأ في القياس الميداني',
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v1/production/${submittedRecordId}/correct`)
      .set('x-company-id', companyId)
      .send(correctionRequest)
      .expect(400);

    expect(response.body.code).toBe('RECORD_NOT_LOCKED');
  });
});
