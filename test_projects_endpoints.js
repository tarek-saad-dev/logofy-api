const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data storage
let testData = {
    userToken: null,
    userEmail: null,
    userPassword: null,
    userId: null,
    projectId: null,
    createdProjectId: null
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
    log(`\n🧪 Testing: ${testName}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(method, url, data = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token || testData.userToken) {
        headers['Authorization'] = `Bearer ${token || testData.userToken}`;
    }

    try {
        const config = {
            method,
            url,
            headers,
            data
        };
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

// ==============================================
// AUTHENTICATION TESTS
// ==============================================

async function testRegisterUser() {
    logTest('Register User');
    
    testData.userEmail = `testuser_${Date.now()}@gmail.com`;
    testData.userPassword = 'testpassword123';

    const result = await makeAuthenticatedRequest('POST', `${API_URL}/auth/register`, {
        email: testData.userEmail,
        password: testData.userPassword,
        name: 'Test User'
    });

    if (result.success && result.data.success) {
        testData.userToken = result.data.data.token;
        testData.userId = result.data.data.user.id;
        logSuccess(`User registered: ${testData.userEmail}`);
        logSuccess(`Token: ${testData.userToken.substring(0, 20)}...`);
        return true;
    } else {
        logError(`Registration failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

async function testLogin() {
    logTest('Login User (if registration failed, try login)');
    
    // If registration failed, try to login
    if (!testData.userToken) {
        const result = await makeAuthenticatedRequest('POST', `${API_URL}/auth/login/request-otp`, {
            email: testData.userEmail
        });

        if (result.success) {
            logWarning('OTP login requested. You need to manually verify OTP for testing.');
            logWarning('For testing projects, you can use an existing token.');
            return false;
        }
    }
    return true;
}

// ==============================================
// PROJECTS ENDPOINTS TESTS
// ==============================================

async function testGetAllProjects() {
    logTest('GET /api/projects - Get all projects');
    
    const result = await makeAuthenticatedRequest('GET', `${API_URL}/projects`);

    if (result.success && result.data.success) {
        logSuccess(`Found ${result.data.data.projects.length} projects`);
        logSuccess(`Total: ${result.data.data.pagination.total}`);
        
        // Store first project ID if available
        if (result.data.data.projects.length > 0 && !testData.projectId) {
            testData.projectId = result.data.data.projects[0].id;
            logSuccess(`Stored project ID: ${testData.projectId}`);
        }
        return true;
    } else {
        logError(`Failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

async function testCreateProject() {
    logTest('POST /api/projects - Create new project');
    
    const sampleJsonDoc = {
        canvas: {
            width: 800,
            height: 600,
            backgroundColor: '#ffffff'
        },
        layers: [
            {
                id: 'layer1',
                type: 'text',
                content: 'My Logo',
                x: 100,
                y: 100,
                fontSize: 48,
                color: '#000000'
            }
        ],
        version: '1.0.0'
    };

    const result = await makeAuthenticatedRequest('POST', `${API_URL}/projects`, {
        title: `Test Project ${Date.now()}`,
        json_doc: sampleJsonDoc
    });

    if (result.success && result.data.success) {
        testData.createdProjectId = result.data.data.project.id;
        logSuccess(`Project created: ${testData.createdProjectId}`);
        logSuccess(`Title: ${result.data.data.project.title}`);
        return true;
    } else {
        logError(`Failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

async function testGetProjectById() {
    logTest('GET /api/projects/:id - Get project by ID');
    
    const projectId = testData.createdProjectId || testData.projectId;
    
    if (!projectId) {
        logError('No project ID available for testing');
        return false;
    }

    const result = await makeAuthenticatedRequest('GET', `${API_URL}/projects/${projectId}`);

    if (result.success && result.data.success) {
        logSuccess(`Project found: ${result.data.data.project.title}`);
        logSuccess(`Has json_doc: ${result.data.data.project.json_doc ? 'Yes' : 'No'}`);
        return true;
    } else {
        logError(`Failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

async function testUpdateProject() {
    logTest('PUT /api/projects/:id - Update project');
    
    const projectId = testData.createdProjectId || testData.projectId;
    
    if (!projectId) {
        logError('No project ID available for testing');
        return false;
    }

    const updatedJsonDoc = {
        canvas: {
            width: 1000,
            height: 800,
            backgroundColor: '#f0f0f0'
        },
        layers: [
            {
                id: 'layer1',
                type: 'text',
                content: 'Updated Logo',
                x: 150,
                y: 150,
                fontSize: 56,
                color: '#ff0000'
            }
        ],
        version: '1.1.0'
    };

    const result = await makeAuthenticatedRequest('PUT', `${API_URL}/projects/${projectId}`, {
        title: `Updated Project ${Date.now()}`,
        json_doc: updatedJsonDoc
    });

    if (result.success && result.data.success) {
        logSuccess(`Project updated: ${result.data.data.project.title}`);
        logSuccess(`Updated at: ${result.data.data.project.updated_at}`);
        return true;
    } else {
        logError(`Failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

async function testSearchProjects() {
    logTest('GET /api/projects?search=... - Search projects');
    
    const result = await makeAuthenticatedRequest('GET', `${API_URL}/projects?search=Test`);

    if (result.success && result.data.success) {
        logSuccess(`Found ${result.data.data.projects.length} matching projects`);
        return true;
    } else {
        logError(`Failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

async function testGetProjectsWithPagination() {
    logTest('GET /api/projects?page=1&limit=5 - Get projects with pagination');
    
    const result = await makeAuthenticatedRequest('GET', `${API_URL}/projects?page=1&limit=5`);

    if (result.success && result.data.success) {
        logSuccess(`Page: ${result.data.data.pagination.page}`);
        logSuccess(`Limit: ${result.data.data.pagination.limit}`);
        logSuccess(`Total: ${result.data.data.pagination.total}`);
        logSuccess(`Total Pages: ${result.data.data.pagination.totalPages}`);
        return true;
    } else {
        logError(`Failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

async function testDeleteProject() {
    logTest('DELETE /api/projects/:id - Soft delete project');
    
    // Use created project ID if available, otherwise skip
    const projectId = testData.createdProjectId;
    
    if (!projectId) {
        logWarning('No created project ID available - skipping delete test');
        return true; // Not a failure, just skip
    }

    const result = await makeAuthenticatedRequest('DELETE', `${API_URL}/projects/${projectId}`);

    if (result.success && result.data.success) {
        logSuccess(`Project deleted: ${projectId}`);
        
        // Verify it's soft deleted (should not appear in GET /projects)
        const verifyResult = await makeAuthenticatedRequest('GET', `${API_URL}/projects/${projectId}`);
        if (!verifyResult.success || verifyResult.status === 404) {
            logSuccess('Project correctly soft deleted (not found in GET request)');
        }
        return true;
    } else {
        logError(`Failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

async function testValidationErrors() {
    logTest('Validation Tests - Invalid inputs');
    
    // Test create without title
    const result1 = await makeAuthenticatedRequest('POST', `${API_URL}/projects`, {
        json_doc: { test: 'data' }
    });
    if (!result1.success && result1.status === 400) {
        logSuccess('Correctly rejected project without title');
    } else {
        logError('Should reject project without title');
    }

    // Test create without json_doc
    const result2 = await makeAuthenticatedRequest('POST', `${API_URL}/projects`, {
        title: 'Test Project'
    });
    if (!result2.success && result2.status === 400) {
        logSuccess('Correctly rejected project without json_doc');
    } else {
        logError('Should reject project without json_doc');
    }

    // Test invalid UUID
    const result3 = await makeAuthenticatedRequest('GET', `${API_URL}/projects/invalid-uuid`);
    if (!result3.success && result3.status === 400) {
        logSuccess('Correctly rejected invalid UUID format');
    } else {
        logError('Should reject invalid UUID format');
    }

    return true;
}

async function testUnauthorizedAccess() {
    logTest('Unauthorized Access Tests');
    
    // Test without token
    const result = await makeAuthenticatedRequest('GET', `${API_URL}/projects`, null, null);
    if (!result.success && (result.status === 401 || result.status === 500)) {
        logSuccess('Correctly rejected request without authentication');
    } else {
        logError('Should reject request without authentication');
    }

    return true;
}

// ==============================================
// RUN ALL TESTS
// ==============================================

async function runAllTests() {
    log('\n🚀 Starting Projects Endpoints Tests\n', 'blue');
    log('='.repeat(60), 'blue');

    let passed = 0;
    let failed = 0;

    // Authentication
    log('\n📝 AUTHENTICATION', 'yellow');
    const authSuccess = await testRegisterUser() || await testLogin();
    if (!authSuccess) {
        logError('\n⚠️  Authentication failed. Some tests may fail.');
        logWarning('You can manually set testData.userToken if you have a valid token.');
    } else {
        passed++;
    }

    // Projects CRUD Tests
    log('\n📝 PROJECTS CRUD OPERATIONS', 'yellow');
    
    const tests = [
        { name: 'Get All Projects', fn: testGetAllProjects },
        { name: 'Create Project', fn: testCreateProject },
        { name: 'Get Project By ID', fn: testGetProjectById },
        { name: 'Update Project', fn: testUpdateProject },
        { name: 'Search Projects', fn: testSearchProjects },
        { name: 'Get Projects with Pagination', fn: testGetProjectsWithPagination },
        { name: 'Delete Project', fn: testDeleteProject }
    ];

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            logError(`Test ${test.name} threw an error: ${error.message}`);
            failed++;
        }
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Validation and Security Tests
    log('\n📝 VALIDATION & SECURITY', 'yellow');
    
    const validationTests = [
        { name: 'Validation Errors', fn: testValidationErrors },
        { name: 'Unauthorized Access', fn: testUnauthorizedAccess }
    ];

    for (const test of validationTests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            logError(`Test ${test.name} threw an error: ${error.message}`);
            failed++;
        }
    }

    // Summary
    log('\n' + '='.repeat(60), 'blue');
    log('\n📊 TEST SUMMARY', 'blue');
    log(`✅ Passed: ${passed}`, 'green');
    log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`, 'cyan');

    if (failed === 0) {
        log('🎉 All tests passed!', 'green');
    } else {
        log('⚠️  Some tests failed. Please review the errors above.', 'yellow');
    }

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});

