const path = require('path');
const dotenv = require(path.join(__dirname, '../apps/api/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });
const { Client } = require(path.join(__dirname, '../apps/api/node_modules/pg'));

async function verify() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const itemsRes = await client.query(`
    SELECT id, code, name, default_daily_target, default_unit_rate
    FROM work_items 
    WHERE code IN ('GYP-01', 'GYP-02', 'GYP-03', 'BLK-01', 'EPX-01')
    ORDER BY code;
  `);

  console.log('\n=== CONTROL CARDS VERIFICATION REPORT ===');

  for (const item of itemsRes.rows) {
    const stages = await client.query(
      'SELECT name, code, percentage, standard_productivity FROM work_item_stages WHERE work_item_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [item.id]
    );
    const prices = await client.query(
      'SELECT contract_price, material_price, labor_rate_skilled, labor_rate_unskilled FROM work_item_prices WHERE work_item_id = $1',
      [item.id]
    );

    const perDay = Number(item.default_daily_target);
    const totalCrew = 2; // 1 skilled + 1 unskilled
    const hours = 8;
    const perHour = Number((perDay / (totalCrew * hours)).toFixed(4));
    const price = prices.rows[0] || {};
    const skilledRate = Number(price.labor_rate_skilled || 224);
    const unskilledRate = Number(price.labor_rate_unskilled || 208);
    const crewDailyCost = skilledRate + unskilledRate;
    const laborCostPerUnit = perDay > 0 ? Number((crewDailyCost / perDay).toFixed(2)) : 0;
    const contractPrice = Number(price.contract_price || item.default_unit_rate || 0);
    const materialPrice = Number(price.material_price || 0);
    const margin = Number((contractPrice - materialPrice - laborCostPerUnit).toFixed(2));

    console.log(`\n============================================================`);
    console.log(`ITEM: [${item.code}] ${item.name}`);
    console.log(`  - Standard Productivity per Day : ${perDay}`);
    console.log(`  - Standard Productivity per Hour: ${perHour}`);
    console.log(`  - Contract Price                : ${contractPrice} SAR`);
    console.log(`  - Material Price                : ${materialPrice} SAR`);
    console.log(`  - Crew Daily Cost               : ${crewDailyCost} SAR (Skilled: ${skilledRate}, Unskilled: ${unskilledRate})`);
    console.log(`  - Labor Cost per Unit           : ${laborCostPerUnit} SAR`);
    console.log(`  - Estimated Margin per Unit     : ${margin} SAR`);
    console.log(`  - Stages count                  : ${stages.rows.length}`);
    stages.rows.forEach((s, idx) => {
      const actualProd = Number((Number(s.percentage) * perDay).toFixed(2));
      console.log(`    Stage ${idx + 1}: ${s.name} | Weight: ${Number(s.percentage) * 100}% | Standard: ${s.standard_productivity} | Actual (weighted): ${actualProd}`);
    });
  }

  // Print exact raw JSON for EPOXY.SCR
  const epxItem = itemsRes.rows.find(i => i.code === 'EPX-01');
  const epxStages = await client.query('SELECT name, code, percentage, standard_productivity FROM work_item_stages WHERE work_item_id = $1 ORDER BY sort_order', [epxItem.id]);
  const epxPrices = await client.query('SELECT contract_price, material_price, labor_rate_skilled, labor_rate_unskilled FROM work_item_prices WHERE work_item_id = $1', [epxItem.id]);
  
  console.log('\n\n=== RAW JSON: EPOXY.SCR (EPX-01) CONTROL CARD ===');
  console.log(JSON.stringify({
    item: epxItem,
    prices: epxPrices.rows[0],
    stages: epxStages.rows
  }, null, 2));

  await client.end();
}

verify().catch(console.error);
