const { getClient } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runAddOTPMetadata() {
  console.log('🚀 Adding metadata column to otp_codes table...\n');

  let client;
  try {
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    const migrationPath = path.join(__dirname, 'api', 'config', 'migration_add_otp_metadata.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Metadata column added successfully\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (client) await client.end();
  }
}

runAddOTPMetadata().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

