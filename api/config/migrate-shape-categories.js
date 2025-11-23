const { query, getClient } = require('./database');
const fs = require('fs');
const path = require('path');

/**
 * Migration function to create shape_categories and shape_category_assignments tables
 * This function is idempotent - it can be run multiple times safely
 */
async function migrateShapeCategories() {
  let client;
  try {
    console.log('🔄 Starting shape categories migration...');
    
    // Get a client for transaction support
    client = await getClient();
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'migration_add_shape_categories.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Check if shape_categories table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'shape_categories'
      ) as exists
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✅ shape_categories table already exists');
      console.log('✅ shape_category_assignments table already exists');
      client.release();
      return;
    }
    
    console.log('📝 Creating shape_categories and shape_category_assignments tables...');
    
    // Execute the entire migration SQL file
    // PostgreSQL can handle multiple statements including PL/pgSQL functions
    await client.query(migrationSQL);
    
    console.log('✅ shape_categories table created successfully!');
    console.log('✅ shape_category_assignments table created successfully!');
    console.log('✅ Indexes and constraints created successfully!');
    
    client.release();
  } catch (error) {
    if (client) {
      client.release();
    }
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

module.exports = { migrateShapeCategories };

