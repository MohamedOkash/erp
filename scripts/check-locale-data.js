const path = require('path');
const dotenv = require(path.resolve(__dirname, '../apps/api/node_modules/dotenv'));
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });
const { Client } = require(path.resolve(__dirname, '../apps/api/node_modules/pg'));

async function checkLocaleData() {
  console.log('🔍 Running check-locale-data: Verifying multilingual reference data in live Database...');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL missing in apps/api/.env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  let hasErrors = false;

  try {
    // 1. Check work_categories
    console.log('--- Checking [work_categories] Multilingual Columns ---');
    const catCheck = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE name_en IS NULL OR TRIM(name_en) = '') AS missing_en,
        COUNT(*) FILTER (WHERE name_ur IS NULL OR TRIM(name_ur) = '') AS missing_ur
      FROM work_categories
    `);
    const catStats = catCheck.rows[0];
    console.log(`   Total Categories: ${catStats.total} | Missing EN: ${catStats.missing_en} | Missing UR: ${catStats.missing_ur}`);
    if (Number(catStats.missing_en) > 0 || Number(catStats.missing_ur) > 0) {
      hasErrors = true;
      console.error('❌ [work_categories] has NULL or empty name_en / name_ur values!');
    }

    // 2. Check crew_templates
    console.log('--- Checking [crew_templates] Multilingual Columns ---');
    const crewCheck = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE name_en IS NULL OR TRIM(name_en) = '') AS missing_en,
        COUNT(*) FILTER (WHERE name_ur IS NULL OR TRIM(name_ur) = '') AS missing_ur
      FROM crew_templates
    `);
    const crewStats = crewCheck.rows[0];
    console.log(`   Total Crew Templates: ${crewStats.total} | Missing EN: ${crewStats.missing_en} | Missing UR: ${crewStats.missing_ur}`);
    if (Number(crewStats.missing_en) > 0 || Number(crewStats.missing_ur) > 0) {
      hasErrors = true;
      console.error('❌ [crew_templates] has NULL or empty name_en / name_ur values!');
    }

    // 3. Check units
    console.log('--- Checking [units] Multilingual Columns ---');
    const unitCheck = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE name_en IS NULL OR TRIM(name_en) = '') AS missing_en,
        COUNT(*) FILTER (WHERE name_ur IS NULL OR TRIM(name_ur) = '') AS missing_ur,
        COUNT(*) FILTER (WHERE symbol_en IS NULL OR TRIM(symbol_en) = '') AS missing_symbol_en,
        COUNT(*) FILTER (WHERE symbol_ur IS NULL OR TRIM(symbol_ur) = '') AS missing_symbol_ur
      FROM units
    `);
    const unitStats = unitCheck.rows[0];
    console.log(`   Total Units: ${unitStats.total} | Missing EN: ${unitStats.missing_en} | Missing UR: ${unitStats.missing_ur} | Missing Symbols: ${Number(unitStats.missing_symbol_en) + Number(unitStats.missing_symbol_ur)}`);
    if (
      Number(unitStats.missing_en) > 0 ||
      Number(unitStats.missing_ur) > 0 ||
      Number(unitStats.missing_symbol_en) > 0 ||
      Number(unitStats.missing_symbol_ur) > 0
    ) {
      hasErrors = true;
      console.error('❌ [units] has NULL or empty multilingual name/symbol values!');
    }

  } catch (err) {
    console.error('❌ Error querying live DB:', err.message);
    hasErrors = true;
  } finally {
    await client.end();
  }

  if (hasErrors) {
    console.error('\n💥 check-locale-data: FAILED. Please apply multilingual migration 0017.');
    process.exit(1);
  }

  console.log('\n✅ check-locale-data: All reference tables have 100% complete multilingual data (0 NULLs).');
  process.exit(0);
}

checkLocaleData();
