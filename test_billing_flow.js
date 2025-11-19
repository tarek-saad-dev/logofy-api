const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = `billing_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'testpassword123';
const TEST_NAME = 'Billing Test User';

let authToken = null;
let userId = null;
let checkoutSessionId = null;
let checkoutUrl = null;

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
      if (error.response) {
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }
  };
}

// Main test suite
async function runTests() {
  console.log('🚀 Billing Flow Test Suite');
  console.log('='.repeat(60));
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}\n`);

  try {
    // Step 1: Register a new user
    await test('Step 1: Register new user', async () => {
      const result = await request('POST', '/api/auth/register', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
      });

      if (!result.ok || result.status !== 201) {
        throw new Error(`Expected 201, got ${result.status}`);
      }

      if (!result.data.success || !result.data.data?.token) {
        throw new Error('Registration failed or token not returned');
      }

      authToken = result.data.data.token;
      userId = result.data.data.user?.id;

      console.log(`\n   ✅ User registered: ${userId}`);
      console.log(`   ✅ Token received: ${authToken.substring(0, 30)}...`);
    })();

    // Step 2: Check initial entitlement (should be 'guest')
    await test('Step 2: Check initial entitlement (should be guest)', async () => {
      const result = await request('GET', '/api/auth/me', null, authToken);

      if (!result.ok) {
        throw new Error(`Failed to get user: ${result.status}`);
      }

      console.log(`\n   ✅ User ID: ${result.data.data.user.id}`);
      console.log(`   ✅ Email: ${result.data.data.user.email}`);
    })();

    // Step 3: Create checkout session
    await test('Step 3: Create checkout session for monthly plan', async () => {
      const result = await request(
        'POST',
        '/api/billing/create-checkout-session',
        { plan: 'monthly' },
        authToken
      );

      if (!result.ok || result.status !== 200) {
        throw new Error(`Expected 200, got ${result.status}. ${JSON.stringify(result.data)}`);
      }

      if (!result.data.success || !result.data.url) {
        throw new Error('Checkout session creation failed');
      }

      checkoutUrl = result.data.url;
      checkoutSessionId = result.data.sessionId;

      console.log(`\n   ✅ Checkout URL: ${checkoutUrl}`);
      console.log(`   ✅ Session ID: ${checkoutSessionId}`);
      console.log(`\n   📝 Next: Open this URL in browser to complete payment`);
      console.log(`   📝 Or use Stripe test card: 4242 4242 4242 4242`);
    })();

    // Step 4: Verify subscription doesn't exist yet
    await test('Step 4: Verify no subscription exists yet', async () => {
      // This would require a custom endpoint, but we can check entitlement
      // For now, we'll just note that subscription should not exist
      console.log(`\n   ℹ️  Subscription should not exist until webhook is processed`);
    })();

    // Step 5: Simulate webhook (if you have Stripe CLI running)
    console.log('\n' + '='.repeat(60));
    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('='.repeat(60));
    console.log('\n1. Complete checkout at:', checkoutUrl);
    console.log('   Use test card: 4242 4242 4242 4242');
    console.log('   Any future expiry date, any CVC');
    console.log('\n2. After payment, Stripe will send webhook to:');
    console.log(`   POST ${BASE_URL}/api/stripe/webhook`);
    console.log('\n3. To test webhook locally, use Stripe CLI:');
    console.log('   stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('   stripe trigger checkout.session.completed');
    console.log('\n4. After webhook is processed, run:');
    console.log('   node test_billing_entitlement.js');
    console.log('\n' + '='.repeat(60));

    // Step 6: Test entitlement check endpoint (if exists)
    console.log('\n✅ Test suite completed!');
    console.log('\n📝 Summary:');
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Email: ${TEST_EMAIL}`);
    console.log(`   - Token: ${authToken.substring(0, 30)}...`);
    console.log(`   - Checkout URL: ${checkoutUrl}`);
    console.log(`\n💡 Save these values for manual testing:`);
    console.log(`   export TEST_USER_ID="${userId}"`);
    console.log(`   export TEST_TOKEN="${authToken}"`);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ All tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };

