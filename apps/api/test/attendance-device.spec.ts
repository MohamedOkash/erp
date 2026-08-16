import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Biometric Device Attendance Import & Policies (Task 1)', () => {
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

    // Assign device_code to a known employee
    await pglite.query(
      `UPDATE employees SET device_code = 'DEV-101' WHERE id = 'e0000000-0000-0000-0000-000000000001'`,
    );
    await pglite.query(
      `UPDATE employees SET device_code = 'DEV-102' WHERE id = 'e0000000-0000-0000-0000-000000000002'`,
    );

    // Create session token for authentication
    authToken = 'test-token-bio-att-' + Date.now();
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

  // Test 1: Format A: on-time -> present, late -> late, unknown device code -> invalid (EMPLOYEE_NOT_FOUND)
  it('test 1: Format A: regular -> present, late -> late, unknown device code -> invalid', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    worksheet.addRow(['كود البصمة', 'التاريخ', 'وقت الدخول', 'وقت الخروج']);
    // Row 2: DEV-101 on-time 08:10 (<= 08:00 + 15m)
    worksheet.addRow(['DEV-101', '2026-09-01', '08:10', '17:00']);
    // Row 3: DEV-102 late 08:35 (> 08:15)
    worksheet.addRow(['DEV-102', '2026-09-01', '08:35', '17:00']);
    // Row 4: UNKNOWN-999 unknown device code
    worksheet.addRow(['UNKNOWN-999', '2026-09-01', '08:00', '17:00']);

    const buffer = await workbook.xlsx.writeBuffer();

    const res = await request(app.getHttpServer())
      .post('/api/v1/imports/attendance-device/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(buffer), 'attendance_format_a.xlsx')
      .expect(201);

    expect(res.body.jobId).toBeDefined();
    expect(res.body.summary).toEqual({
      total: 3,
      valid: 2,
      duplicate: 0,
      invalid: 1,
    });

    const rows = res.body.rows;
    expect(rows[0].statusCode).toBe('present');
    expect(rows[0].rowStatus).toBe('valid');

    expect(rows[1].statusCode).toBe('late');
    expect(rows[1].rowStatus).toBe('valid');

    expect(rows[2].rowStatus).toBe('invalid');
    expect(rows[2].errors[0]).toContain('EMPLOYEE_NOT_FOUND');
  });

  // Test 2: Format B: 4 punches for same employee/day -> aggregated (earliest in, latest out) + overtime calculated
  it('test 2: Format B: 4 punches for same employee/day -> grouped + overtime calculated from policy', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Punches');

    worksheet.addRow(['كود الموظف', 'تاريخ', 'الوقت']);
    worksheet.addRow(['DEV-101', '2026-09-02', '08:00']);
    worksheet.addRow(['DEV-101', '2026-09-02', '12:00']);
    worksheet.addRow(['DEV-101', '2026-09-02', '13:00']);
    worksheet.addRow(['DEV-101', '2026-09-02', '18:00']);

    const buffer = await workbook.xlsx.writeBuffer();

    const res = await request(app.getHttpServer())
      .post('/api/v1/imports/attendance-device/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(buffer), 'attendance_format_b.xlsx')
      .expect(201);

    expect(res.body.summary.total).toBe(1);
    expect(res.body.summary.valid).toBe(1);

    const row = res.body.rows[0];
    expect(row.checkIn).toBe('08:00');
    expect(row.checkOut).toBe('18:00');
    // Policy default: 08:00 to 18:00 = 10h, break 60m = 9h worked; 9h - 8h threshold = 1.0h overtime
    expect(row.overtime).toBe(1);
    expect(row.statusCode).toBe('present');
  });

  // Test 3: Changing attendance policy (shift_start 09:00) -> 08:30 punch is now present
  it('test 3: dynamic policy check: shift_start 09:00 makes 08:30 punch present (no hardcoded constants)', async () => {
    // 1. Create a new general policy with shift_start_time = '09:00' effective from 2026-01-01
    await request(app.getHttpServer())
      .post('/api/v1/attendance-policies')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        shiftStartTime: '09:00',
        shiftEndTime: '18:00',
        graceMinutes: 15,
        breakMinutes: 60,
        overtimeThresholdHours: 8,
        overtimeMultiplier: 1.5,
        effectiveFrom: '2026-01-01',
        isActive: true,
      })
      .expect(201);

    // 2. Upload file where punch is 08:30 on 2026-09-03
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['كود البصمة', 'التاريخ', 'وقت الدخول', 'وقت الخروج']);
    worksheet.addRow(['DEV-101', '2026-09-03', '08:30', '18:00']);

    const buffer = await workbook.xlsx.writeBuffer();

    const res = await request(app.getHttpServer())
      .post('/api/v1/imports/attendance-device/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(buffer), 'policy_test.xlsx')
      .expect(201);

    expect(res.body.rows[0].statusCode).toBe('present');
    expect(res.body.policyUsed.shiftStartTime).toBe('09:00');
  });

  // Test 4: Editing staging row (change status/time) then commit -> final attendance record has edited version
  it('test 4: editing staging row before commit persists modified data into attendance table', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['كود البصمة', 'التاريخ', 'وقت الدخول', 'وقت الخروج']);
    worksheet.addRow(['DEV-101', '2026-09-04', '09:30', '18:00']); // Late (> 09:15)

    const buffer = await workbook.xlsx.writeBuffer();

    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/imports/attendance-device/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(buffer), 'edit_test.xlsx')
      .expect(201);

    const jobId = uploadRes.body.jobId;

    // Get the staged row ID from database
    const stagedRowsRes = await pglite.query(
      `SELECT id FROM import_staging_rows WHERE import_job_id = $1 LIMIT 1`,
      [jobId],
    );
    const stagedRow: any = stagedRowsRes.rows[0];

    // Modify the staging row: change status to present with official excuse
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/imports/staging/${stagedRow.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        parsedData: {
          status: 'present',
          notes: 'إذن رسمي معتمد من الإدارة',
        },
      })
      .expect(200);

    expect(patchRes.body.parsed_data.status).toBe('present');
    expect(patchRes.body.parsed_data.notes).toBe('إذن رسمي معتمد من الإدارة');

    // Commit import
    const commitRes = await request(app.getHttpServer())
      .post(`/api/v1/imports/${jobId}/commit`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(commitRes.body.imported).toBe(1);

    // Verify final attendance record in database
    const attRecRes = await pglite.query(
      `SELECT a.*, ast.code AS status_code
       FROM attendance a
       JOIN attendance_statuses ast ON a.status_id = ast.id
       WHERE a.company_id = $1 AND a.employee_id = 'e0000000-0000-0000-0000-000000000001' AND a.date = '2026-09-04'`,
      [companyId],
    );
    const attRec: any = attRecRes.rows[0];

    expect(attRec).toBeDefined();
    expect(attRec.status_code).toBe('present');
    expect(attRec.source).toBe('device');
    expect(attRec.notes).toBe('إذن رسمي معتمد من الإدارة');
  });

  // Test 5: Manual attendance POST /attendance returns source='manual'
  it('test 5: manual attendance creation via POST /attendance returns source="manual"', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employeeId: 'e0000000-0000-0000-0000-000000000002',
        projectId: 'f0000000-0000-0000-0000-000000000001',
        branchId: 'b0000000-0000-0000-0000-000000000001',
        date: '2026-09-05',
        statusId: '00000000-0000-0000-0002-000000000001', // present
        checkInTime: '08:00',
        checkOutTime: '16:00',
        overtimeHours: 0,
        notes: 'تسجيل يدوي من المشرف',
      })
      .expect(201);

    expect(res.body.source).toBe('manual');
    expect(res.body.notes).toBe('تسجيل يدوي من المشرف');

    // Verify in GET /attendance
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/attendance?fromDate=2026-09-05&toDate=2026-09-05')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const record = listRes.body.data.find(
      (r: any) => r.employee_id === 'e0000000-0000-0000-0000-000000000002',
    );
    expect(record).toBeDefined();
    expect(record.source).toBe('manual');
  });
});
