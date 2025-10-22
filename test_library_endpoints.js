const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/logo';
const HEALTH_URL = 'http://localhost:3000/health';
const ASSETS_URL = 'http://localhost:3000/api/assets';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  performance: []
};

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, params = {}, baseUrl = BASE_URL) {
  const startTime = Date.now();
  try {
    const config = {
      method,
      url: `${baseUrl}${endpoint}`,
      timeout: TEST_TIMEOUT,
      params: method === 'GET' ? params : undefined,
      data: method !== 'GET' ? data : undefined,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      data: response.data,
      status: response.status,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
      duration
    };
  }
}

// Test helper functions
function logTest(testName, passed, error = null, duration = 0) {
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName} (${duration}ms)`);
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, error });
    console.log(`❌ ${testName} (${duration}ms) - ${error}`);
  }
  
  if (duration > 0) {
    testResults.performance.push({ test: testName, duration });
  }
}

// Test cases
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  
  const result = await makeRequest('GET', '', null, {}, HEALTH_URL);
  logTest('Health Check', result.success && result.status === 200, result.error, result.duration);
}

async function testIconLibrary() {
  console.log('\n🎨 Testing Icon Library...');
  
  // Test get all icons
  const allIconsResult = await makeRequest('GET', '/icons', null, { page: 1, limit: 20 });
  logTest('Get All Icons', 
    allIconsResult.success && allIconsResult.status === 200 && allIconsResult.data.success,
    allIconsResult.error, allIconsResult.duration);

  // Test icon library (optimized)
  const libraryResult = await makeRequest('GET', '/icons/library', null, { 
    page: 1, 
    limit: 50, 
    featured: 'true',
    sort: 'popularity',
    order: 'desc'
  });
  logTest('Get Icon Library (Optimized)', 
    libraryResult.success && libraryResult.status === 200 && libraryResult.data.success,
    libraryResult.error, libraryResult.duration);

  // Test icon categories
  const categoriesResult = await makeRequest('GET', '/icons/categories', null, { includeEmpty: 'false' });
  logTest('Get Icon Categories', 
    categoriesResult.success && categoriesResult.status === 200 && categoriesResult.data.success,
    categoriesResult.error, categoriesResult.duration);

  // Test featured icons
  const featuredResult = await makeRequest('GET', '/icons/featured', null, { limit: 20 });
  logTest('Get Featured Icons', 
    featuredResult.success && featuredResult.status === 200 && featuredResult.data.success,
    featuredResult.error, featuredResult.duration);

  // Test filtering
  const filteredResult = await makeRequest('GET', '/icons', null, {
    page: 1,
    limit: 10,
    category: 'business',
    type: 'vector',
    search: 'arrow',
    sort: 'newest',
    order: 'desc'
  });
  logTest('Get Filtered Icons', 
    filteredResult.success && filteredResult.status === 200 && filteredResult.data.success,
    filteredResult.error, filteredResult.duration);

  return allIconsResult.data?.data?.[0]?.id; // Return first icon ID for further tests
}

async function testIconCRUD(iconId = null) {
  console.log('\n🔧 Testing Icon CRUD Operations...');
  
  // Test create icon
  const timestamp = Date.now();
  const createData = {
    name: `Test Arrow Icon ${timestamp}`,
    url: `https://res.cloudinary.com/example/image/upload/v${timestamp}/test-arrow.svg`,
    type: 'vector',
    width: 100,
    height: 100,
    hasAlpha: true,
    vectorSvg: '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><path d="M10 50 L80 50 M60 30 L80 50 L60 70" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    category: 'navigation',
    tags: ['arrow', 'right', 'direction', 'navigation'],
    description: 'A clean arrow pointing to the right'
  };
  
  const createResult = await makeRequest('POST', '/icons', createData);
  logTest('Create Icon', 
    createResult.success && createResult.status === 201 && createResult.data.success,
    createResult.error, createResult.duration);
  
  const newIconId = createResult.data?.data?.id;
  
  if (newIconId) {
    // Test get icon by ID
    const getResult = await makeRequest('GET', `/icons/${newIconId}`);
    logTest('Get Icon by ID', 
      getResult.success && getResult.status === 200 && getResult.data.success,
      getResult.error, getResult.duration);

    // Test update icon
    const updateData = {
      name: `Updated Arrow Icon ${timestamp}`,
      meta: JSON.stringify({
        category: 'business',
        tags: ['arrow', 'right', 'direction', 'business', 'professional'],
        description: 'A professional arrow pointing to the right for business use'
      })
    };
    
    const updateResult = await makeRequest('PATCH', `/icons/${newIconId}`, updateData);
    logTest('Update Icon', 
      updateResult.success && updateResult.status === 200 && updateResult.data.success,
      updateResult.error, updateResult.duration);

    // Test delete icon
    const deleteResult = await makeRequest('DELETE', `/icons/${newIconId}`);
    logTest('Delete Icon', 
      deleteResult.success && deleteResult.status === 200 && deleteResult.data.success,
      deleteResult.error, deleteResult.duration);
  }
}

async function testBackgroundLibrary() {
  console.log('\n🖼️ Testing Background Library...');
  
  // Test get all backgrounds
  const allBackgroundsResult = await makeRequest('GET', '/backgrounds', null, { 
    page: 1, 
    limit: 20,
    sort: 'created_at',
    order: 'desc'
  });
  logTest('Get All Backgrounds', 
    allBackgroundsResult.success && allBackgroundsResult.status === 200 && allBackgroundsResult.data.success,
    allBackgroundsResult.error, allBackgroundsResult.duration);

  // Test filtering backgrounds
  const filteredResult = await makeRequest('GET', '/backgrounds', null, {
    page: 1,
    limit: 10,
    category: 'abstract',
    type: 'raster',
    search: 'gradient'
  });
  logTest('Get Filtered Backgrounds', 
    filteredResult.success && filteredResult.status === 200 && filteredResult.data.success,
    filteredResult.error, filteredResult.duration);

  return allBackgroundsResult.data?.data?.[0]?.id; // Return first background ID for further tests
}

async function testBackgroundCRUD(backgroundId = null) {
  console.log('\n🔧 Testing Background CRUD Operations...');
  
  // Test create background
  const timestamp = Date.now();
  const createData = {
    name: `Test Gradient Background ${timestamp}`,
    url: `https://res.cloudinary.com/example/image/upload/v${timestamp}/test-gradient-bg.jpg`,
    type: 'raster',
    width: 1920,
    height: 1080,
    hasAlpha: false,
    category: 'abstract',
    tags: ['gradient', 'abstract', 'colorful', 'modern'],
    description: 'A beautiful gradient background perfect for modern designs'
  };
  
  const createResult = await makeRequest('POST', '/backgrounds', createData);
  logTest('Create Background', 
    createResult.success && createResult.status === 201 && createResult.data.success,
    createResult.error, createResult.duration);
  
  const newBackgroundId = createResult.data?.data?.id;
  
  if (newBackgroundId) {
    // Test get background by ID
    const getResult = await makeRequest('GET', `/backgrounds/${newBackgroundId}`);
    logTest('Get Background by ID', 
      getResult.success && getResult.status === 200 && getResult.data.success,
      getResult.error, getResult.duration);

    // Test update background
    const updateData = {
      name: `Updated Gradient Background ${timestamp}`,
      meta: JSON.stringify({
        category: 'business',
        tags: ['gradient', 'business', 'professional', 'modern'],
        description: 'A professional gradient background suitable for business presentations'
      })
    };
    
    const updateResult = await makeRequest('PATCH', `/backgrounds/${newBackgroundId}`, updateData);
    logTest('Update Background', 
      updateResult.success && updateResult.status === 200 && updateResult.data.success,
      updateResult.error, updateResult.duration);

    // Test delete background
    const deleteResult = await makeRequest('DELETE', `/backgrounds/${newBackgroundId}`);
    logTest('Delete Background', 
      deleteResult.success && deleteResult.status === 200 && deleteResult.data.success,
      deleteResult.error, deleteResult.duration);
  }
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  // Test non-existent icon
  const nonExistentIconResult = await makeRequest('GET', '/icons/00000000-0000-0000-0000-000000000000');
  logTest('Non-existent Icon (404)', 
    !nonExistentIconResult.success && nonExistentIconResult.status === 404,
    nonExistentIconResult.error, nonExistentIconResult.duration);

  // Test non-existent background
  const nonExistentBgResult = await makeRequest('GET', '/backgrounds/00000000-0000-0000-0000-000000000000');
  logTest('Non-existent Background (404)', 
    !nonExistentBgResult.success && nonExistentBgResult.status === 404,
    nonExistentBgResult.error, nonExistentBgResult.duration);

  // Test create icon with missing required fields
  const invalidIconResult = await makeRequest('POST', '/icons', { category: 'test' });
  logTest('Create Icon with Missing Fields (400)', 
    !invalidIconResult.success && invalidIconResult.status === 400,
    invalidIconResult.error, invalidIconResult.duration);

  // Test create background with missing required fields
  const invalidBgResult = await makeRequest('POST', '/backgrounds', { category: 'test' });
  logTest('Create Background with Missing Fields (400)', 
    !invalidBgResult.success && invalidBgResult.status === 400,
    invalidBgResult.error, invalidBgResult.duration);
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  // Test large icon library request
  const largeIconResult = await makeRequest('GET', '/icons/library', null, {
    page: 1,
    limit: 100,
    sort: 'popularity',
    order: 'desc'
  });
  logTest('Large Icon Library Request', 
    largeIconResult.success && largeIconResult.status === 200 && largeIconResult.data.success,
    largeIconResult.error, largeIconResult.duration);

  // Test complex filtering
  const complexFilterResult = await makeRequest('GET', '/icons/library', null, {
    page: 1,
    limit: 50,
    category: 'business',
    type: 'vector',
    style: 'outline',
    featured: 'true',
    search: 'arrow',
    tags: 'navigation,direction',
    sort: 'popularity',
    order: 'desc'
  });
  logTest('Complex Filtering Performance', 
    complexFilterResult.success && complexFilterResult.status === 200 && complexFilterResult.data.success,
    complexFilterResult.error, complexFilterResult.duration);
}

async function testAssetManagement() {
  console.log('\n📁 Testing Asset Management...');
  
  // Test get all assets
  const allAssetsResult = await makeRequest('GET', '', null, {
    kind: 'vector',
    category: 'icons',
    search: 'arrow',
    page: 1,
    limit: 20
  }, ASSETS_URL);
  logTest('Get All Assets', 
    allAssetsResult.success && allAssetsResult.status === 200 && allAssetsResult.data.success,
    allAssetsResult.error, allAssetsResult.duration);

  // Test create asset record
  const timestamp = Date.now();
  const createAssetData = {
    kind: 'vector',
    name: `Test Library Asset ${timestamp}`,
    storage: 'cloudinary',
    url: `https://res.cloudinary.com/example/image/upload/v${timestamp}/test-asset.svg`,
    provider_id: `test-asset-${timestamp}`,
    mime_type: 'image/svg+xml',
    width: 100,
    height: 100,
    has_alpha: true,
    vector_svg: '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="currentColor"/></svg>',
    meta: {
      category: 'test',
      tags: ['test', 'circle', 'simple'],
      library_type: 'icon',
      description: 'A simple test asset'
    }
  };
  
  const createAssetResult = await makeRequest('POST', '', createAssetData, {}, ASSETS_URL);
  logTest('Create Asset Record', 
    createAssetResult.success && createAssetResult.status === 201 && createAssetResult.data.success,
    createAssetResult.error, createAssetResult.duration);
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Logo Maker Library API Tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms\n`);

  try {
    // Run all tests
    await testHealthCheck();
    
    const iconId = await testIconLibrary();
    await testIconCRUD(iconId);
    
    const backgroundId = await testBackgroundLibrary();
    await testBackgroundCRUD(backgroundId);
    
    await testErrorHandling();
    await testPerformance();
    await testAssetManagement();

    // Print results
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total: ${testResults.passed + testResults.failed}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n🚨 Errors:');
      testResults.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }
    
    if (testResults.performance.length > 0) {
      console.log('\n⚡ Performance:');
      testResults.performance.forEach(perf => {
        console.log(`  - ${perf.test}: ${perf.duration}ms`);
      });
    }

    // Save results to file
    const resultsFile = 'test_results.json';
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      results: testResults
    }, null, 2));
    
    console.log(`\n💾 Results saved to ${resultsFile}`);
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Test runner error:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testResults };
