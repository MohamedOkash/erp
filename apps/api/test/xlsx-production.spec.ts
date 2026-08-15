import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('XLSX Import/Export for Production (Task 7)', () => {
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
    authToken = 'test-token-xlsx-prod-' + Date.now();
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

  // Test 1: رفع ملف Excel فيه 3 صفوف (1 صالح، 1 فرع غير موجود، 1 تاريخ غير صالح) → توقع staging فقط + summary دقيق + لا إضافة في جدول production_records
  it('test 1: should upload and stage 3 production rows with exact summary and zero additions to production_records table', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Production');

    // Row 1: Headers
    worksheet.addRow([
      'التاريخ',
      'الفرع',
      'المشروع',
      'المنطقة',
      'البند',
      'الهدف',
      'الفعلي',
      'النوع',
      'فريق العمل',
    ]);

    // Row 2: Valid row
    worksheet.addRow([
      '2026-08-15',
      'فرع 1',
      'مشروع 1',
      'منطقة 1',
      'بند 1',
      100,
      100,
      'individual',
      '',
    ]);

    // Row 3: Nonexistent branch
    worksheet.addRow([
      '2026-08-15',
      'فرع وهمي غير موجود',
      'مشروع 1',
      'منطقة 1',
      'بند 1',
      100,
      100,
      'individual',
      '',
    ]);

    // Row 4: Invalid date
    worksheet.addRow([
      'invalid-date-xyz',
      'فرع 1',
      'مشروع 1',
      'منطقة 1',
      'بند 1',
      100,
      100,
      'individual',
      '',
    ]);

    const buffer = await workbook.xlsx.writeBuffer();

    const response = await request(app.getHttpServer())
      .post('/api/v1/imports/production/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(buffer), 'production.xlsx')
      .expect(201);

    expect(response.body.jobId).toBeDefined();
    expect(response.body.summary).toEqual({
      total: 3,
      valid: 1,
      duplicate: 0,
      invalid: 2,
    });
    expect(response.body.rows).toHaveLength(3);

    // Verify staging only: production_records table count in DB must still be exactly 14 (from seed)
    const countRes = await pglite.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM production_records WHERE company_id = $1`,
      [companyId],
    );
    expect((countRes.rows[0] as any).count).toBe(14);
  });

  // Test 2: تصدير الإنتاج → توقع ملف xlsx صالح + الأعمدة المطلوبة + عدد صفوف = 14 (من seed)
  it('test 2: should export valid XLSX file with required 12 columns and exactly 14 production rows from seed', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/exports/production.xlsx')
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

    // Verify Headers (Row 1): 12 required columns
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
      headerRow.getCell(11).text,
      headerRow.getCell(12).text,
    ];
    expect(headers).toEqual([
      'Date',
      'Branch',
      'Project',
      'Area',
      'Item',
      'Type',
      'Target',
      'Actual',
      'Prod%',
      'Status',
      'Supervisor',
      'Team Code',
    ]);

    // Verify Data Row Count: exactly 14 production records from seed
    const dataRowsCount = exportedSheet.rowCount - 1;
    expect(dataRowsCount).toBe(14);
  });
});
