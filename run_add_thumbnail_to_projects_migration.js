const fs = require('fs');
const path = require('path');
const { getClient } = require('./api/config/database');
require('dotenv').config();

async function runAddThumbnailToProjectsMigration() {
  console.log('🚀 Starting Add Thumbnail URL to Projects Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_thumbnail_url_to_projects.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if column already exists
    console.log('🔍 Checking if thumbnail_url column exists...');
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
        AND column_name = 'thumbnail_url'
      ) as exists
    `);

    if (columnCheck.rows[0].exists) {
      console.log('⚠️  thumbnail_url column already exists');
      console.log('   Migration will continue (safe to run)\n');
    } else {
      console.log('✅ thumbnail_url column does not exist - will be created\n');
    }

    // Execute migration
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');

    // Verify column was created
    console.log('🔍 Verifying thumbnail_url column...');
    const verifyColumn = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      AND column_name = 'thumbnail_url'
    `);

    if (verifyColumn.rows.length > 0) {
      const col = verifyColumn.rows[0];
      console.log('✅ Migration verification successful:');
      console.log(`   - Column: ${col.column_name}`);
      console.log(`   - Type: ${col.data_type}`);
      console.log(`   - Nullable: ${col.is_nullable}`);
      console.log('');
    } else {
      console.log('⚠️  Warning: Column may not have been created');
    }

    console.log('✅ Add Thumbnail URL to Projects Migration completed successfully!');
    console.log('\n📝 Migration Summary:');
    console.log('   ✅ thumbnail_url column added to projects table');
    console.log('   ✅ Column is nullable (projects can use logo thumbnail as fallback)');
    console.log('\n🎉 Your projects table now supports project-specific thumbnails!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Use PATCH /api/projects/:id/thumbnail to set project thumbnails');
    console.log('   2. GET endpoints will use project thumbnail if available, otherwise logo thumbnail');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    
    if (error.code === '42P01') {
      console.error('\n💡 Tip: Make sure the projects table exists.');
    }
    
    if (error.code === '42703') {
      console.error('\n💡 Tip: Column may already exist or table structure is different.');
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
  runAddThumbnailToProjectsMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAddThumbnailToProjectsMigration };

