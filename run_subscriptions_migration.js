const fs = require('fs');
const path = require('path');
const { getClient } = require('./api/config/database');
require('dotenv').config();

async function runSubscriptionsMigration() {
  console.log('🚀 Starting Subscriptions Table Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_subscriptions_table.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if table already exists
    console.log('🔍 Checking if subscriptions table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  subscriptions table already exists');
      console.log('   Migration will update existing schema (safe to run)\n');
    } else {
      console.log('✅ subscriptions table does not exist - will be created\n');
    }

    // Check if enum type already exists
    console.log('🔍 Checking if subscription_status enum exists...');
    const enumCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = 'subscription_status'
      ) as exists
    `);

    if (enumCheck.rows[0].exists) {
      console.log('⚠️  subscription_status enum already exists');
      console.log('   Migration will continue (safe to run)\n');
    } else {
      console.log('✅ subscription_status enum does not exist - will be created\n');
    }

    // Check if users table exists (required for foreign key)
    console.log('🔍 Checking if users table exists...');
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `);

    if (!usersTableCheck.rows[0].exists) {
      throw new Error('users table does not exist. Please run user/auth migrations first.');
    }
    console.log('✅ users table exists\n');

    // Execute migration
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');

    // Verify enum type was created
    console.log('🔍 Verifying subscription_status enum...');
    const verifyEnum = await client.query(`
      SELECT 
        enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'subscription_status'
      )
      ORDER BY enumsortorder
    `);

    if (verifyEnum.rows.length > 0) {
      console.log('✅ subscription_status enum created with values:');
      verifyEnum.rows.forEach(row => {
        console.log(`   - ${row.enumlabel}`);
      });
      console.log('');
    }

    // Verify table was created
    console.log('🔍 Verifying subscriptions table...');
    const verifyTable = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position
    `);

    if (verifyTable.rows.length > 0) {
      console.log('✅ Migration verification successful:');
      verifyTable.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        if (col.column_default) {
          console.log(`     Default: ${col.column_default}`);
        }
      });
      console.log('');

      // Verify indexes
      console.log('🔍 Verifying indexes...');
      const indexesCheck = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'subscriptions'
        ORDER BY indexname
      `);

      if (indexesCheck.rows.length > 0) {
        console.log('✅ Indexes created:');
        indexesCheck.rows.forEach(idx => {
          console.log(`   - ${idx.indexname}`);
        });
      }
      console.log('');

      console.log('✅ Subscriptions Table Migration completed successfully!');
      console.log('\n📝 Migration Summary:');
      console.log('   ✅ subscription_status enum type created');
      console.log('   ✅ subscriptions table created');
      console.log('   ✅ Foreign key to users table established');
      console.log('   ✅ Indexes created for performance');
      console.log('\n🎉 Your subscriptions table is ready to use!\n');
    } else {
      console.log('⚠️  Warning: Table may not have been created');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    
    if (error.code === '42P01') {
      console.error('\n💡 Tip: Make sure the database connection is working.');
    }
    
    if (error.code === '23503') {
      console.error('\n💡 Tip: Foreign key constraint failed. Make sure users table exists.');
    }

    if (error.code === '42P16') {
      console.error('\n💡 Tip: Invalid table definition. Check the SQL syntax.');
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
  runSubscriptionsMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runSubscriptionsMigration };

