import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Alert Rules CRUD and Scheduled Evaluation Engine (Task 13)', () => {
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

    // Create session token for admin user
    authToken = 'test-token-alerts-' + Date.now();
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

  // Test 1: إنشاء قاعدة تنبيه صحيحة → توقع 201
  it('test 1: should create valid alert rule with 201', async () => {
    const payload = {
      name: 'تنبيه تجاوز سقف الإنتاج اليومي',
      type: 'production_threshold',
      condition: { metric: 'total_quantity', operator: '>=' },
      threshold: 50,
      notificationUserIds: [adminUserId],
      enabled: true,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/alert-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe(payload.name);
    expect(response.body.rule_type).toBe(payload.type);
    expect(response.body.is_active).toBe(true);
  });

  // Test 2: محاولة إنشاء قاعدة بنفس الاسم → توقع 409 ALERT_RULE_NAME_DUPLICATE
  it('test 2: should reject creating duplicate alert rule with same name with 409', async () => {
    const duplicatePayload = {
      name: 'تنبيه تجاوز سقف الإنتاج اليومي',
      type: 'production_threshold',
      threshold: 100,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/alert-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send(duplicatePayload)
      .expect(409);

    expect(response.body.code).toBe('ALERT_RULE_NAME_DUPLICATE');
  });

  // Test 3: تحديث قاعدة موجودة → توقع 200
  it('test 3: should update existing alert rule with 200 and return updated data', async () => {
    const ruleRes = await pglite.query<{ id: string }>(
      `SELECT id FROM alert_rules WHERE company_id = $1 LIMIT 1`,
      [companyId],
    );
    const ruleId = ruleRes.rows[0].id;

    const updatePayload = {
      name: 'تنبيه تجاوز سقف الإنتاج اليومي - معدل',
      threshold: 75,
    };

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/alert-rules/${ruleId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatePayload)
      .expect(200);

    expect(response.body.id).toBe(ruleId);
    expect(response.body.name).toBe(updatePayload.name);
  });

  // Test 4: حذف قاعدة → توقع 204
  it('test 4: should delete an alert rule with 204', async () => {
    // Create temporary rule to delete
    const tempRule = await pglite.query<{ id: string }>(
      `INSERT INTO alert_rules (company_id, name, rule_type, condition_config, is_active)
       VALUES ($1, 'قاعدة للحذف', 'custom', '{}', true) RETURNING id`,
      [companyId],
    );
    const targetId = tempRule.rows[0].id;

    await request(app.getHttpServer())
      .delete(`/api/v1/alert-rules/${targetId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);

    // Verify deleted
    const checkRes = await pglite.query(
      `SELECT id FROM alert_rules WHERE id = $1`,
      [targetId],
    );
    expect(checkRes.rows.length).toBe(0);
  });

  // Test 5: تشغيل التقييم يدويًا مع قاعدة شرطها متحقق → توقع alertsTriggered ≥ 1
  it('test 5: should evaluate active rules and trigger alert when condition is met', async () => {
    // Clean rules and insert a rule that is guaranteed to match (total production quantity >= 10 in demo seed)
    await pglite.query(`DELETE FROM alert_rules WHERE company_id = $1`, [companyId]);

    const matchingRule = {
      name: 'قاعدة إنتاج متحققة',
      type: 'production_threshold',
      condition: { metric: 'total_quantity', operator: '>=' },
      threshold: 5,
      notificationUserIds: [adminUserId],
      enabled: true,
    };

    await request(app.getHttpServer())
      .post('/api/v1/alert-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send(matchingRule)
      .expect(201);

    const evalResponse = await request(app.getHttpServer())
      .post('/api/v1/alerts/evaluate')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(evalResponse.body.rulesEvaluated).toBeGreaterThanOrEqual(1);
    expect(evalResponse.body.alertsTriggered).toBeGreaterThanOrEqual(1);

    // Verify notification was recorded in notifications table
    const notifRes = await pglite.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE company_id = $1 AND type = 'alert'`,
      [companyId],
    );
    expect(notifRes.rows[0].count).toBeGreaterThanOrEqual(1);
  });

  // Test 6: تشغيل التقييم مع قاعدة شرطها غير متحقق → توقع alertsTriggered = 0
  it('test 6: should evaluate active rules and not trigger alert when condition is not met', async () => {
    // Clean rules and insert an impossible threshold
    await pglite.query(`DELETE FROM alert_rules WHERE company_id = $1`, [companyId]);

    const nonMatchingRule = {
      name: 'قاعدة مستحيلة',
      type: 'production_threshold',
      condition: { metric: 'total_quantity', operator: '>=' },
      threshold: 999999999, // Impossible threshold
      notificationUserIds: [adminUserId],
      enabled: true,
    };

    await request(app.getHttpServer())
      .post('/api/v1/alert-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send(nonMatchingRule)
      .expect(201);

    const evalResponse = await request(app.getHttpServer())
      .post('/api/v1/alerts/evaluate')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    expect(evalResponse.body.rulesEvaluated).toBe(1);
    expect(evalResponse.body.alertsTriggered).toBe(0);
  });
});
