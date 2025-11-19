const axios = require('axios');
const { query } = require('./api/config/database');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER_ID = process.env.TEST_USER_ID || null;
const TEST_TOKEN = process.env.TEST_TOKEN || null;

// Helper function to make requests
async function request(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: error.response?.status || 500,
      data: error.response?.data || { message: error.message },
    };
  }
}

// Test helper
function test(name, fn) {
  return async () => {
    try {
      process.stdout.write(`\n🧪 ${name}... `);
      await fn();
      console.log('✅ PASS');
    } catch (error) {
      console.log(`❌ FAIL`);
      console.log(`   Error: ${error.message}`);
      throw error;
    }
  };
}

async function checkDatabaseSubscription(userId) {
  try {
    const result = await query(
      `SELECT id, stripe_customer_id, stripe_sub_id, status, current_period_end, canceled_at
       FROM subscriptions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}

async function checkDatabaseTier(userId) {
  try {
    const result = await query(
      `SELECT tier, tier_expires_at FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}

async function runTests() {
  console.log('🔍 Entitlement Verification Test');
  console.log('='.repeat(60));

  if (!TEST_USER_ID || !TEST_TOKEN) {
    console.error('❌ Missing TEST_USER_ID or TEST_TOKEN environment variables');
    console.log('\n💡 Run test_billing_flow.js first to get these values');
    console.log('   Or set them manually:');
    console.log('   export TEST_USER_ID="your-user-id"');
    console.log('   export TEST_TOKEN="your-jwt-token"');
    process.exit(1);
  }

  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👤 User ID: ${TEST_USER_ID}\n`);

  try {
    // Test 1: Check database subscription
    await test('Check subscription in database', async () => {
      const subscription = await checkDatabaseSubscription(TEST_USER_ID);

      if (!subscription) {
        console.log(`\n   ⚠️  No subscription found in database`);
        console.log(`   ℹ️  This is expected if webhook hasn't been processed yet`);
        return;
      }

      console.log(`\n   ✅ Subscription found:`);
      console.log(`      - ID: ${subscription.id}`);
      console.log(`      - Stripe Customer: ${subscription.stripe_customer_id}`);
      console.log(`      - Stripe Subscription: ${subscription.stripe_sub_id}`);
      console.log(`      - Status: ${subscription.status}`);
      console.log(`      - Period End: ${subscription.current_period_end}`);
      console.log(`      - Canceled At: ${subscription.canceled_at || 'N/A'}`);

      if (subscription.status === 'active' || subscription.status === 'trialing') {
        const periodEnd = new Date(subscription.current_period_end);
        const now = new Date();
        if (periodEnd > now) {
          console.log(`      ✅ Subscription is active and valid`);
        } else {
          console.log(`      ⚠️  Subscription period has expired`);
        }
      }
    })();

    // Test 2: Check manual trial
    await test('Check manual trial in database', async () => {
      const userTier = await checkDatabaseTier(TEST_USER_ID);

      if (!userTier) {
        console.log(`\n   ⚠️  User not found or tier columns not set`);
        return;
      }

      console.log(`\n   ✅ User tier data:`);
      console.log(`      - Tier: ${userTier.tier || 'NULL'}`);
      console.log(`      - Tier Expires At: ${userTier.tier_expires_at || 'NULL'}`);

      if (userTier.tier === 'trial' && userTier.tier_expires_at) {
        const expiresAt = new Date(userTier.tier_expires_at);
        const now = new Date();
        if (expiresAt > now) {
          console.log(`      ✅ Manual trial is active`);
        } else {
          console.log(`      ⚠️  Manual trial has expired`);
        }
      }
    })();

    // Test 3: Test entitlement service directly
    await test('Test entitlement service directly', async () => {
      const { getEntitlementForUser } = require('./api/services/entitlementService');
      const entitlement = await getEntitlementForUser(TEST_USER_ID);

      console.log(`\n   ✅ Entitlement: ${entitlement}`);

      if (entitlement === 'pro') {
        console.log(`      ✅ User has PRO access (Stripe subscription active)`);
      } else if (entitlement === 'trial') {
        console.log(`      ✅ User has TRIAL access (manual trial active)`);
      } else {
        console.log(`      ℹ️  User has GUEST access (no active subscription or trial)`);
      }
    })();

    // Test 4: Test entitlement via middleware (if you have a test endpoint)
    console.log('\n' + '='.repeat(60));
    console.log('📋 Expected Entitlement Logic:');
    console.log('='.repeat(60));
    console.log('\n1. Check subscriptions table:');
    console.log('   - status IN (\'active\', \'trialing\')');
    console.log('   - current_period_end > NOW()');
    console.log('   → If found: return \'pro\'');
    console.log('\n2. Check users.tier:');
    console.log('   - tier = \'trial\'');
    console.log('   - tier_expires_at > NOW()');
    console.log('   → If found: return \'trial\'');
    console.log('\n3. Default:');
    console.log('   → return \'guest\'');
    console.log('\n' + '='.repeat(60));

    console.log('\n✅ Entitlement verification completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ All checks completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };

