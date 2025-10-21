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

const migrateMultilingual = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting multilingual support migration...');
    
    // Test connection first
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../migrations/add_multilingual_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    console.log('✅ Multilingual support migration completed successfully!');
    
    // Verify the migration by checking if new columns exist
    const logoColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'logos' 
      AND column_name IN ('title_en', 'title_ar', 'description_en', 'description_ar', 'tags_en', 'tags_ar')
    `);
    
    const categoryColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      AND column_name IN ('name_en', 'name_ar', 'description_en', 'description_ar')
    `);
    
    const assetColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assets' 
      AND column_name IN ('name_en', 'name_ar', 'description_en', 'description_ar', 'tags_en', 'tags_ar')
    `);
    
    console.log(`✅ Added ${logoColumns.rows.length} multilingual columns to logos table`);
    console.log(`✅ Added ${categoryColumns.rows.length} multilingual columns to categories table`);
    console.log(`✅ Added ${assetColumns.rows.length} multilingual columns to assets table`);
    
    // Check if views were created
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name IN ('localized_logos', 'localized_categories', 'localized_assets', 'localized_templates')
    `);
    
    console.log(`✅ Created ${views.rows.length} localized views`);
    
    // Check if functions were created
    const functions = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('get_localized_text', 'get_localized_tags')
    `);
    
    console.log(`✅ Created ${functions.rows.length} localization functions`);
    
    console.log('🎉 Multilingual support migration completed successfully!');
    console.log('📝 You can now use English and Arabic for logos, categories, and assets');
    
  } catch (error) {
    console.error('❌ Multilingual migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateMultilingual()
    .then(() => {
      console.log('🎉 Multilingual migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateMultilingual };
