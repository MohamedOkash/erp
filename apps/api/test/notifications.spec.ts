import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Notifications Module (Task 12)', () => {
  let app: INestApplication;
  let pglite: PGlite;
  const companyId = 'c0000000-0000-0000-0000-000000000001';
  const adminUserId = '00000000-0000-0000-0003-000000000001';
  const engineerUserId = '00000000-0000-0000-0003-000000000002';
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

    // Create session token for admin user
    authToken = 'test-token-notifications-' + Date.now();
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

  // Test 1: إنشاء إشعار لعدة مستخدمين → توقع createdCount صحيح
  it('test 1: should create notification for multiple specified users with exact createdCount', async () => {
    const payload = {
      type: 'approval',
      title: 'طلب اعتماد إنتاج جديد',
      message: 'تم إرسال سجل إنتاج جديد بانتظار الاعتماد',
      metadata: { recordId: 'd0000000-0000-0000-0000-000000000001' },
      userIds: [adminUserId, engineerUserId],
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.createdCount).toBe(2);

    // Verify records created in DB
    const countRes = await pglite.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE company_id = $1`,
      [companyId],
    );
    expect(countRes.rows[0].count).toBe(2);
  });

  // Test 2: جلب قائمة الإشعارات للمستخدم الحالي → توقع pagination + unreadCount
  it('test 2: should list notifications for current user with pagination and unreadCount', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/notifications?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBe(1); // 1 for admin, 1 was for engineer
    expect(response.body.unreadCount).toBe(1);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(10);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.data[0].user_id).toBe(adminUserId);

    // Also verify GET /notifications/unread-count
    const unreadCountRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(unreadCountRes.body.count).toBe(1);
  });

  // Test 3: تعليم إشعار كمقروء → توقع 200 + updated data
  it('test 3: should mark a single notification as read and return updated data', async () => {
    // Get admin notification id
    const adminNotifRes = await pglite.query<{ id: string }>(
      `SELECT id FROM notifications WHERE user_id = $1 LIMIT 1`,
      [adminUserId],
    );
    const notifId = adminNotifRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.id).toBe(notifId);
    expect(response.body.read_at).not.toBeNull();
    expect(response.body.is_read).toBe(true);

    // Verify unreadCount is now 0 for admin
    const unreadCountRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(unreadCountRes.body.count).toBe(0);
  });

  // Test 4: تعليم كل الإشعارات كمقروء → توقع markedCount
  it('test 4: should mark all unread notifications of the current user as read in bulk', async () => {
    // Insert 2 more unread notifications for admin
    await pglite.query(
      `INSERT INTO notifications (company_id, user_id, type, title, body)
       VALUES ($1, $2, 'alert', 'تنبيه 1', 'تفاصيل 1'),
              ($1, $2, 'alert', 'تنبيه 2', 'تفاصيل 2')`,
      [companyId, adminUserId],
    );

    const response = await request(app.getHttpServer())
      .patch('/api/v1/notifications/mark-all-read')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.markedCount).toBe(2);

    // Verify unreadCount is now 0
    const unreadCountRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(unreadCountRes.body.count).toBe(0);
  });

  // Test 5: محاولة تعليم إشعار مستخدم تاني → توقع 404 (RLS + user isolation)
  it('test 5: should reject marking another user notification as read with 404', async () => {
    // Get engineer's notification
    const engNotifRes = await pglite.query<{ id: string }>(
      `SELECT id FROM notifications WHERE user_id = $1 LIMIT 1`,
      [engineerUserId],
    );
    const engineerNotifId = engNotifRes.rows[0].id;

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${engineerNotifId}/read`)
      .set('Authorization', `Bearer ${authToken}`) // Admin's token trying to mark Engineer's notification
      .expect(404);

    expect(response.body.code).toBe('NOTIFICATION_NOT_FOUND');
  });
});
