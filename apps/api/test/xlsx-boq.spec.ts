import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('XLSX Import/Export for BOQ (Task 8)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  let authToken: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const initSql = fs.readFileSync(path.join(migrationDir, '0001_init.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(migrationDir, '0002_seed_demo.sql'), 'utf8');

    await pglite.exec(initSql);
    await pglite.exec(seedSql);

    // Create session token for authentication
    authToken = 'test-token-xlsx-boq-' + Date.now();
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

  // Test 1: رفع ملف Excel فيه 3 صفوف (1 صالح، 1 مشروع غير موجود، 1 كمية سالبة) → توقع staging فقط + summary دقيق + لا إضافة في boq_items
  it('test 1: should upload and stage 3 BOQ rows with exact summary and zero additions to boq_items table', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('BOQ');

    // Row 1: Headers
    worksheet.addRow(['المشروع', 'الفرع', 'المنطقة', 'البند', 'الكمية', 'الفئة']);

    // Row 2: Valid BOQ row
    worksheet.addRow([
      'مشروع 1',
      'فرع 1',
      'منطقة 1',
      'بند 1',
      100,
      150,
    ]);

    // Row 3: Nonexistent project
    worksheet.addRow([
      'مشروع وهمي غير موجود',
      'فرع 1',
      'منطقة 1',
      'بند 1',
      100,
      150,
    ]);

    // Row 4: Negative quantity
    worksheet.addRow([
      'مشروع 1',
      'فرع 1',
      'منطقة 1',
      'بند 1',
      -50,
      150,
    ]);

    const buffer = await workbook.xlsx.writeBuffer();

    const response = await request(app.getHttpServer())
      .post('/api/v1/imports/boq/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(buffer), 'boq.xlsx')
      .expect(201);

    expect(response.body.jobId).toBeDefined();
    expect(response.body.summary).toEqual({
      total: 3,
      valid: 1,
      duplicate: 0,
      invalid: 2,
    });
    expect(response.body.rows).toHaveLength(3);

    // Verify staging only: boq_items count in DB must still be exactly 6 (from seed)
    const countRes = await pglite.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM boq_items WHERE company_id = $1`,
      [companyId],
    );
    expect((countRes.rows[0] as any).count).toBe(6);
  });

  // Test 2: تصدير الـ BOQ → توقع ملف xlsx صالح + الأعمدة المطلوبة الـ 10 + عدد صفوف = 6 (من seed) + Completion% محسوب من v_boq_progress
  it('test 2: should export valid XLSX file with required 10 columns, 6 BOQ rows from seed and Completion% from v_boq_progress', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/exports/boq.xlsx')
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

    // Verify Headers (Row 1): 10 required columns
    const headerRow = exportedSheet.getRow(1);
    const headers = [
      headerRow.getCell(1).text,
      headerRow.getCell(2).text,
      headerRow.getCell(3).text,
      headerRow.getCell(4).text,
      headerRow.getCell(5).text,
      headerRow.getCell(6).text,
      headerRow.getCell(7).text,
      headerRow.getCell(8).text,
      headerRow.getCell(9).text,
      headerRow.getCell(10).text,
    ];
    expect(headers).toEqual([
      'Project',
      'Branch',
      'Area',
      'Item',
      'Unit',
      'Original Qty',
      'Done Qty',
      'Remaining',
      'Completion%',
      'Rate',
    ]);

    // Verify Data Row Count: exactly 6 BOQ item rows from seed
    const dataRowsCount = exportedSheet.rowCount - 1;
    expect(dataRowsCount).toBe(6);

    // Verify Completion% is formatted with % and calculated
    const firstDataRow = exportedSheet.getRow(2);
    expect(firstDataRow.getCell(9).text).toMatch(/%$/);
  });
});
