import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Users & RBAC Management with Project Scope Isolation', () => {
  let app: INestApplication;
  let pglite: PGlite;

  const adminUserId = '00000000-0000-0000-0003-000000000001'; // company_admin
  const engineerUserId = '00000000-0000-0000-0003-000000000002'; // existing engineer
  let adminToken: string;
  let engineerToken: string;

  const project1Id = 'f0000000-0000-0000-0000-000000000001'; // Riyadh project
  const project2Id = 'f0000000-0000-0000-0000-000000000002'; // Jeddah project
  const branch1Id = 'b0000000-0000-0000-0000-000000000001';
  const testWorkItemId = '00000000-0000-0000-0005-000000000001';
  const testEmployeeId = 'e0000000-0000-0000-0000-000000000006';

  let newEngineerUsername = 'eng_scoped_' + Date.now();
  let newEngineerToken: string;
  let newEngineerUserId: string;

  beforeAll(async () => {
    pglite = new PGlite();
    await pglite.waitReady;

    const migrationDir = path.resolve(__dirname, '../../../db/migrations');
    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await pglite.exec(sql);
    }

    adminToken = 'token-admin-' + Date.now();
    engineerToken = 'token-eng-' + Date.now();

    await pglite.query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES
       ($1, $2, CURRENT_TIMESTAMP + interval '24 hours'),
       ($3, $4, CURRENT_TIMESTAMP + interval '24 hours')`,
      [adminUserId, adminToken, engineerUserId, engineerToken],
    );

    const mockDbService = {
      query: async (text: string, params?: any[]) => {
        const sanitized = (params || []).map((p) => (p === undefined ? null : p));
        const res = await pglite.query(text, sanitized);
        return { rows: res.rows, rowCount: (res as any).affectedRows ?? res.rows.length } as any;
      },
      withTenantTransaction: async (tenantCompanyId: string, op: any) => {
        return pglite.transaction(async (tx) => {
          await tx.query("SELECT set_config('app.company_id', $1, true)", [tenantCompanyId]);
          const clientShim = {
            query: async (t: string, p?: any[]) => {
              const sanitized = (p || []).map((x) => (x === undefined ? null : x));
              const r = await tx.query(t, sanitized);
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
            const sanitized = (p || []).map((x) => (x === undefined ? null : x));
            const r = await pglite.query(t, sanitized);
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

  // Test 1: Admin creates engineer account with project 1 scope -> 201 + scopes saved
  it('Test 1: Admin creates engineer account with project 1 scope -> 201 and scopes saved', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: newEngineerUsername,
        password: 'Password123!',
        fullName: 'مهندس موقع الرياض',
        email: 'eng_riyadh@company.com',
        roleCodes: ['engineer'],
        scopes: [{ projectId: project1Id, branchId: branch1Id }],
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe(newEngineerUsername);
    expect(res.body.roles.some((r: any) => r.roleCode === 'engineer')).toBe(true);
    expect(res.body.scopes.length).toBe(1);
    expect(res.body.scopes[0].projectId).toBe(project1Id);

    newEngineerUserId = res.body.id;
  });

  // Test 2: New engineer logs in -> /auth/me includes scopes and only sees project 1 records
  it('Test 2: Scoped engineer logs in -> /auth/me has scopes and GET /production isolates data', async () => {
    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: newEngineerUsername,
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    newEngineerToken = loginRes.body.token;

    // Check /auth/me
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newEngineerToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.scopes.length).toBe(1);
    expect(meRes.body.user.scopes[0].projectId).toBe(project1Id);

    // Create a dummy production record in project 2 (via admin)
    await pglite.query(
      `INSERT INTO production_records (company_id, branch_id, project_id, work_item_id, date, production_type, actual_quantity, target_quantity, supervisor_id, status)
       VALUES ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', $1, $2, '2026-08-16', 'individual', 50, 50, 'e0000000-0000-0000-0000-000000000003', 'draft')`,
      [project2Id, testWorkItemId],
    );

    // Engineer requests list of production records -> MUST NOT contain project 2 records
    const prodRes = await request(app.getHttpServer())
      .get('/api/v1/production')
      .set('Authorization', `Bearer ${newEngineerToken}`);

    expect(prodRes.status).toBe(200);
    for (const rec of prodRes.body) {
      expect(rec.project_id).not.toBe(project2Id);
    }
  });

  // Test 3: Engineer tries to create record in project 2 (outside assigned scope) -> 403 OUT_OF_SCOPE
  it('Test 3: Engineer tries to create record in project outside scope -> 403 OUT_OF_SCOPE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/production')
      .set('Authorization', `Bearer ${newEngineerToken}`)
      .send({
        date: '2026-08-16',
        branchId: 'b0000000-0000-0000-0000-000000000002',
        projectId: project2Id,
        workItemId: testWorkItemId,
        supervisorId: 'e0000000-0000-0000-0000-000000000003',
        targetQuantity: 100,
        actualQuantity: 100,
        productionType: 'individual',
        workers: [
          {
            employeeId: testEmployeeId,
            individualQuantity: 100,
          },
        ],
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUT_OF_SCOPE');
  });

  // Test 4: Admin updates role matrix (removes permission) -> user with that role loses it in /auth/me
  it('Test 4: Admin updates role matrix -> user loses removed permission in /auth/me', async () => {
    // 1. Get role ID for 'engineer'
    const roleRes = await pglite.query(`SELECT id FROM roles WHERE code = 'engineer'`);
    const engineerRoleId = (roleRes.rows[0] as any).id;

    // 2. Fetch current permissions
    const permsRes = await request(app.getHttpServer())
      .get(`/api/v1/roles/${engineerRoleId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(permsRes.status).toBe(200);
    const initialPermIds: string[] = permsRes.body.permissionIds;

    // Remove 'production.engineer_approve' permission
    const approvePermRes = await pglite.query(
      `SELECT id FROM permissions WHERE code = 'production.engineer_approve'`,
    );
    const approvePermId = (approvePermRes.rows[0] as any)?.id;
    const newPermIds = initialPermIds.filter((id) => id !== approvePermId);

    const updateRes = await request(app.getHttpServer())
      .put(`/api/v1/roles/${engineerRoleId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissionIds: newPermIds });

    expect(updateRes.status).toBe(200);

    // Check engineer's /auth/me -> permission 'production.engineer_approve' must be gone
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newEngineerToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.permissions).not.toContain('production.engineer_approve');

    // Restore permission for subsequent tests
    await request(app.getHttpServer())
      .put(`/api/v1/roles/${engineerRoleId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissionIds: initialPermIds });
  });

  // Test 5: Override grant for user -> extra permission; override deny -> loses permission despite role
  it('Test 5: Override grant adds permission, override deny removes permission', async () => {
    // 1. Grant override for 'audit.view'
    await request(app.getHttpServer())
      .put(`/api/v1/users/${newEngineerUserId}/overrides`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        overrides: [
          { permissionCode: 'audit.view', grantType: 'grant' },
          { permissionCode: 'production.create', grantType: 'deny' },
        ],
      });

    // Check /auth/me
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${newEngineerToken}`);

    expect(meRes.status).toBe(200);
    // 'audit.view' granted via override
    expect(meRes.body.user.permissions).toContain('audit.view');
    // 'production.create' denied via override despite being an engineer
    expect(meRes.body.user.permissions).not.toContain('production.create');
  });

  // Test 6: Non-admin tries to create user account -> 403 FORBIDDEN_ADMIN_ONLY
  it('Test 6: Non-admin user tries to create user account -> 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${newEngineerToken}`)
      .send({
        username: 'unauthorized_creation_' + Date.now(),
        password: 'Password123!',
        fullName: 'حساب غير مصرح به',
        roleCodes: ['engineer'],
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ADMIN_ONLY');
  });
});
