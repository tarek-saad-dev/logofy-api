const { query } = require('./database');

/**
 * Migration script to add authentication fields to users table
 */
async function migrateAuth() {
    try {
        console.log('🔐 Starting authentication migration...');

        // Check if password_hash column already exists
        const checkPasswordColumn = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'password_hash';
        `);

        // Check if display_name column exists
        const checkDisplayNameColumn = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'display_name';
        `);

        // Add password_hash column if it doesn't exist
        if (checkPasswordColumn.rows.length === 0) {
            console.log('📝 Adding password_hash column to users table...');
            await query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS password_hash TEXT;
            `);
            console.log('✅ password_hash column added');
        } else {
            console.log('✅ password_hash column already exists');
        }

        // Add display_name column if it doesn't exist
        if (checkDisplayNameColumn.rows.length === 0) {
            console.log('📝 Adding display_name column to users table...');
            await query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS display_name TEXT;
            `);
            console.log('✅ display_name column added');
        } else {
            console.log('✅ display_name column already exists');
        }

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