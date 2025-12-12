const { query, getClient } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runPlanTypeMigration() {
  console.log('🚀 Starting Plan Type Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_plan_type_to_subscriptions.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if column already exists
    console.log('🔍 Checking if plan_type column exists...');
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions'
        AND column_name = 'plan_type'
      ) as exists
    `);

    if (columnCheck.rows[0].exists) {
      console.log('⚠️  plan_type column already exists');
      console.log('   Migration will skip (safe to run)\n');
    } else {
      console.log('✅ plan_type column does not exist - will be created\n');
    }

    // Execute the migration
    console.log('🔄 Executing migration...\n');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');

    // Verify the column was created
    console.log('🔍 Verifying migration...');
    const verifyCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' 
      AND column_name = 'plan_type'
    `);

    if (verifyCheck.rows.length > 0) {
      const col = verifyCheck.rows[0];
      console.log(`✅ Verified: plan_type column exists`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}\n`);
    } else {
      console.log('⚠️  Warning: Could not verify plan_type column creation\n');
    }

    console.log('✅ Plan type migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   - Existing subscriptions will have plan_type = NULL');
    console.log('   - New subscriptions will automatically get plan_type from Stripe');
    console.log('   - You can manually update existing subscriptions if needed\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  runPlanTypeMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runPlanTypeMigration };
























