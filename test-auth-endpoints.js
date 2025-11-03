/**
 * Comprehensive Authentication Endpoints Test Script
 * Tests all auth endpoints to ensure everything works correctly
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/auth`;

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
let authToken = null;
let testUserId = null;
let testUserEmail = null;

// Helper function to make HTTP requests
async function request(method, endpoint, body = null, token = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return {
            status: response.status,
            ok: response.ok,
            data
        };
    } catch (error) {
        return {
            status: 0,
            ok: false,
            error: error.message,
            data: null
        };
    }
}

// Test function
function test(name, fn) {
    return async () => {
        try {
            await fn();
            testsPassed++;
            console.log(`✅ PASS: ${name}`);
        } catch (error) {
            testsFailed++;
            console.log(`❌ FAIL: ${name}`);
            console.log(`   Error: ${error.message}`);
        }
    };
}

// Test Suite
async function runTests() {
    console.log('🧪 Starting Authentication Endpoints Test Suite\n');
    console.log(`📍 Testing: ${BASE_URL}\n`);
    console.log('=' .repeat(60) + '\n');

    // Test 1: Register new user
    await test('Register new user with valid data', async () => {
        testUserEmail = `test_${Date.now()}@example.com`;
        const result = await request('POST', '/register', {
            email: testUserEmail,
            password: 'testpassword123',
            name: 'Test User',
            display_name: 'Test Display Name'
        });

        if (!result.ok || result.status !== 201) {
            throw new Error(`Expected 201, got ${result.status}. Response: ${JSON.stringify(result.data)}`);
        }

        if (!result.data.success) {
            throw new Error(`Registration failed: ${result.data.message}`);
        }

        if (!result.data.data || !result.data.data.token) {
            throw new Error('Token not returned in response');
        }

        if (!result.data.data.user || !result.data.data.user.id) {
            throw new Error('User data not returned in response');
        }

        authToken = result.data.data.token;
        testUserId = result.data.data.user.id;

        console.log(`   User ID: ${testUserId}`);
        console.log(`   Email: ${testUserEmail}`);
    })();

    // Test 2: Try to register duplicate user
    await test('Prevent duplicate email registration', async () => {
        const result = await request('POST', '/register', {
            email: testUserEmail,
            password: 'testpassword123',
            name: 'Another User'
        });

        if (result.ok || result.status !== 409) {
            throw new Error(`Expected 409 (Conflict), got ${result.status}`);
        }

        if (result.data.success !== false) {
            throw new Error('Should return success: false for duplicate email');
        }
    })();

    // Test 3: Register validation - missing email
    await test('Register validation - missing email', async () => {
        const result = await request('POST', '/register', {
            password: 'testpassword123'
        });

        if (result.ok || result.status !== 400) {
            throw new Error(`Expected 400, got ${result.status}`);
        }
    })();

    // Test 4: Register validation - missing password
    await test('Register validation - missing password', async () => {
        const result = await request('POST', '/register', {
            email: 'test2@example.com'
        });

        if (result.ok || result.status !== 400) {
            throw new Error(`Expected 400, got ${result.status}`);
        }
    })();

    // Test 5: Register validation - short password
    await test('Register validation - password too short', async () => {
        const result = await request('POST', '/register', {
            email: 'test3@example.com',
            password: '12345'
        });

        if (result.ok || result.status !== 400) {
            throw new Error(`Expected 400, got ${result.status}`);
        }
    })();

    // Test 6: Register validation - invalid email format
    await test('Register validation - invalid email format', async () => {
        const result = await request('POST', '/register', {
            email: 'notanemail',
            password: 'testpassword123'
        });

        if (result.ok || result.status !== 400) {
            throw new Error(`Expected 400, got ${result.status}`);
        }
    })();

    // Test 7: Login with correct credentials
    await test('Login with correct credentials', async () => {
        const result = await request('POST', '/login', {
            email: testUserEmail,
            password: 'testpassword123'
        });

        if (!result.ok || result.status !== 200) {
            throw new Error(`Expected 200, got ${result.status}. Response: ${JSON.stringify(result.data)}`);
        }

        if (!result.data.success) {
            throw new Error(`Login failed: ${result.data.message}`);
        }

        if (!result.data.data || !result.data.data.token) {
            throw new Error('Token not returned in login response');
        }

        authToken = result.data.data.token; // Update token
    })();

    // Test 8: Login with wrong password
    await test('Login with wrong password', async () => {
        const result = await request('POST', '/login', {
            email: testUserEmail,
            password: 'wrongpassword'
        });

        if (result.ok || result.status !== 401) {
            throw new Error(`Expected 401, got ${result.status}`);
        }
    })();

    // Test 9: Login with non-existent email
    await test('Login with non-existent email', async () => {
        const result = await request('POST', '/login', {
            email: 'nonexistent@example.com',
            password: 'testpassword123'
        });

        if (result.ok || result.status !== 401) {
            throw new Error(`Expected 401, got ${result.status}`);
        }
    })();

    // Test 10: Get current user (authenticated)
    await test('Get current user with valid token', async () => {
        const result = await request('GET', '/me', null, authToken);

        if (!result.ok || result.status !== 200) {
            throw new Error(`Expected 200, got ${result.status}. Response: ${JSON.stringify(result.data)}`);
        }

        if (!result.data.success) {
            throw new Error(`Get user failed: ${result.data.message}`);
        }

        if (!result.data.data || !result.data.data.user) {
            throw new Error('User data not returned');
        }

        if (result.data.data.user.email !== testUserEmail) {
            throw new Error('Returned user email does not match');
        }

        // Verify password_hash is not exposed
        if (result.data.data.user.password_hash) {
            throw new Error('password_hash should not be exposed in response');
        }
    })();

    // Test 11: Get current user without token
    await test('Get current user without token (should fail)', async () => {
        const result = await request('GET', '/me');

        if (result.ok || result.status !== 401) {
            throw new Error(`Expected 401, got ${result.status}`);
        }
    })();

    // Test 12: Get current user with invalid token
    await test('Get current user with invalid token', async () => {
        const result = await request('GET', '/me', null, 'invalid.token.here');

        if (result.ok || result.status !== 401) {
            throw new Error(`Expected 401, got ${result.status}`);
        }
    })();

    // Test 13: Refresh token
    await test('Refresh token', async () => {
        const result = await request('POST', '/refresh', null, authToken);

        if (!result.ok || result.status !== 200) {
            throw new Error(`Expected 200, got ${result.status}. Response: ${JSON.stringify(result.data)}`);
        }

        if (!result.data.data || !result.data.data.token) {
            throw new Error('New token not returned');
        }

        authToken = result.data.data.token; // Update token
    })();

    // Test 14: Change password
    await test('Change password with correct current password', async () => {
        const result = await request('POST', '/change-password', {
            currentPassword: 'testpassword123',
            newPassword: 'newpassword123'
        }, authToken);

        if (!result.ok || result.status !== 200) {
            throw new Error(`Expected 200, got ${result.status}. Response: ${JSON.stringify(result.data)}`);
        }

        // Verify we can login with new password
        const loginResult = await request('POST', '/login', {
            email: testUserEmail,
            password: 'newpassword123'
        });

        if (!loginResult.ok) {
            throw new Error('Cannot login with new password');
        }

        authToken = loginResult.data.data.token; // Update token
    })();

    // Test 15: Change password with wrong current password
    await test('Change password with wrong current password', async () => {
        const result = await request('POST', '/change-password', {
            currentPassword: 'wrongpassword',
            newPassword: 'newpassword456'
        }, authToken);

        if (result.ok || result.status !== 401) {
            throw new Error(`Expected 401, got ${result.status}`);
        }
    })();

    // Test 16: Change password validation
    await test('Change password validation - missing passwords', async () => {
        const result = await request('POST', '/change-password', {}, authToken);

        if (result.ok || result.status !== 400) {
            throw new Error(`Expected 400, got ${result.status}`);
        }
    })();

    // Test 17: Change password validation - short new password
    await test('Change password validation - short new password', async () => {
        const result = await request('POST', '/change-password', {
            currentPassword: 'newpassword123',
            newPassword: '12345'
        }, authToken);

        if (result.ok || result.status !== 400) {
            throw new Error(`Expected 400, got ${result.status}`);
        }
    })();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Total:  ${testsPassed + testsFailed}`);
    console.log(`\n${testsFailed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed. Please review the errors above.'}`);
}

// Run tests
if (typeof fetch === 'undefined') {
    console.error('❌ Error: This script requires Node.js 18+ with fetch support');
    console.log('💡 Tip: Use node --experimental-fetch test-auth-endpoints.js');
    process.exit(1);
} else {
    runTests().catch(error => {
        console.error('❌ Test suite crashed:', error);
        process.exit(1);
    });
}

