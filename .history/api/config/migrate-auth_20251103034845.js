const { query } = require('./database');

/**
 * Migration script to add authentication fields to users table
 */
async function migrateAuth() {
  try {
    console.log('🔐 Starting authentication migration...');

    // Check if password column already exists
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Password column already exists. Skipping migration.');
      return;
    }

    // Add password_hash column to users table
    console.log('📝 Adding password_hash column to users table...');
    await query(`
      ALTER TABLE users 
      ADD COLUMN password_hash TEXT;
    `);

    console.log('✅ Authentication migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAuth()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAuth };

