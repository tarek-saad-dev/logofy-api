const { query, getClient } = require('./database');

/**
 * Migration script to recreate users table with proper schema for authentication
 * This will drop the existing table and create a new one with correct columns
 */
async function recreateUsersTable() {
    const client = await getClient();
    
    try {
        console.log('🔄 Starting users table recreation...');

        // Start transaction
        await client.query('BEGIN');

        // Step 1: Drop existing table (CASCADE to handle foreign keys)
        console.log('🗑️  Dropping existing users table...');
        try {
            await client.query('DROP TABLE IF EXISTS users CASCADE');
            console.log('✅ Old users table dropped');
        } catch (error) {
            console.warn('⚠️  Warning dropping table:', error.message);
        }

        // Step 2: Create new users table with proper schema
        console.log('📝 Creating new users table...');
        await client.query(`
            CREATE TABLE users (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email           TEXT UNIQUE NOT NULL,
                name            TEXT,
                display_name    TEXT,
                avatar_url      TEXT,
                password_hash   TEXT,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        // Step 3: Create indexes for performance
        console.log('📊 Creating indexes...');
        await client.query(`
            CREATE INDEX idx_users_email ON users(email);
            CREATE INDEX idx_users_created_at ON users(created_at DESC);
        `);

        // Step 4: Create trigger for updated_at
        console.log('⚙️  Creating updated_at trigger...');
        
        // First create the function if it doesn't exist
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Create trigger
        await client.query(`
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        // Commit transaction
        await client.query('COMMIT');
        
        console.log('✅ Users table recreated successfully!');
        console.log('');
        console.log('📋 Table schema:');
        console.log('   - id (UUID, PRIMARY KEY)');
        console.log('   - email (TEXT, UNIQUE, NOT NULL)');
        console.log('   - name (TEXT, nullable)');
        console.log('   - display_name (TEXT, nullable)');
        console.log('   - avatar_url (TEXT, nullable)');
        console.log('   - password_hash (TEXT, nullable)');
        console.log('   - created_at (TIMESTAMPTZ, NOT NULL)');
        console.log('   - updated_at (TIMESTAMPTZ, NOT NULL)');
        console.log('');
        console.log('✅ Ready for authentication!');

    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('❌ Error recreating users table:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Run migration if called directly
if (require.main === module) {
    recreateUsersTable()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { recreateUsersTable };

