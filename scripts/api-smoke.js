const path = require('path');
const http = require('http');
const dotenv = require(path.resolve(__dirname, '../apps/api/node_modules/dotenv'));
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });
const { Client } = require(path.resolve(__dirname, '../apps/api/node_modules/pg'));

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let parsed = body;
        try { parsed = JSON.parse(body); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('🚀 Running API Smoke Gate (Validating 100% contracts & 0 Bad Requests)...\n');

  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  let token = '';
  let projectId = '';
  let branchId = '';
  let workItemId = '';
  let employeeId = '';
  let identityNumber = '1000000001';

  try {
    const companyRes = await db.query('SELECT id FROM companies LIMIT 1');
    const companyId = companyRes.rows[0]?.id || 'c0000000-0000-0000-0000-000000000001';

    const projRes = await db.query('SELECT id FROM projects WHERE company_id = $1 LIMIT 1', [companyId]);
    projectId = projRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';

    const branchRes = await db.query('SELECT id FROM branches WHERE company_id = $1 LIMIT 1', [companyId]);
    branchId = branchRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';

    const itemRes = await db.query('SELECT id FROM work_items WHERE company_id = $1 LIMIT 1', [companyId]);
    workItemId = itemRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';

    const empRes = await db.query("SELECT id, identity_number FROM employees WHERE company_id = $1 AND identity_number IS NOT NULL AND identity_number != '' LIMIT 1", [companyId]);
    if (empRes.rows.length > 0) {
      employeeId = empRes.rows[0].id;
      identityNumber = empRes.rows[0].identity_number;
    } else {
      // Create a test employee if none exists
      const insertEmp = await db.query(
        `INSERT INTO employees (company_id, identity_number, name, code, phone, role_type, primary_branch_id, daily_wage, is_active)
         VALUES ($1, '1000000001', 'أحمد محمود التجريبي', 'EMP-TEST-01', '0501112233', 'skilled', $2, 200, true)
         ON CONFLICT (company_id, identity_number) DO UPDATE SET is_active = true
         RETURNING id, identity_number`,
        [companyId, branchId]
      );
      employeeId = insertEmp.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
      identityNumber = insertEmp.rows[0]?.identity_number || '1000000001';
    }

    // Authenticate / login
    const loginRes = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'admin', password: 'Admin@2026!Secure' });

    if (loginRes.statusCode !== 200 || !loginRes.body?.token) {
      console.error('❌ Failed to login to API:', loginRes.statusCode, loginRes.body);
      process.exit(1);
    }
    token = loginRes.body.token;
  } finally {
    await db.end();
  }

  // 2. Comprehensive Endpoint Matrix Matching apps/web/src/api/*.ts
  const ENDPOINTS = [
    // Auth & Users
    { method: 'GET', path: '/api/v1/auth/me', params: '' },
    { method: 'GET', path: '/api/v1/users', params: 'page=1&limit=25' },
    { method: 'GET', path: '/api/v1/roles', params: '' },
    { method: 'GET', path: '/api/v1/company-settings', params: '' },

    // Core Structure & Reference Data
    { method: 'GET', path: '/api/v1/branches', params: '' },
    { method: 'GET', path: '/api/v1/projects', params: `branchId=${branchId}` },
    { method: 'GET', path: '/api/v1/work-categories', params: '' },
    { method: 'GET', path: '/api/v1/work-items', params: 'page=1&limit=50&isActive=true' },
    { method: 'GET', path: `/api/v1/work-items/${workItemId}/stages`, params: '' },
    { method: 'GET', path: `/api/v1/work-items/${workItemId}/prices`, params: '' },
    { method: 'GET', path: '/api/v1/work-areas', params: `projectId=${projectId}` },
    { method: 'GET', path: '/api/v1/crews', params: `projectId=${projectId}` },
    { method: 'GET', path: '/api/v1/crews/templates', params: '' },

    // Employees & Operations
    { method: 'GET', path: '/api/v1/employees', params: 'page=1&limit=50&isActive=true' },
    { method: 'GET', path: `/api/v1/employees/by-identity/${identityNumber}`, params: '' },
    { method: 'GET', path: '/api/v1/transfers', params: `employeeId=${employeeId}` },
    { method: 'GET', path: '/api/v1/attendance', params: 'date=2026-08-19' },
    { method: 'GET', path: '/api/v1/attendance-policies', params: '' },

    // Production, BOQ, KPIs, Control Cards
    { method: 'GET', path: '/api/v1/production', params: `projectId=${projectId}&page=1&limit=50` },
    { method: 'GET', path: '/api/v1/boq', params: `projectId=${projectId}` },
    { method: 'GET', path: '/api/v1/kpis/cascade', params: `projectId=${projectId}` },
    { method: 'GET', path: '/api/v1/control-cards', params: `projectId=${projectId}` },
    { method: 'GET', path: `/api/v1/control-cards/${workItemId}`, params: `projectId=${projectId}` },
    { method: 'GET', path: '/api/v1/control-reports/daily', params: `projectId=${projectId}&date=2026-08-19` },

    // Costs, Incentives, Reports, Alerts, Notifications
    { method: 'GET', path: '/api/v1/costs', params: `projectId=${projectId}` },
    { method: 'GET', path: '/api/v1/incentive-ledger', params: '' },
    { method: 'GET', path: `/api/v1/financial-reports/project/${projectId}`, params: '' },
    { method: 'GET', path: '/api/v1/saved-reports', params: '' },
    { method: 'GET', path: '/api/v1/alert-rules', params: '' },
    { method: 'GET', path: '/api/v1/notifications', params: 'page=1&limit=20' },
    { method: 'GET', path: '/api/v1/documents', params: '' },
  ];

  let hasFailure = false;
  const results = [];

  for (const ep of ENDPOINTS) {
    const fullPath = ep.params ? `${ep.path}?${ep.params}` : ep.path;
    try {
      const res = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: fullPath,
        method: ep.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const isOk = res.statusCode === 200 || res.statusCode === 201;
      if (!isOk) {
        hasFailure = true;
      }

      results.push({
        method: ep.method,
        path: ep.path,
        params: ep.params || '—',
        status: res.statusCode,
        ok: isOk,
        error: isOk ? '' : JSON.stringify(res.body?.message || res.body || ''),
      });
    } catch (err) {
      hasFailure = true;
      results.push({
        method: ep.method,
        path: ep.path,
        params: ep.params || '—',
        status: 'CONN_ERR',
        ok: false,
        error: err.message,
      });
    }
  }

  // Print Markdown Table
  console.log('| Endpoint | Method | Params / Query | Status | Result |');
  console.log('| :--- | :---: | :--- | :---: | :---: |');
  results.forEach((r) => {
    console.log(`| \`${r.path}\` | **${r.method}** | \`${r.params}\` | **${r.status}** | ${r.ok ? '✔ 200 OK' : `❌ FAILED (${r.error})`} |`);
  });

  if (hasFailure) {
    console.error('\n💥 api-smoke: One or more endpoints failed (400 Bad Request or error detected)!');
    process.exit(1);
  }

  console.log('\n✅ api-smoke: 100% of tested API endpoints returned 200 OK with zero 400 Bad Requests.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal in api-smoke:', err);
  process.exit(1);
});
