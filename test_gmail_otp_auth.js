const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testing: ${name}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
  results.passed++;
}

function logError(message, error = null) {
  log(`✗ ${message}`, 'red');
  results.failed++;
  if (error) {
    results.errors.push({ message, error: error.message || error });
    log(`  Error: ${error.message || JSON.stringify(error)}`, 'red');
  }
}

async function makeRequest(method, url, data = null, params = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${API_PREFIX}${url}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    };

    if (data) config.data = data;
    if (params) config.params = params;

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: `Connection refused - Server may not be running at ${BASE_URL}`,
        status: 0
      };
    }
    return {
      success: false,
      error: error.response?.data || error.message || JSON.stringify(error),
      status: error.response?.status || 500,
      fullError: error
    };
  }
}

// Test data
const testEmail = 'test@gmail.com'; // Replace with actual Gmail for testing
let otpCode = null;

// ============================================
// GMAIL OTP AUTHENTICATION TESTS
// ============================================

async function testRegisterWithGmail() {
  logTest('POST /api/auth/register - Register with Gmail');

  const userData = {
    email: testEmail,
    password: 'testpassword123',
    name: 'Test User'
  };

  const result = await makeRequest('POST', '/auth/register', userData);
  
  if (result.success && result.data.success) {
    logSuccess('Registration with Gmail works');
    log(`  User ID: ${result.data.data?.user?.id || 'N/A'}`);
    return true;
  } else {
    // Might fail if user already exists, which is okay
    if (result.status === 409) {
      log('  User already exists (expected)', 'yellow');
      return true;
    }
    logError('Registration failed', result.error);
    return false;
  }
}

async function testRegisterWithNonGmail() {
  logTest('POST /api/auth/register - Reject non-Gmail email');

  const userData = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  };

  const result = await makeRequest('POST', '/auth/register', userData);
  
  if (!result.success && result.status === 400) {
    logSuccess('Non-Gmail email correctly rejected');
    return true;
  } else {
    logError('Non-Gmail email should be rejected', result.error);
    return false;
  }
}

async function testRequestLoginOTP() {
  logTest('POST /api/auth/login/request-otp - Request login OTP');

  const result = await makeRequest('POST', '/auth/login/request-otp', { email: testEmail });
  
  if (result.success && result.data.success) {
    logSuccess('Login OTP request works');
    log(`  Message: ${result.data.message || 'OTP sent'}`);
    log('  ⚠️  Note: Check your Gmail inbox for the OTP code', 'yellow');
    log('  ⚠️  Enter the code manually for next test', 'yellow');
    return true;
  } else {
    logError('Login OTP request failed', result.error);
    log('  ⚠️  Make sure Gmail credentials are configured in .env', 'yellow');
    return false;
  }
}

async function testRequestLoginOTPNonGmail() {
  logTest('POST /api/auth/login/request-otp - Reject non-Gmail');

  const result = await makeRequest('POST', '/auth/login/request-otp', { email: 'test@example.com' });
  
  if (!result.success && result.status === 400) {
    logSuccess('Non-Gmail email correctly rejected for OTP');
    return true;
  } else {
    logError('Non-Gmail should be rejected', result.error);
    return false;
  }
}

async function testVerifyLoginOTP() {
  logTest('POST /api/auth/login/verify-otp - Verify login OTP');

  if (!otpCode) {
    log('  ⚠️  Skipping - OTP code not provided', 'yellow');
    log('  ⚠️  To test: Set otpCode variable with the code from your email', 'yellow');
    return false;
  }

  const result = await makeRequest('POST', '/auth/login/verify-otp', {
    email: testEmail,
    code: otpCode
  });
  
  if (result.success && result.data.success && result.data.data?.token) {
    logSuccess('Login OTP verification works');
    log(`  Token: ${result.data.data.token.substring(0, 20)}...`);
    return true;
  } else {
    logError('Login OTP verification failed', result.error);
    return false;
  }
}

async function testVerifyLoginOTPInvalid() {
  logTest('POST /api/auth/login/verify-otp - Invalid OTP test');

  const result = await makeRequest('POST', '/auth/login/verify-otp', {
    email: testEmail,
    code: '000000'
  });
  
  if (!result.success && result.status === 401) {
    logSuccess('Invalid OTP correctly rejected');
    return true;
  } else {
    logError('Invalid OTP should be rejected', result.error);
    return false;
  }
}

async function testRequestPasswordResetOTP() {
  logTest('POST /api/auth/reset-password/request-otp - Request password reset OTP');

  const result = await makeRequest('POST', '/auth/reset-password/request-otp', { email: testEmail });
  
  if (result.success && result.data.success) {
    logSuccess('Password reset OTP request works');
    log(`  Message: ${result.data.message || 'OTP sent'}`);
    log('  ⚠️  Note: Check your Gmail inbox for the reset code', 'yellow');
    return true;
  } else {
    logError('Password reset OTP request failed', result.error);
    return false;
  }
}

async function testResetPasswordVerifyOTP() {
  logTest('POST /api/auth/reset-password/verify-otp - Reset password with OTP');

  if (!otpCode) {
    log('  ⚠️  Skipping - OTP code not provided', 'yellow');
    log('  ⚠️  To test: Set otpCode variable with the reset code from your email', 'yellow');
    return false;
  }

  const result = await makeRequest('POST', '/auth/reset-password/verify-otp', {
    email: testEmail,
    code: otpCode,
    newPassword: 'newpassword123'
  });
  
  if (result.success && result.data.success) {
    logSuccess('Password reset with OTP works');
    return true;
  } else {
    logError('Password reset failed', result.error);
    return false;
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('GMAIL OTP AUTHENTICATION TEST SUITE', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  log(`Testing against: ${BASE_URL}\n`, 'cyan');
  log(`Test email: ${testEmail}\n`, 'cyan');
  log('⚠️  IMPORTANT: Make sure Gmail credentials are configured in .env', 'yellow');
  log('⚠️  IMPORTANT: Update testEmail variable with your Gmail address\n', 'yellow');

  try {
    // Test registration
    await testRegisterWithGmail();
    await testRegisterWithNonGmail();
    
    // Test login OTP flow
    await testRequestLoginOTP();
    await testRequestLoginOTPNonGmail();
    await testVerifyLoginOTPInvalid();
    // Note: testVerifyLoginOTP requires manual OTP code entry
    
    // Test password reset flow
    await testRequestPasswordResetOTP();
    // Note: testResetPasswordVerifyOTP requires manual OTP code entry

    // Print summary
    log('\n' + '='.repeat(60), 'bright');
    log('TEST SUMMARY', 'bright');
    log('='.repeat(60), 'bright');
    log(`Total Tests: ${results.passed + results.failed}`, 'cyan');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

    if (results.errors.length > 0) {
      log('\nErrors:', 'red');
      results.errors.forEach((err, idx) => {
        log(`\n${idx + 1}. ${err.message}`, 'red');
        log(`   ${err.error}`, 'yellow');
      });
    }

    log('\n' + '='.repeat(60), 'bright');
    log('📝 MANUAL TESTING REQUIRED:', 'yellow');
    log('   1. Request OTP using /api/auth/login/request-otp', 'yellow');
    log('   2. Check your Gmail inbox for the 6-digit code', 'yellow');
    log('   3. Verify OTP using /api/auth/login/verify-otp', 'yellow');
    log('   4. Test password reset flow similarly', 'yellow');
    log('='.repeat(60) + '\n', 'bright');

    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    logError('Test suite failed with unexpected error', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();

