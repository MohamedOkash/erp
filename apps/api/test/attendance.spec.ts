import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Attendance CRUD Endpoints (Task 11)', () => {
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
    authToken = 'test-token-attendance-crud-' + Date.now();
    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ('00000000-0000-0000-0003-000000000001', $1, CURRENT_TIMESTAMP + interval '24 hours')`,
      [authToken],
    );

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

  // Test 1: إنشاء سجل حضور صحيح → توقع 201
  it('test 1: should successfully create valid attendance record with 201', async () => {
    // Get status ID for 'present'
    const statusRes = await pglite.query<{ id: string }>(
      `SELECT id FROM attendance_statuses WHERE code = 'present' LIMIT 1`,
    );
    const presentStatusId = statusRes.rows[0].id;

    const newAttendance = {
      employeeId: 'e0000000-0000-0000-0000-000000000001', // مهندس 1
      projectId: 'f0000000-0000-0000-0000-000000000001',
      branchId: 'b0000000-0000-0000-0000-000000000001',
      date: '2026-08-20', // Date not in seed
      statusId: presentStatusId,
      checkInTime: '08:00',
      checkOutTime: '17:00',
      overtimeHours: 1,
      notes: 'حضور منتظم مع ساعة إضافية',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/attendance')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newAttendance)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.employee_id).toBe(newAttendance.employeeId);
    expect(response.body.date).toBe('2026-08-20');
    expect(response.body.overtime_hours).toBe('1.00');
  });


  // Test 2: محاولة إنشاء سجل لنفس الموظف في نفس اليوم → توقع 409 ATTENDANCE_ALREADY_EXISTS
  it('test 2: should reject duplicate attendance record for same employee on same date with 409 ATTENDANCE_ALREADY_EXISTS', async () => {
    const statusRes = await pglite.query<{ id: string }>(
      `SELECT id FROM attendance_statuses WHERE code = 'present' LIMIT 1`,
    );
    const presentStatusId = statusRes.rows[0].id;

    // From 0002_seed_demo.sql: employee 'e0000000-0000-0000-0000-000000000001' has attendance on '2026-08-12'
    const duplicateAttendance = {
      employeeId: 'e0000000-0000-0000-0000-000000000001',
      projectId: 'f0000000-0000-0000-0000-000000000001',
      branchId: 'b0000000-0000-0000-0000-000000000001',
      date: '2026-08-12',
      statusId: presentStatusId,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/attendance')
      .set('Authorization', `Bearer ${authToken}`)
      .send(duplicateAttendance)
      .expect(409);

    expect(response.body.code).toBe('ATTENDANCE_ALREADY_EXISTS');
  });

  // Test 3: جلب قائمة الحضور بفلاتر → توقع pagination صحيح
  it('test 3: should list attendance records with filters and exact pagination structure', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/attendance?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(10);
    expect(response.body.total).toBeGreaterThanOrEqual(75); // 75 from seed + 1 created in test 1
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalPages).toBe(Math.ceil(response.body.total / 10));
  });

  // Test 4: تحديث سجل موجود → توقع 200 + data محدثة
  it('test 4: should successfully update existing attendance record with 200 and updated data', async () => {
    // Pick first attendance record from DB
    const firstRes = await pglite.query<{ id: string }>(
      `SELECT id FROM attendance WHERE company_id = $1 LIMIT 1`,
      [companyId],
    );
    const targetId = firstRes.rows[0].id;

    const updatePayload = {
      notes: 'تم تعديل الملاحظات بواسطة المشرف',
      overtimeHours: 2.5,
    };

    const response = await request(app.getHttpServer())
      .put(`/api/v1/attendance/${targetId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatePayload)
      .expect(200);

    expect(response.body.id).toBe(targetId);
    expect(response.body.notes).toBe(updatePayload.notes);
    expect(parseFloat(response.body.overtime_hours)).toBe(2.5);
  });

  // Test 5: محاولة تحديث سجل غير موجود → توقع 404
  it('test 5: should reject update on non-existent attendance record with 404', async () => {
    const nonExistentId = '00000000-9999-9999-9999-000000000000';

    const response = await request(app.getHttpServer())
      .put(`/api/v1/attendance/${nonExistentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ notes: 'تعديل وهمي' })
      .expect(404);

    expect(response.body.code).toBe('ATTENDANCE_NOT_FOUND');
  });
});
