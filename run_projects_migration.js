const fs = require('fs');
const path = require('path');
const { getClient } = require('./api/config/database');
require('dotenv').config();

async function runProjectsMigration() {
  console.log('🚀 Starting Projects Table Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'api', 'config', 'migration_add_projects_table.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if table already exists
    console.log('🔍 Checking if projects table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  projects table already exists');
      console.log('   Migration will update existing schema (safe to run)\n');
    } else {
      console.log('✅ projects table does not exist - will be created\n');
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

    // Verify table was created
    console.log('🔍 Verifying migration...');
    const verifyTable = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects'
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
        WHERE tablename = 'projects'
        ORDER BY indexname
      `);

      if (indexesCheck.rows.length > 0) {
        console.log('✅ Indexes created:');
        indexesCheck.rows.forEach(idx => {
          console.log(`   - ${idx.indexname}`);
        });
      }
      console.log('');

      // Verify trigger
      console.log('🔍 Verifying trigger...');
      const triggerCheck = await client.query(`
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE event_object_table = 'projects'
      `);

      if (triggerCheck.rows.length > 0) {
        console.log('✅ Triggers created:');
        triggerCheck.rows.forEach(trg => {
          console.log(`   - ${trg.trigger_name} (${trg.event_manipulation})`);
        });
      }
      console.log('');

      console.log('✅ Projects Table Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Test project endpoints with: node test_projects_endpoints.js');
      console.log('   2. Use Postman collection to test CRUD operations\n');
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
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runProjectsMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runProjectsMigration };

