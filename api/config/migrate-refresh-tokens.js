const { query } = require('./database');

/**
 * Migration script to create refresh_tokens table
 */
async function migrateRefreshTokens() {
    try {
        console.log('🔄 Starting refresh tokens migration...');

        // Check if refresh_tokens table already exists
        const checkTable = await query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'refresh_tokens'
            );
        `);

        if (checkTable.rows[0].exists) {
            console.log('✅ refresh_tokens table already exists');
            return;
        }

        // Create refresh_tokens table
        console.log('📝 Creating refresh_tokens table...');
        await query(`
            CREATE TABLE refresh_tokens (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                revoked BOOLEAN DEFAULT FALSE,
                CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) 
                    REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        // Create indexes for better performance
        await query(`
            CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
            CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
            CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
        `);

        console.log('✅ refresh_tokens table created successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateRefreshTokens()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateRefreshTokens };

