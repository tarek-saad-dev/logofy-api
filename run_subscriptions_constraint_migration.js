const fs = require('fs');
const path = require('path');
const { getClient } = require('./api/config/database');
require('dotenv').config();

async function runSubscriptionsConstraintMigration() {
  console.log('🚀 Starting Subscriptions UNIQUE Constraint Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_subscriptions_unique_constraint.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if constraint already exists
    console.log('🔍 Checking if UNIQUE constraint exists...');
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'subscriptions' 
      AND constraint_name = 'subscriptions_stripe_sub_id_key'
      AND constraint_type = 'UNIQUE'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('⚠️  UNIQUE constraint already exists');
      console.log('   Migration will skip (safe to run)\n');
    } else {
      console.log('✅ UNIQUE constraint does not exist - will be created\n');
    }

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

    // Execute migration
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');

    // Verify constraint was created
    console.log('🔍 Verifying UNIQUE constraint...');
    const verifyConstraint = await client.query(`
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'subscriptions' 
      AND constraint_name = 'subscriptions_stripe_sub_id_key'
    `);

    if (verifyConstraint.rows.length > 0) {
      console.log('✅ UNIQUE constraint created successfully:');
      verifyConstraint.rows.forEach(row => {
        console.log(`   - ${row.constraint_name} (${row.constraint_type})`);
      });
      console.log('');

      // Check for any duplicate stripe_sub_id values (should be none)
      console.log('🔍 Checking for duplicate stripe_sub_id values...');
      const duplicateCheck = await client.query(`
        SELECT stripe_sub_id, COUNT(*) as count
        FROM subscriptions
        GROUP BY stripe_sub_id
        HAVING COUNT(*) > 1
      `);

      if (duplicateCheck.rows.length > 0) {
        console.log('⚠️  Warning: Found duplicate stripe_sub_id values:');
        duplicateCheck.rows.forEach(row => {
          console.log(`   - ${row.stripe_sub_id}: ${row.count} occurrences`);
        });
        console.log('   You may need to clean up duplicates before the constraint can be applied.');
      } else {
        console.log('✅ No duplicate stripe_sub_id values found');
      }
      console.log('');

      console.log('✅ Subscriptions UNIQUE Constraint Migration completed successfully!');
      console.log('\n📝 Migration Summary:');
      console.log('   ✅ UNIQUE constraint on stripe_sub_id created');
      console.log('   ✅ ON CONFLICT (stripe_sub_id) queries will now work');
      console.log('\n🎉 Your subscriptions table is ready for upsert operations!\n');
    } else {
      console.log('⚠️  Warning: Constraint may not have been created');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    
    if (error.code === '23505') {
      console.error('\n💡 Tip: Duplicate stripe_sub_id values found. Clean up duplicates first.');
    }
    
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
  runSubscriptionsConstraintMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runSubscriptionsConstraintMigration };

