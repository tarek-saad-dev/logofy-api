const fs = require('fs');
const path = require('path');
const { getClient } = require('./api/config/database');
require('dotenv').config();

async function runMakePeriodEndNullableMigration() {
  console.log('🚀 Starting Make current_period_end Nullable Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'make_current_period_end_nullable.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if subscriptions table exists
    console.log('🔍 Checking if subscriptions table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      throw new Error('subscriptions table does not exist. Please run subscriptions table migration first.');
    }
    console.log('✅ subscriptions table exists\n');

    // Check current column definition
    console.log('🔍 Checking current column definition...');
    const columnCheck = await client.query(`
      SELECT 
        column_name,
        is_nullable,
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' 
      AND column_name = 'current_period_end'
    `);

    if (columnCheck.rows.length > 0) {
      const column = columnCheck.rows[0];
      console.log(`Current column definition:`);
      console.log(`   - is_nullable: ${column.is_nullable}`);
      console.log(`   - data_type: ${column.data_type}`);
      
      if (column.is_nullable === 'YES') {
        console.log('⚠️  Column is already nullable - migration will still run (safe)\n');
      } else {
        console.log('✅ Column is NOT NULL - will be changed to nullable\n');
      }
    } else {
      throw new Error('current_period_end column does not exist in subscriptions table');
    }

    // Execute migration
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');

    // Verify column is now nullable
    console.log('🔍 Verifying column is now nullable...');
    const verifyCheck = await client.query(`
      SELECT is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' 
      AND column_name = 'current_period_end'
    `);

    if (verifyCheck.rows.length > 0 && verifyCheck.rows[0].is_nullable === 'YES') {
      console.log('✅ current_period_end is now nullable');
      console.log('\n📝 Migration Summary:');
      console.log('   ✅ current_period_end column is now nullable');
      console.log('   ✅ Webhook can now insert NULL values without errors');
      console.log('   ✅ Column remains in schema for future subscription logic');
      console.log('\n🎉 Migration completed successfully!\n');
    } else {
      console.log('⚠️  Warning: Column may not be nullable');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    
    if (error.code === '42P01') {
      console.error('\n💡 Tip: Make sure the subscriptions table exists.');
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
  runMakePeriodEndNullableMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMakePeriodEndNullableMigration };

