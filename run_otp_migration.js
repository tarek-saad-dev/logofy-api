const fs = require('fs');
const path = require('path');
const { getClient } = require('./api/config/database');
require('dotenv').config();

async function runOTPMigration() {
  console.log('🚀 Starting OTP Table Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'api', 'config', 'migration_add_otp_table.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if table already exists
    console.log('🔍 Checking if otp_codes table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'otp_codes'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  otp_codes table already exists');
      console.log('   Migration will update existing schema (safe to run)\n');
    } else {
      console.log('✅ otp_codes table does not exist - will be created\n');
    }

    // Execute migration
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');

    // Verify table was created
    console.log('🔍 Verifying migration...');
    const verifyTable = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'otp_codes'
      ORDER BY ordinal_position
    `);

    if (verifyTable.rows.length > 0) {
      console.log('✅ Migration verification successful:');
      verifyTable.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      console.log('\n✅ OTP Table Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Configure Gmail credentials in .env file:');
      console.log('      GMAIL_USER=your-email@gmail.com');
      console.log('      GMAIL_APP_PASSWORD=your-app-password');
      console.log('   2. Test OTP endpoints\n');
    } else {
      console.log('⚠️  Warning: Table may not have been created');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    
    if (error.code === '42P01') {
      console.error('\n💡 Tip: Make sure the database connection is working.');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runOTPMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runOTPMigration };

