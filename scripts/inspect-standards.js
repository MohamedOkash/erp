const path = require('path');
const dotenv = require(path.join(__dirname, '../apps/api/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });
const { Client } = require(path.join(__dirname, '../apps/api/node_modules/pg'));

async function inspect() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const itemsRes = await client.query(`
    SELECT id, code, name, default_daily_target, default_unit_rate
    FROM work_items 
    WHERE code IN ('GYP-01', 'GYP-02', 'GYP-03', 'BLK-01', 'EPX-01')
    ORDER BY code;
  `);
  console.log('--- WORK ITEMS ---', itemsRes.rows);

  for (const item of itemsRes.rows) {
    const stages = await client.query('SELECT name, code, percentage, standard_productivity FROM work_item_stages WHERE work_item_id = $1 ORDER BY sort_order', [item.id]);
    const prices = await client.query('SELECT contract_price, material_price, labor_rate_skilled, labor_rate_unskilled FROM work_item_prices WHERE work_item_id = $1', [item.id]);
    console.log(`\n[${item.code}] ${item.name} (daily_target: ${item.default_daily_target}, unit_rate: ${item.default_unit_rate})`);
    console.log('Stages:', stages.rows);
    console.log('Prices:', prices.rows);
  }

  await client.end();
}
inspect().catch(console.error);
