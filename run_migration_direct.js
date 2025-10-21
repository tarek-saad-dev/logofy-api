const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Starting database migration to add multilingual columns...');
  
  const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_mj0vF7tNwHLC@ep-noisy-credit-ada72zje-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📊 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');

    console.log('🔧 Reading migration SQL file...');
    const sqlContent = fs.readFileSync('database_migration_add_multilingual_columns.sql', 'utf8');
    
    console.log('🔧 Executing migration SQL...');
    await pool.query(sqlContent);

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
    console.log('4. Update the connection string if needed');
  } finally {
    await pool.end();
  }
}

runMigration();
