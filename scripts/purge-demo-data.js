const fs = require('fs');
const path = require('path');

// Resolve packages from apps/api/node_modules
const dotenv = require(path.join(__dirname, '../apps/api/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const { Client } = require(path.join(__dirname, '../apps/api/node_modules/pg'));

async function purge() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not found in apps/api/.env');
    process.exit(1);
  }

  // Check confirmation flag or args
  const autoConfirm = process.argv.includes('--yes') || process.argv.includes('-y') || process.env.CONFIRM_PURGE === '1';
  if (!autoConfirm) {
    console.log('WARNING: This script will permanently delete all demo and test data from the live database.');
    console.log('To execute, run with --yes flag: node scripts/purge-demo-data.js --yes');
    process.exit(0);
  }

  console.log('Connecting to PostgreSQL database...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected successfully. Starting purge operation...\n');

  try {
    // 1. Get initial row counts for affected tables
    const tablesToTrack = [
      'import_staging_rows',
      'import_row_errors',
      'import_jobs',
      'export_jobs',
      'production_workers',
      'production_corrections',
      'production_attachments',
      'production_records',
      'attendance',
      'cost_entries',
      'document_versions',
      'documents',
      'document_categories',
      'staff_transfers',
      'incentive_ledger',
      'incentive_rules',
      'notifications',
      'alert_rules',
      'saved_reports',
      'boq_item_areas',
      'boq_items',
      'boq',
      'employee_assignments',
      'branch_work_items',
      'user_project_scopes',
      'user_permission_overrides',
      'user_roles',
      'users',
      'employees',
      'work_areas',
      'projects',
      'branches',
      'work_items',
      'work_item_stages',
      'work_item_prices',
      'work_categories',
      'roles',
      'permissions',
      'attendance_policies',
      'company_settings',
      'labor_rates',
      'sessions',
      'audit_logs'
    ];

    const beforeCounts = {};
    for (const t of tablesToTrack) {
      try {
        const res = await client.query(`SELECT count(*)::int as c FROM "${t}"`);
        beforeCounts[t] = res.rows[0].c;
      } catch (e) {
        beforeCounts[t] = 'N/A';
      }
    }

    console.log('================ BEFORE PURGE ================');
    for (const [t, c] of Object.entries(beforeCounts)) {
      console.log(`  ${t.padEnd(30)}: ${c}`);
    }
    console.log('==============================================\n');

    await client.query('BEGIN');

    // 1) import tables
    console.log('1. Purging import/export staging tables...');
    await client.query('DELETE FROM import_staging_rows;');
    await client.query('DELETE FROM import_row_errors;');
    await client.query('DELETE FROM import_jobs;');
    await client.query('DELETE FROM export_jobs;');

    // 2) production tables
    console.log('2. Purging production workers, corrections, attachments, and records...');
    await client.query('DELETE FROM production_workers;');
    await client.query('DELETE FROM production_corrections;');
    await client.query('DELETE FROM production_attachments;');
    await client.query('DELETE FROM production_records;');

    // 3) attendance
    console.log('3. Purging attendance records...');
    await client.query('DELETE FROM attendance;');

    // 4) cost_entries
    console.log('4. Purging cost entries...');
    await client.query('DELETE FROM cost_entries;');

    // 5) documents
    console.log('5. Purging document versions, documents, and document categories...');
    await client.query('DELETE FROM document_versions;');
    await client.query('DELETE FROM documents;');
    await client.query('DELETE FROM document_categories;');

    // 6) staff_transfers
    console.log('6. Purging staff transfers...');
    await client.query('DELETE FROM staff_transfers;');

    // 7) incentives
    console.log('7. Purging incentive ledger and rules...');
    await client.query('DELETE FROM incentive_ledger;');
    await client.query('DELETE FROM incentive_rules;');

    // 8) notifications & test alert rules
    console.log('8. Purging notifications and test alert rules...');
    await client.query('DELETE FROM notifications;');
    await client.query('DELETE FROM alert_rules;');

    // 9) saved_reports
    console.log('9. Purging saved reports...');
    await client.query('DELETE FROM saved_reports;');

    // 10) BOQ hierarchy
    console.log('10. Purging BOQ item areas, items, and boq headers...');
    await client.query('DELETE FROM boq_item_areas;');
    await client.query('DELETE FROM boq_items;');
    await client.query('DELETE FROM boq;');

    // 11) employee assignments & branch work items
    console.log('11. Purging employee assignments and branch work items...');
    await client.query('DELETE FROM employee_assignments;');
    await client.query('DELETE FROM branch_work_items;');

    // 12) user scopes & non-admin users
    console.log('12. Purging user project scopes and demo user accounts (keeping admin)...');
    await client.query('DELETE FROM user_project_scopes;');
    await client.query('DELETE FROM user_permission_overrides;');
    // Delete roles for non-admin users
    await client.query(`
      DELETE FROM user_roles 
      WHERE user_id IN (SELECT id FROM users WHERE username != 'admin');
    `);
    // Delete non-admin users
    await client.query(`
      DELETE FROM users 
      WHERE username != 'admin';
    `);

    // 13) employees, work areas, projects, branches
    console.log('13. Purging employees, work areas, projects, branches...');
    await client.query('DELETE FROM employees;');
    await client.query('DELETE FROM work_areas;');
    await client.query('DELETE FROM projects;');
    await client.query('DELETE FROM branches;');

    // 14) work items with category_id IS NULL (old general demo items WI-01 to WI-05)
    console.log('14. Purging legacy demo work items (where category_id IS NULL)...');
    await client.query(`
      DELETE FROM work_item_stages 
      WHERE work_item_id IN (SELECT id FROM work_items WHERE category_id IS NULL);
    `);
    await client.query(`
      DELETE FROM work_item_prices 
      WHERE work_item_id IN (SELECT id FROM work_items WHERE category_id IS NULL);
    `);
    await client.query(`
      DELETE FROM work_items 
      WHERE category_id IS NULL;
    `);

    // 15) sessions (force fresh login)
    console.log('15. Purging sessions to force fresh authentication...');
    await client.query('DELETE FROM sessions;');

    // 16) Note: audit_logs is append-only and immutable by database trigger (preserved for compliance)
    console.log('16. audit_logs table is append-only & immutable by design (preserved).');

    await client.query('COMMIT');
    console.log('\nDatabase transactions committed successfully.');

    // 17) Clean uploaded documents directory
    const uploadsDir = path.join(__dirname, '../apps/api/uploads/documents');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let deletedFilesCount = 0;
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          deletedFilesCount++;
        }
      }
      console.log(`17. Cleaned ${deletedFilesCount} files from ${uploadsDir} (directory preserved).`);
    } else {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`17. Ensured upload directory exists: ${uploadsDir}`);
    }

    // 18. Get after counts
    const afterCounts = {};
    for (const t of tablesToTrack) {
      try {
        const res = await client.query(`SELECT count(*)::int as c FROM "${t}"`);
        afterCounts[t] = res.rows[0].c;
      } catch (e) {
        afterCounts[t] = 'N/A';
      }
    }

    console.log('\n================ AFTER PURGE ================');
    for (const [t, c] of Object.entries(afterCounts)) {
      const diff = beforeCounts[t] !== 'N/A' && c !== 'N/A' ? `(-${beforeCounts[t] - c})` : '';
      console.log(`  ${t.padEnd(30)}: ${c} ${diff}`);
    }
    console.log('=============================================\n');

    console.log('>>> PURGE COMPLETED SUCCESSFULLY. Database is clean and ready for production! <<<');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR during purge operation. Transaction rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

purge().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
