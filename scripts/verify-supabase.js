const path = require('path');
const dotenv = require(path.resolve('apps/api/node_modules/dotenv'));
dotenv.config({ path: path.resolve('apps/api/.env') });
const { Client } = require(path.resolve('apps/api/node_modules/pg'));

async function verify() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log('=== VERIFYING TABLES IN SUPABASE ===');
  const tables = ['crew_templates', 'crews', 'crew_members', 'room_boq_items', 'employee_project_ids'];
  for (const t of tables) {
    const res = await client.query(
      'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)',
      ['public', t]
    );
    console.log(`TABLE: ${t.padEnd(22)} -> EXISTS: ${res.rows[0].exists}`);
  }

  console.log('\n=== VERIFYING COLUMNS IN SUPABASE ===');
  const cols = [
    { table: 'employees', column: 'profession' },
    { table: 'employees', column: 'hourly_rate' },
    { table: 'work_areas', column: 'area_m2' },
  ];
  for (const c of cols) {
    const res = await client.query(
      'SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = $1 AND column_name = $2)',
      [c.table, c.column]
    );
    console.log(`COLUMN: ${(c.table + '.' + c.column).padEnd(22)} -> EXISTS: ${res.rows[0].exists}`);
  }

  await client.end();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
