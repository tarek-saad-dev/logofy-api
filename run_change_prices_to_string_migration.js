const { query, getClient } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runChangePricesToStringMigration() {
    console.log('🚀 Starting Change Prices to String Migration...\n');

    let client;
    try {
        // Test database connection
        console.log('📡 Testing database connection...');
        client = await getClient();
        await client.query('SELECT 1');
        console.log('✅ Database connection successful\n');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'change_prices_to_string.sql');
        console.log(`📄 Reading migration file: ${migrationPath}`);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Migration file loaded\n');

        // Check current column types
        console.log('🔍 Checking current price column types...');
        const columnCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'subscription_prices' 
      AND column_name IN ('weekly_price', 'weekly_price_ar', 'monthly_price', 'monthly_price_ar', 'yearly_price', 'yearly_price_ar')
      ORDER BY column_name
    `);

        if (columnCheck.rows.length > 0) {
            console.log('📊 Current column types:');
            columnCheck.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type}`);
            });
            console.log('');
        }

        // Execute the migration
        console.log('🔄 Executing migration...');
        console.log('   Converting DECIMAL columns to VARCHAR (STRING)...\n');
        await client.query(migrationSQL);
        console.log('✅ Migration executed successfully\n');

        // Verify the columns were changed
        console.log('🔍 Verifying migration...');
        const verifyColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'subscription_prices' 
      AND column_name IN ('weekly_price', 'weekly_price_ar', 'monthly_price', 'monthly_price_ar', 'yearly_price', 'yearly_price_ar')
      ORDER BY column_name
    `);

        if (verifyColumns.rows.length > 0) {
            console.log(`✅ Verified: ${verifyColumns.rows.length} price column(s) converted to VARCHAR:`);
            verifyColumns.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type}`);
            });
            console.log('');
        } else {
            console.log('⚠️  Warning: Could not verify price columns conversion\n');
        }

        console.log('✅ Change prices to string migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   - All price columns now store values as strings (VARCHAR)');
        console.log('   - GET /api/subscription-prices returns prices as strings');
        console.log('   - POST /api/subscription-prices accepts prices as strings');
        console.log('   - Example: "24.99" instead of 24.99');
        console.log('');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (client) {
            await client.end();
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    runChangePricesToStringMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { runChangePricesToStringMigration };