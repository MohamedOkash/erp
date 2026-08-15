const fs = require('fs');
const path = require('path');

// Determine repository root directory
const repoRoot = path.resolve(__dirname, '..');

// Find apps/api/.env or fallback to root .env
let envPath = path.resolve(repoRoot, 'apps/api/.env');
if (!fs.existsSync(envPath)) {
    const rootEnv = path.resolve(repoRoot, '.env');
    if (fs.existsSync(rootEnv)) {
        envPath = rootEnv;
    }
}

if (!fs.existsSync(envPath)) {
    console.error(`Error: .env file not found at ${envPath}`);
    process.exit(1);
}

// Read and parse DATABASE_URL directly using fs without external dependencies
const envContent = fs.readFileSync(envPath, 'utf8');
let databaseUrl = null;

for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/);
    if (match) {
        databaseUrl = match[1].trim();
        if (
            (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) ||
            (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))
        ) {
            databaseUrl = databaseUrl.slice(1, -1);
        }
        break;
    }
}

if (!databaseUrl) {
    console.error('Error: DATABASE_URL not found in .env file.');
    process.exit(1);
}

// Resolve pg dependency
let pg;
try {
    pg = require('pg');
} catch (e) {
    try {
        pg = require(path.resolve(repoRoot, 'apps/api/node_modules/pg'));
    } catch (e2) {
        pg = require(path.resolve(repoRoot, 'node_modules/pg'));
    }
}

const { Pool } = pg;

async function run() {
    const poolConfig = { connectionString: databaseUrl };
    // Handle cloud SSL connections if requested in connection string
    if (databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech') || databaseUrl.includes('supabase.co')) {
        poolConfig.ssl = { rejectUnauthorized: false };
    }

    const pool = new Pool(poolConfig);
    let client;

    try {
        client = await pool.connect();

        // Safety check: Abort if companies table already exists
        const checkRes = await client.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_name = 'companies'
            ) AS exists;
        `);

        if (checkRes.rows[0]?.exists) {
            console.log('DB already initialized — abort');
            return;
        }

        const initSqlPath = path.resolve(repoRoot, 'db/migrations/0001_init.sql');
        const seedSqlPath = path.resolve(repoRoot, 'db/migrations/0002_seed_demo.sql');

        if (!fs.existsSync(initSqlPath)) {
            throw new Error(`Migration file not found: ${initSqlPath}`);
        }
        if (!fs.existsSync(seedSqlPath)) {
            throw new Error(`Migration file not found: ${seedSqlPath}`);
        }

        console.log('Applying db/migrations/0001_init.sql...');
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        await client.query(initSql);
        console.log('0001_init.sql applied successfully.');

        console.log('Applying db/migrations/0002_seed_demo.sql...');
        const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
        await client.query(seedSql);
        console.log('0002_seed_demo.sql applied successfully.');

        const tables = [
            'companies',
            'branches',
            'projects',
            'work_areas',
            'units',
            'work_items',
            'branch_work_items',
            'employees',
            'employee_assignments',
            'users',
            'boq',
            'boq_items',
            'boq_item_areas',
            'production_records',
            'production_workers',
            'attendance'
        ];

        console.log('\n=== Table Counts ===');
        for (const table of tables) {
            const countRes = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
            console.log(`${table}: ${countRes.rows[0].count}`);
        }
    } catch (err) {
        console.error('Error running migrations:', err.message || err);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

run();
