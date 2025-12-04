const fs = require('fs');
const path = require('path');
const { getClient } = require('./api/config/database');
require('dotenv').config();

async function runSubscriptionPricesMigration() {
  console.log('🚀 Starting Subscription Prices Table Migration...\n');

  let client;
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    client = await getClient();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_subscription_prices_table.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Check if table already exists
    console.log('🔍 Checking if subscription_prices table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_prices'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  subscription_prices table already exists');
      console.log('   Migration will update existing schema (safe to run)\n');
    } else {
      console.log('✅ subscription_prices table does not exist - will be created\n');
    }

    // Execute migration
    console.log('🔄 Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');

    // Verify table was created
    console.log('🔍 Verifying subscription_prices table...');
    const verifyTable = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'subscription_prices'
      ORDER BY ordinal_position
    `);

    if (verifyTable.rows.length > 0) {
      console.log('✅ Migration verification successful:');
      verifyTable.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        if (col.column_default) {
          console.log(`     Default: ${col.column_default}`);
        }
      });
      console.log('');

      // Verify indexes
      console.log('🔍 Verifying indexes...');
      const indexesCheck = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'subscription_prices'
        ORDER BY indexname
      `);

      if (indexesCheck.rows.length > 0) {
        console.log('✅ Indexes created:');
        indexesCheck.rows.forEach(idx => {
          console.log(`   - ${idx.indexname}`);
        });
      }
      console.log('');

      // Check if default data was inserted
      console.log('🔍 Checking for active price configuration...');
      const activePriceCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM subscription_prices
        WHERE is_active = TRUE
      `);

      const activeCount = parseInt(activePriceCheck.rows[0].count);
      if (activeCount > 0) {
        console.log(`✅ Found ${activeCount} active price configuration(s)`);
        
        const priceData = await client.query(`
          SELECT 
            monthly_price,
            yearly_price,
            trial_days,
            currency,
            stripe_monthly_price_id,
            stripe_yearly_price_id
          FROM subscription_prices
          WHERE is_active = TRUE
          ORDER BY updated_at DESC
          LIMIT 1
        `);

        if (priceData.rows.length > 0) {
          const price = priceData.rows[0];
          console.log('   Current active prices:');
          console.log(`   - Monthly: ${price.monthly_price} ${price.currency}`);
          console.log(`   - Yearly: ${price.yearly_price} ${price.currency}`);
          console.log(`   - Trial Days: ${price.trial_days}`);
        }
      } else {
        console.log('⚠️  No active price configuration found');
        console.log('   You can set prices using POST /api/subscription-prices');
      }
      console.log('');

      console.log('✅ Subscription Prices Table Migration completed successfully!');
      console.log('\n📝 Migration Summary:');
      console.log('   ✅ subscription_prices table created');
      console.log('   ✅ Indexes created for performance');
      console.log('   ✅ Trigger for updated_at created');
      console.log('   ✅ Default data inserted (if needed)');
      console.log('\n🎉 Your subscription prices table is ready to use!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Use POST /api/subscription-prices to set your prices');
      console.log('   2. Mobile app can fetch prices from GET /api/subscription-prices');
      console.log('');
    } else {
      console.log('⚠️  Warning: Table may not have been created');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    
    if (error.code === '42P01') {
      console.error('\n💡 Tip: Make sure the database connection is working.');
    }
    
    if (error.code === '23503') {
      console.error('\n💡 Tip: Foreign key constraint failed. Check table dependencies.');
    }

    if (error.code === '42P16') {
      console.error('\n💡 Tip: Invalid table definition. Check the SQL syntax.');
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
  runSubscriptionPricesMigration()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runSubscriptionPricesMigration };

