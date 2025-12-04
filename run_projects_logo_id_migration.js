const { query } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

async function runProjectsLogoIdMigration() {
    try {
        console.log('🔄 Starting migration: Add logo_id to projects table...');
        
        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'api/config/migration_add_logo_id_to_projects.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration
        await query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('📝 Added logo_id column to projects table');
        console.log('📝 Created index on logo_id');
        console.log('');
        console.log('Next steps:');
        console.log('1. Update existing projects to link them to logos (if needed)');
        console.log('2. When creating new projects, include logo_id in the request body');
        console.log('3. Projects will now automatically get thumbnails from linked logos');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runProjectsLogoIdMigration();

