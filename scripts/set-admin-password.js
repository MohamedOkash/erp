const path = require('path');
const dotenv = require(path.join(__dirname, '../apps/api/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const { Client } = require(path.join(__dirname, '../apps/api/node_modules/pg'));
const bcrypt = require(path.join(__dirname, '../apps/api/node_modules/bcrypt'));

async function setAdminPassword() {
  const newPassword = process.argv[2] || 'Admin@2026!Secure';
  console.log(`Setting admin password in live database...`);
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const hash = await bcrypt.hash(newPassword, 10);
  const res = await client.query(
    'UPDATE users SET password_hash = $1, is_active = true WHERE username = $2 RETURNING id, username, email, full_name',
    [hash, 'admin']
  );

  if (res.rows.length === 0) {
    console.warn('Admin user not found. Inserting default admin user...');
    await client.query(
      `INSERT INTO users (id, username, email, password_hash, full_name, is_active)
       VALUES ('00000000-0000-0000-0003-000000000001', 'admin', 'admin@company.com', $1, 'مدير النظام', true)
       ON CONFLICT (username) DO UPDATE SET password_hash = $1, is_active = true`,
      [hash]
    );
  }

  console.log('>>> Admin password successfully updated! Credentials: <<<');
  console.log('Username: admin');
  console.log('Password: ' + newPassword);

  await client.end();
}

setAdminPassword().catch((err) => {
  console.error('Error setting admin password:', err);
  process.exit(1);
});
