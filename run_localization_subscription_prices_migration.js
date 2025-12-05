const { query, getClient } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runLocalizationSubscriptionPricesMigration() {
    console.log('🚀 Starting Localization Subscription Prices Migration...\n');

    let client;
    try {
        // Test database connection
        console.log('📡 Testing database connection...');
        client = await getClient();
        await client.query('SELECT 1');
        console.log('✅ Database connection successful\n');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'add_localization_to_subscription_prices.sql');
        console.log(`📄 Reading migration file: ${migrationPath}`);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Migration file loaded\n');

        // Check if Arabic price columns already exist
        console.log('🔍 Checking if Arabic price columns exist...');
        const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_prices'
        AND column_name = 'weekly_price_ar'
      ) as weekly_ar_exists,
      EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_prices'
        AND column_name = 'monthly_price_ar'
      ) as monthly_ar_exists,
      EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_prices'
        AND column_name = 'yearly_price_ar'
      ) as yearly_ar_exists
    `);

        const weeklyArExists = columnCheck.rows[0].weekly_ar_exists;
        const monthlyArExists = columnCheck.rows[0].monthly_ar_exists;
        const yearlyArExists = columnCheck.rows[0].yearly_ar_exists;

        if (weeklyArExists && monthlyArExists && yearlyArExists) {
            console.log('⚠️  Arabic price columns already exist');
        } else {
            if (!weeklyArExists) {
                console.log('✅ weekly_price_ar column does not exist - will be created');
            }
            if (!monthlyArExists) {
                console.log('✅ monthly_price_ar column does not exist - will be created');
            }
            if (!yearlyArExists) {
                console.log('✅ yearly_price_ar column does not exist - will be created');
            }
        }

        // Check if plan_types table exists
        console.log('\n🔍 Checking if plan_types table exists...');
        const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'plan_types'
      ) as table_exists
    `);

        if (tableCheck.rows[0].table_exists) {
            console.log('⚠️  plan_types table already exists');
            console.log('   Migration will update existing schema (safe to run)\n');
        } else {
            console.log('✅ plan_types table does not exist - will be created\n');
        }

        // Execute the migration
        console.log('🔄 Executing migration...\n');
        await client.query(migrationSQL);
        console.log('✅ Migration executed successfully\n');

        // Verify the columns were created
        console.log('🔍 Verifying migration...');
        const verifyColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'subscription_prices' 
      AND column_name IN ('weekly_price_ar', 'monthly_price_ar', 'yearly_price_ar')
      ORDER BY column_name
    `);

        if (verifyColumns.rows.length > 0) {
            console.log(`✅ Verified: ${verifyColumns.rows.length} Arabic price column(s) exist:`);
            verifyColumns.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        } else {
            console.log('⚠️  Warning: Could not verify Arabic price columns creation');
        }

        // Verify plan_types table
        const verifyTable = await client.query(`
      SELECT COUNT(*) as count
      FROM plan_types
    `);

        if (verifyTable.rows.length > 0) {
            const count = verifyTable.rows[0].count;
            console.log(`✅ Verified: plan_types table exists with ${count} plan type(s)\n`);
        } else {
            console.log('⚠️  Warning: Could not verify plan_types table\n');
        }

        console.log('✅ Localization migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   - The subscription_prices table now supports Arabic prices');
        console.log('   - Plan types (Pro, Guest, Trial) are stored in both English and Arabic');
        console.log('   - GET /api/subscription-prices?lang=ar will return Arabic prices');
        console.log('   - POST /api/subscription-prices accepts weekly_price_ar, monthly_price_ar, yearly_price_ar');
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
    runLocalizationSubscriptionPricesMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { runLocalizationSubscriptionPricesMigration };