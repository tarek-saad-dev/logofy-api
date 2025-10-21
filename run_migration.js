const { Pool } = require('pg');

async function runMigration() {
  console.log('🚀 Starting database migration to add multilingual columns...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'logo_maker',
    user: 'postgres',
    password: 'password' // Update this with your actual password
  });

  try {
    console.log('📊 Checking database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');

    console.log('🔧 Executing migration SQL...');
    
    // Add multilingual columns
    await pool.query(`
      ALTER TABLE logos 
      ADD COLUMN IF NOT EXISTS title_en VARCHAR(255),
      ADD COLUMN IF NOT EXISTS title_ar VARCHAR(255),
      ADD COLUMN IF NOT EXISTS description_en TEXT,
      ADD COLUMN IF NOT EXISTS description_ar TEXT,
      ADD COLUMN IF NOT EXISTS tags_en JSONB,
      ADD COLUMN IF NOT EXISTS tags_ar JSONB;
    `);

    // Add indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_logos_title_en ON logos(title_en);
      CREATE INDEX IF NOT EXISTS idx_logos_title_ar ON logos(title_ar);
      CREATE INDEX IF NOT EXISTS idx_logos_description_en ON logos(description_en);
      CREATE INDEX IF NOT EXISTS idx_logos_description_ar ON logos(description_ar);
    `);

    // Update existing records
    await pool.query(`
      UPDATE logos 
      SET 
          title_en = COALESCE(title_en, title),
          title_ar = COALESCE(title_ar, title),
          description_en = COALESCE(description_en, description),
          description_ar = COALESCE(description_ar, description),
          tags_en = COALESCE(tags_en, tags),
          tags_ar = COALESCE(tags_ar, tags)
      WHERE title_en IS NULL OR title_ar IS NULL OR description_en IS NULL OR description_ar IS NULL;
    `);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Added columns:');
    console.log('   - title_en (VARCHAR)');
    console.log('   - title_ar (VARCHAR)'); 
    console.log('   - description_en (TEXT)');
    console.log('   - description_ar (TEXT)');
    console.log('   - tags_en (JSONB)');
    console.log('   - tags_ar (JSONB)');
    console.log('');
    console.log('🎯 The API now supports full multilingual functionality!');
    console.log('   - English and Arabic titles');
    console.log('   - English and Arabic descriptions');
    console.log('   - English and Arabic tags');
    console.log('   - RTL support for Arabic content');

    // Verify the migration
    console.log('');
    console.log('🧪 Testing the migration...');
    const result = await pool.query(`
      SELECT 
          column_name, 
          data_type, 
          is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'logos' 
      AND column_name IN ('title_en', 'title_ar', 'description_en', 'description_ar', 'tags_en', 'tags_ar')
      ORDER BY column_name;
    `);

    console.log('📊 Migration verification:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    console.log('');
    console.log('🎉 Migration completed! Your API now supports full multilingual features.');

  } catch (error) {
    console.error('❌ Migration failed!');
    console.error('Error:', error.message);
    console.log('');
    console.log('Please check:');
    console.log('1. PostgreSQL is running');
    console.log('2. Database "logo_maker" exists');
    console.log('3. User has proper permissions');
    console.log('4. Update the password in this script if needed');
  } finally {
    await pool.end();
  }
}

runMigration();
