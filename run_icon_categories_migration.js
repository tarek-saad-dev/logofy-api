const fs = require('fs');
const path = require('path');
const { getClient } = require('./api/config/database');
require('dotenv').config();

async function runIconCategoriesMigration() {
  console.log('🚀 Starting Icon Categories Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'api', 'config', 'migration_add_icon_categories.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if tables already exist
    console.log('🔍 Checking if icon_categories table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'icon_categories'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  icon_categories table already exists');
      console.log('   Migration will update existing schema (safe to run)\n');
    } else {
      console.log('✅ icon_categories table does not exist - will be created\n');
    }

    // Split SQL into individual statements (handle semicolons in PL/pgSQL functions)
    // For complex migrations with functions, execute the whole file
    console.log('🔄 Running migration...');
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully\n');

    // Verify tables were created
    console.log('🔍 Verifying migration...');
    const verifyTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('icon_categories', 'icon_category_assignments')
      ORDER BY table_name
    `);

    const createdTables = verifyTables.rows.map(row => row.table_name);
    
    if (createdTables.includes('icon_categories') && createdTables.includes('icon_category_assignments')) {
      console.log('✅ Migration verification successful:');
      console.log(`   - icon_categories table: ✅`);
      console.log(`   - icon_category_assignments table: ✅\n`);

      // Check sample data
      const categoryCount = await client.query('SELECT COUNT(*) as count FROM icon_categories');
      console.log(`📊 Sample categories created: ${categoryCount.rows[0].count}`);
      
      console.log('\n✅ Icon Categories Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Test endpoints: node test_all_icon_endpoints.js');
      console.log('   2. Start server: npm run dev\n');
    } else {
      console.log('⚠️  Warning: Some tables may not have been created');
      console.log(`   Found tables: ${createdTables.join(', ') || 'none'}`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    
    if (error.code === '42P01') {
      console.error('\n💡 Tip: Make sure the assets table exists before running this migration.');
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
  runIconCategoriesMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runIconCategoriesMigration };

