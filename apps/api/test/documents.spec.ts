import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Documents Module (Task 16)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const projectId = 'f0000000-0000-0000-0000-000000000001';
  const adminUserId = '00000000-0000-0000-0003-000000000001';
  let authToken: string;
  let createdDocId: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    // Create session token for admin user
    authToken = 'test-token-docs-' + Date.now();
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

  // Test 1: رفع مستند جديد → توقع 201 + version 1
  it('test 1: should upload new document with version 1', async () => {
    const fileContent = Buffer.from('محتوى مخطط الموقع الهندسي بصيغة نصية');

    const response = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .field('title', 'مخطط الموقع العام')
      .field('category', 'رسومات هندسية')
      .field('projectId', projectId)
      .field('documentNumber', 'DOC-2026-001')
      .attach('file', fileContent, 'site_plan.pdf')
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.title).toBe('مخطط الموقع العام');
    expect(response.body.version).toBe(1);
    expect(response.body.fileName).toBe('site_plan.pdf');

    createdDocId = response.body.id;
  });

  // Test 2: رفع نسخة جديدة → توقع version 2
  it('test 2: should upload new version of existing document with version 2', async () => {
    const fileContentV2 = Buffer.from('محتوى المخطط الهندسي بعد التعديل والاعتماد v2');

    const response = await request(app.getHttpServer())
      .post(`/api/v1/documents/${createdDocId}/upload-new-version`)
      .set('Authorization', `Bearer ${authToken}`)
      .field('notes', 'تعديل المعماري الثاني')
      .attach('file', fileContentV2, 'site_plan_v2.pdf')
      .expect(201);

    expect(response.body.documentId).toBe(createdDocId);
    expect(response.body.version).toBe(2);
    expect(response.body.fileName).toBe('site_plan_v2.pdf');
  });

  // Test 3: جلب قائمة النسخ → توقع versions array
  it('test 3: should list all versions of the document', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}/versions`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.versions).toBeDefined();
    expect(Array.isArray(response.body.versions)).toBe(true);
    expect(response.body.versions.length).toBe(2);
    expect(response.body.versions[0].version).toBe(2);
    expect(response.body.versions[1].version).toBe(1);
  });

  // Test 4: تحميل الملف → توقع binary content
  it('test 4: should download file binary content with appropriate headers', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}/download`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.headers['content-disposition']).toBeDefined();
    expect(response.body).toBeDefined();
  });

  // Test 5: حذف المستند → توقع 204
  it('test 5: should delete document and cascade delete versions and files with 204', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);

    // Verify deleted
    const checkRes = await pglite.query(`SELECT id FROM documents WHERE id = $1`, [createdDocId]);
    expect(checkRes.rows.length).toBe(0);
  });
});
