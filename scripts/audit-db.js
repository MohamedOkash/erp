const path = require('path');
const dotenv = require(path.join(__dirname, '../apps/api/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const { Client } = require(path.join(__dirname, '../apps/api/node_modules/pg'));

async function audit() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  console.log('=== TABLE ROW COUNTS ===');
  const counts = {};
  for (const row of tablesRes.rows) {
    const t = row.table_name;
    const countRes = await client.query(`SELECT count(*)::int as count FROM "${t}"`);
    counts[t] = countRes.rows[0].count;
    console.log(`${t.padEnd(30)}: ${countRes.rows[0].count}`);
  }

  console.log('\n=== DETAILED CHECKS ===');
  const userRes = await client.query(`SELECT id, username, email, full_name, is_active FROM users;`);
  console.log('Users (', userRes.rows.length, '):', userRes.rows);

  const companyRes = await client.query(`SELECT id, name, code, is_active FROM companies;`);
  console.log('Companies (', companyRes.rows.length, '):', companyRes.rows);

  const branchRes = await client.query(`SELECT id, name, code, is_active FROM branches;`);
  console.log('Branches (', branchRes.rows.length, '):', branchRes.rows);

  const projRes = await client.query(`SELECT id, name, code, status FROM projects;`);
  console.log('Projects (', projRes.rows.length, '):', projRes.rows);

  const workItemCatNull = await client.query(`SELECT count(*)::int as c FROM work_items WHERE category_id IS NULL;`);
  const workItemCatNotNull = await client.query(`SELECT count(*)::int as c FROM work_items WHERE category_id IS NOT NULL;`);
  console.log(`Work Items (total: ${counts['work_items'] || 0}): category_id IS NULL: ${workItemCatNull.rows[0].c}, category_id IS NOT NULL: ${workItemCatNotNull.rows[0].c}`);

  const catRes = await client.query(`SELECT count(*)::int as c FROM work_categories;`);
  console.log(`Work Categories: ${catRes.rows[0].c}`);

  const roleRes = await client.query(`SELECT count(*)::int as c FROM roles;`);
  console.log(`Roles: ${roleRes.rows[0].c}`);

  const permRes = await client.query(`SELECT count(*)::int as c FROM permissions;`);
  console.log(`Permissions: ${permRes.rows[0].c}`);

  const attPolRes = await client.query(`SELECT count(*)::int as c FROM attendance_policies;`);
  console.log(`Attendance Policies: ${attPolRes.rows[0].c}`);

  const compSetRes = await client.query(`SELECT count(*)::int as c FROM company_settings;`);
  console.log(`Company Settings: ${compSetRes.rows[0].c}`);

  const labRateRes = await client.query(`SELECT count(*)::int as c FROM labor_rates;`);
  console.log(`Labor Rates: ${labRateRes.rows[0].c}`);

  const alertRes = await client.query(`SELECT id, name, rule_type FROM alert_rules;`);
  console.log('Alert Rules (', alertRes.rows.length, '):', alertRes.rows);

  await client.end();
}

audit().catch(console.error);
