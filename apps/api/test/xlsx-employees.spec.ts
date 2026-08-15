import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('XLSX Import/Export for Employees (Task 6)', () => {
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
    authToken = 'test-token-employees-' + Date.now();
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

  // Test 1: رفع ملف Excel فيه 3 صفوف (1 صالح، 1 مكرر في seed، 1 ناقص رقم قومي) → توقع staging فقط + summary دقيق + لا إضافة في جدول employees
  it('test 1: should upload and stage 3 rows with exact summary and zero additions to employees table', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');

    // Row 1: Headers
    worksheet.addRow(['الاسم', 'الرقم القومي', 'الهاتف', 'الفرع', 'الأجر']);

    // Row 2: Valid employee
    worksheet.addRow(['عامل جديد صالح', '29909090100999', '01011112222', 'فرع 1', 250]);

    // Row 3: Duplicate national ID (from 0002_seed_demo.sql: '28501010100111' belongs to 'مهندس 1')
    worksheet.addRow(['مهندس مكرر', '28501010100111', '01033334444', 'فرع 1', 450]);

    // Row 4: Missing national ID
    worksheet.addRow(['عامل ناقص بيانات', '', '01055556666', 'فرع 1', 200]);

    const buffer = await workbook.xlsx.writeBuffer();

    const response = await request(app.getHttpServer())
      .post('/api/v1/imports/employees/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(buffer), 'employees.xlsx')
      .expect(201);

    expect(response.body.jobId).toBeDefined();
    expect(response.body.summary).toEqual({
      total: 3,
      valid: 1,
      duplicate: 1,
      invalid: 1,
    });
    expect(response.body.rows).toHaveLength(3);

    // Verify staging only: employees table count in DB must still be exactly 25 (from seed)
    const countRes = await pglite.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM employees WHERE company_id = $1`,
      [companyId],
    );
    expect((countRes.rows[0] as any).count).toBe(25);
  });

  // Test 2: تصدير الموظفين → توقع ملف xlsx صالح + الأعمدة المطلوبة + عدد صفوف = 25 (من seed)
  it('test 2: should export valid XLSX file with required columns and exactly 25 employee rows from seed', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/exports/employees.xlsx')
      .set('Authorization', `Bearer ${authToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200)
      .expect(
        'Content-Type',
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
      );

    // Parse the binary buffer response with exceljs
    const exportedWorkbook = new ExcelJS.Workbook();
    await exportedWorkbook.xlsx.load(response.body as any);

    const exportedSheet = exportedWorkbook.worksheets[0];
    expect(exportedSheet).toBeDefined();

    // Verify Headers (Row 1): Name, Identity, Phone, Branch, Wage
    const headerRow = exportedSheet.getRow(1);
    const headers = [
      headerRow.getCell(1).text,
      headerRow.getCell(2).text,
      headerRow.getCell(3).text,
      headerRow.getCell(4).text,
      headerRow.getCell(5).text,
    ];
    expect(headers).toEqual(['Name', 'Identity', 'Phone', 'Branch', 'Wage']);

    // Verify Data Row Count: exactly 25 employee rows from seed
    const dataRowsCount = exportedSheet.rowCount - 1;
    expect(dataRowsCount).toBe(25);
  });

  // Test 3: محاولة تصدير بـ x-company-id header بس (من غير token) → توقع 401 (الثغرة اتقفلت)
  it('test 3: should reject export request with 401 when only x-company-id header is sent without auth token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/exports/employees.xlsx')
      .set('x-company-id', companyId)
      .expect(401);

    expect(response.body.code).toBe('MISSING_TOKEN');
  });
});
