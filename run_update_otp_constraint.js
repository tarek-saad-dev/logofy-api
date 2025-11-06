const { getClient } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runUpdateOTPConstraint() {
  console.log('🚀 Starting OTP Constraint Update Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'api', 'config', 'migration_update_otp_type_constraint.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check current constraint
    console.log('🔍 Checking current constraint...');
    const constraintCheck = await client.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'chk_otp_type'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('📋 Current constraint:', constraintCheck.rows[0].check_clause);
    } else {
      console.log('⚠️  Constraint not found - will be created');
    }
    console.log('');

    // Execute migration
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');

    // Verify constraint was updated
    console.log('🔍 Verifying constraint update...');
    const verifyConstraint = await client.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'chk_otp_type'
    `);

    if (verifyConstraint.rows.length > 0) {
      console.log('✅ Constraint updated successfully');
      console.log('📋 New constraint:', verifyConstraint.rows[0].check_clause);
      console.log('\n✅ Migration completed successfully!');
      console.log('   The otp_codes table now supports: login, reset_password, and register types');
    } else {
      console.log('⚠️  Warning: Could not verify constraint update');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('\n📡 Database connection closed');
    }
  }
}

// Run migration
runUpdateOTPConstraint()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

