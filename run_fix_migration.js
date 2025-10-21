const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const executeFixMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Database Fix Migration...');
    
    // Test connection first
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Read the migration file
    const migrationFile = path.join(__dirname, 'fix_database_issues.sql');
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    console.log('📄 Migration file loaded');
    
    // Execute the migration
    console.log('🔄 Executing database fix migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Database fix migration completed successfully!');
    console.log('');
    console.log('🎉 All database issues have been resolved:');
    console.log('   • Fixed layer_type enum to accept "text" values');
    console.log('   • Added missing underline column to layer_text table');
    console.log('   • Added multilingual columns to all tables');
    console.log('   • Created performance indexes');
    console.log('   • Updated existing data for backward compatibility');
    console.log('   • Created localization helper functions');
    console.log('');
    console.log('🚀 Your logo maker API should now work without database errors!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// Run the migration
executeFixMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

