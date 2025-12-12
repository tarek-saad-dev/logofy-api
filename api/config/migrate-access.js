const { query } = require('./database');

/**
 * Migration script to create access table
 */
async function migrateAccess() {
    try {
        console.log('🔄 Starting access table migration...');

        // Check if access table already exists
        const checkTable = await query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'access'
            );
        `);

        if (checkTable.rows[0].exists) {
            console.log('✅ access table already exists');
            return;
        }

        // Create access table
        console.log('📝 Creating access table...');
        await query(`
            CREATE TABLE IF NOT EXISTS access (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                value BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // Create index for better performance
        console.log('📝 Creating indexes...');
        await query(`CREATE INDEX idx_access_created_at ON access(created_at DESC);`);

        // Create trigger to update updated_at timestamp
        console.log('📝 Creating updated_at trigger...');
        
        // Create the function if it doesn't exist
        await query(`
            CREATE OR REPLACE FUNCTION update_access_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create the trigger
        await query(`
            DROP TRIGGER IF EXISTS update_access_updated_at_trigger ON access;
            CREATE TRIGGER update_access_updated_at_trigger
            BEFORE UPDATE ON access
            FOR EACH ROW
            EXECUTE FUNCTION update_access_updated_at();
        `);

        console.log('✅ access table created successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateAccess()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateAccess };

