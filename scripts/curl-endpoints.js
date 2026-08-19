const path = require('path');
const dotenv = require(path.resolve('apps/api/node_modules/dotenv'));
dotenv.config({ path: path.resolve('apps/api/.env') });
const { Client } = require(path.resolve('apps/api/node_modules/pg'));
const crypto = require('crypto');

async function testEndpoints() {
  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await dbClient.connect();

  const token = 'curl-verify-token-' + Date.now();
  const userId = '00000000-0000-0000-0003-000000000001';

  await dbClient.query(`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES ($1, $2, NOW() + INTERVAL '1 day')
  `, [userId, token]);

  await dbClient.end();

  console.log('Inserted verification session token into live DB.');

  const endpoints = [
    '/api/v1/crews',
    '/api/v1/kpis/cascade',
    '/api/v1/employees?isActive=true&limit=100',
    '/api/v1/work-items?limit=100',
  ];

  console.log('\n=== TESTING LIVE API ENDPOINTS VIA HTTP / CURL ===');
  for (const ep of endpoints) {
    const res = await fetch(`http://localhost:3000${ep}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`GET ${ep.padEnd(45)} -> STATUS: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const body = await res.text();
      console.log('ERROR BODY:', body);
    }
  }
}

testEndpoints().catch(err => {
  console.error(err);
  process.exit(1);
});
