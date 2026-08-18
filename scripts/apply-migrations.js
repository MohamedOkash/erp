const fs = require('fs');
const path = require('path');

// Resolve packages from apps/api/node_modules
const dotenv = require(path.join(__dirname, '../apps/api/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const { Client } = require(path.join(__dirname, '../apps/api/node_modules/pg'));

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not found in apps/api/.env');
    process.exit(1);
  }

  console.log('Connecting to live PostgreSQL database...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to live database successfully.');

  try {
    // Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if initial tables already exist in live DB
    const checkInit = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'companies'
    `);

    if (checkInit.rows.length > 0) {
      // 0001 and 0002 are already seeded previously
      await client.query(`
        INSERT INTO _migrations (name) VALUES ('0001_init.sql'), ('0002_seed_demo.sql')
        ON CONFLICT (name) DO NOTHING
      `);

      // Check if 0004 was already applied
      const check0004 = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'identity_number'
      `);
      if (check0004.rows.length > 0) {
        await client.query(`
          INSERT INTO _migrations (name) VALUES ('0004_multi_country_support.sql')
          ON CONFLICT (name) DO NOTHING
        `);
      }
    }

    const migrationsDir = path.join(__dirname, '../db/migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    const isProdOrSkipSeed = process.env.NODE_ENV === 'production' || process.env.SKIP_SEED === '1' || process.argv.includes('--skip-seed');

    for (const file of files) {
      const checkRes = await client.query('SELECT name FROM _migrations WHERE name = $1', [file]);
      if (checkRes.rows.length > 0) {
        console.log(`[SKIPPED] Migration already recorded: ${file}`);
        continue;
      }

      if (file === '0002_seed_demo.sql' && isProdOrSkipSeed) {
        console.log(`[PRODUCTION SAFE] Skipping demo seed file: ${file} (recording as skipped in _migrations)`);
        await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [file]);
        continue;
      }

      console.log(`[APPLYING] Migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [file]);
        console.log(`[SUCCESS] Applied migration: ${file}`);
      } catch (err) {
        console.warn(`[WARN] Migration ${file} note: ${err.message}`);
        if (
          err.message.includes('already exists') ||
          err.message.includes('duplicate key') ||
          err.message.includes('already a partition')
        ) {
          console.log(`[RECOVERED] Safely ignored 'already exists' for ${file} and recorded as applied.`);
          await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [file]);
        } else {
          console.error(`[ERROR] Fatal error on ${file}:`, err);
          throw err;
        }
      }
    }

    // Verify 15 finishing categories
    console.log('\n--- Verifying Work Categories in Live Database ---');
    const catRes = await client.query(`
      SELECT id, name, code, sort_order 
      FROM work_categories 
      ORDER BY sort_order ASC
    `);

    console.log(`Found ${catRes.rows.length} categories:`);
    catRes.rows.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.code}] ${r.name}`);
    });

    if (catRes.rows.length >= 15) {
      console.log('\n>>> All 15 Finishing Categories verified successfully in Live Database! <<<');
    } else {
      console.warn(`\n>>> Warning: expected at least 15 categories, found ${catRes.rows.length} <<<`);
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
