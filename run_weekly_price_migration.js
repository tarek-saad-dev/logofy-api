const { query, getClient } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runWeeklyPriceMigration() {
    console.log('🚀 Starting Weekly Price Migration...\n');

    let client;
    try {
        // Test database connection
        console.log('📡 Testing database connection...');
        client = await getClient();
        await client.query('SELECT 1');
        console.log('✅ Database connection successful\n');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'add_weekly_price_to_subscription_prices.sql');
        console.log(`📄 Reading migration file: ${migrationPath}`);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Migration file loaded\n');

        // Check if columns already exist
        console.log('🔍 Checking if weekly_price columns exist...');
        const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_prices'
        AND column_name = 'weekly_price'
      ) as weekly_exists,
      EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_prices'
        AND column_name = 'stripe_weekly_price_id'
      ) as stripe_weekly_exists
    `);

        const weeklyExists = columnCheck.rows[0].weekly_exists;
        const stripeWeeklyExists = columnCheck.rows[0].stripe_weekly_exists;

        if (weeklyExists && stripeWeeklyExists) {
            console.log('⚠️  weekly_price columns already exist');
            console.log('   Migration will skip (safe to run)\n');
        } else {
            if (!weeklyExists) {
                console.log('✅ weekly_price column does not exist - will be created');
            }
            if (!stripeWeeklyExists) {
                console.log('✅ stripe_weekly_price_id column does not exist - will be created');
            }
            console.log('');
        }

        // Execute the migration
        console.log('🔄 Executing migration...\n');
        await client.query(migrationSQL);
        console.log('✅ Migration executed successfully\n');

        // Verify the columns were created
        console.log('🔍 Verifying migration...');
        const verifyCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'subscription_prices' 
      AND column_name IN ('weekly_price', 'stripe_weekly_price_id')
      ORDER BY column_name
    `);

        if (verifyCheck.rows.length > 0) {
            console.log(`✅ Verified: ${verifyCheck.rows.length} column(s) exist:`);
            verifyCheck.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
            console.log('');
        } else {
            console.log('⚠️  Warning: Could not verify weekly_price columns creation\n');
        }

        console.log('✅ Weekly price migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   - The subscription_prices table now supports weekly pricing');
        console.log('   - You can update prices via POST /api/subscription-prices');
        console.log('   - GET /api/subscription-prices will return weekly, monthly, and yearly prices');
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
    runWeeklyPriceMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { runWeeklyPriceMigration };
