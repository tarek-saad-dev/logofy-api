/**
 * Comprehensive Logo Thumbnails API Test Suite
 * 
 * This script tests all aspects of the Logo Thumbnails API including:
 * - Basic functionality
 * - Multilingual support (English/Arabic)
 * - Pagination
 * - Category filtering
 * - Error handling
 * - Edge cases
 * 
 * Usage: node test_thumbnails_comprehensive.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_PATH = '/api/logo/thumbnails';
const GAMING_CATEGORY_ID = 'e8a45f2f-0c09-43dd-9741-fca53a074be8';

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility function to make HTTP requests
function makeRequest(url, description) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            responseTime,
            description
          });
        } catch (error) {
          console.error(`JSON Parse Error for ${description}:`, error.message);
          console.error('Raw response:', data);
          reject(new Error(`Invalid JSON response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      console.error(`HTTP Error for ${description}:`, error.message);
      reject(new Error(`HTTP request failed: ${error.message}`));
    });
  });
}

// Test assertion function
function assert(condition, message, testName) {
  testResults.total++;
  
  if (condition) {
    testResults.passed++;
    console.log(`✅ ${testName}: ${message}`);
    testResults.details.push({ test: testName, status: 'PASS', message });
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${message}`);
    testResults.details.push({ test: testName, status: 'FAIL', message });
  }
}

// Test function wrapper
async function runTest(testName, testFunction) {
  console.log(`\n🧪 Running test: ${testName}`);
  console.log('=' .repeat(50));
  
  try {
    await testFunction();
  } catch (error) {
    console.error(`Error in ${testName}:`, error);
    assert(false, `Test failed with error: ${error.message || JSON.stringify(error)}`, testName);
  }
}

// Individual test functions
async function testBasicFunctionality() {
  const response = await makeRequest(`${BASE_URL}${API_PATH}`, 'Basic functionality test');
  
  assert(response.status === 200, 'Status code should be 200', 'Basic Functionality');
  assert(response.data.success === true, 'Response should have success: true', 'Basic Functionality');
  assert(response.data.hasOwnProperty('data'), 'Response should have data field', 'Basic Functionality');
  assert(response.data.hasOwnProperty('pagination'), 'Response should have pagination field', 'Basic Functionality');
  assert(response.responseTime < 5000, `Response time should be under 5s (was ${response.responseTime}ms)`, 'Basic Functionality');
  
  // Check pagination structure
  const pagination = response.data.pagination;
  assert(typeof pagination.page === 'number', 'Pagination should have page number', 'Basic Functionality');
  assert(typeof pagination.limit === 'number', 'Pagination should have limit number', 'Basic Functionality');
  assert(typeof pagination.total === 'number', 'Pagination should have total count', 'Basic Functionality');
  assert(typeof pagination.pages === 'number', 'Pagination should have pages count', 'Basic Functionality');
  assert(typeof pagination.categoriesCount === 'number', 'Pagination should have categories count', 'Basic Functionality');
}

async function testEnglishLanguage() {
  const response = await makeRequest(`${BASE_URL}${API_PATH}?lang=en`, 'English language test');
  
  assert(response.status === 200, 'Status code should be 200', 'English Language');
  assert(response.data.language === 'en', 'Language should be "en"', 'English Language');
  assert(response.data.direction === 'ltr', 'Direction should be "ltr"', 'English Language');
  assert(response.data.message === 'Logos fetched successfully', 'Message should be in English', 'English Language');
}

async function testArabicLanguage() {
  const response = await makeRequest(`${BASE_URL}${API_PATH}?lang=ar`, 'Arabic language test');
  
  assert(response.status === 200, 'Status code should be 200', 'Arabic Language');
  assert(response.data.language === 'ar', 'Language should be "ar"', 'Arabic Language');
  assert(response.data.direction === 'rtl', 'Direction should be "rtl"', 'Arabic Language');
  assert(response.data.message === 'تم جلب الشعارات بنجاح', 'Message should be in Arabic', 'Arabic Language');
}

async function testPagination() {
  // Test first page with small limit
  const response1 = await makeRequest(`${BASE_URL}${API_PATH}?page=1&limit=5`, 'Pagination test - page 1');
  
  assert(response1.status === 200, 'Status code should be 200', 'Pagination');
  assert(response1.data.pagination.page === 1, 'Page should be 1', 'Pagination');
  assert(response1.data.pagination.limit === 5, 'Limit should be 5', 'Pagination');
  
  // Test second page
  const response2 = await makeRequest(`${BASE_URL}${API_PATH}?page=2&limit=5`, 'Pagination test - page 2');
  
  assert(response2.status === 200, 'Status code should be 200', 'Pagination');
  assert(response2.data.pagination.page === 2, 'Page should be 2', 'Pagination');
  assert(response2.data.pagination.limit === 5, 'Limit should be 5', 'Pagination');
  
  // Test large page size
  const response3 = await makeRequest(`${BASE_URL}${API_PATH}?page=1&limit=50`, 'Pagination test - large page');
  
  assert(response3.status === 200, 'Status code should be 200', 'Pagination');
  assert(response3.data.pagination.limit === 50, 'Limit should be 50', 'Pagination');
}

async function testCategoryFiltering() {
  const response = await makeRequest(`${BASE_URL}${API_PATH}?category_id=${GAMING_CATEGORY_ID}`, 'Category filtering test');
  
  assert(response.status === 200, 'Status code should be 200', 'Category Filtering');
  
  // Check if all returned logos belong to the gaming category
  if (response.data.data.length > 0) {
    const firstCategory = response.data.data[0];
    assert(firstCategory.category.id === GAMING_CATEGORY_ID, 'All logos should belong to gaming category', 'Category Filtering');
    
    if (firstCategory.logos.length > 0) {
      const firstLogo = firstCategory.logos[0];
      assert(firstLogo.categoryId === GAMING_CATEGORY_ID, 'Logo should have correct category ID', 'Category Filtering');
    }
  }
}

async function testCombinedParameters() {
  const response = await makeRequest(
    `${BASE_URL}${API_PATH}?lang=ar&page=1&limit=3&category_id=${GAMING_CATEGORY_ID}`,
    'Combined parameters test'
  );
  
  assert(response.status === 200, 'Status code should be 200', 'Combined Parameters');
  assert(response.data.language === 'ar', 'Language should be Arabic', 'Combined Parameters');
  assert(response.data.direction === 'rtl', 'Direction should be RTL', 'Combined Parameters');
  assert(response.data.pagination.page === 1, 'Page should be 1', 'Combined Parameters');
  assert(response.data.pagination.limit === 3, 'Limit should be 3', 'Combined Parameters');
}

async function testEdgeCases() {
  // Test invalid category ID format
  const response1 = await makeRequest(`${BASE_URL}${API_PATH}?category_id=invalid-uuid`, 'Invalid UUID test');
  assert(response1.status === 200, 'Should handle invalid UUID gracefully', 'Edge Cases');
  
  // Test non-existent category ID
  const response2 = await makeRequest(`${BASE_URL}${API_PATH}?category_id=00000000-0000-0000-0000-000000000000`, 'Non-existent UUID test');
  assert(response2.status === 200, 'Should handle non-existent UUID gracefully', 'Edge Cases');
  
  // Test invalid language code
  const response3 = await makeRequest(`${BASE_URL}${API_PATH}?lang=fr`, 'Invalid language test');
  assert(response3.status === 200, 'Should handle invalid language gracefully', 'Edge Cases');
  assert(response3.data.language === 'en', 'Should default to English for invalid language', 'Edge Cases');
  
  // Test negative page number
  const response4 = await makeRequest(`${BASE_URL}${API_PATH}?page=-1`, 'Negative page test');
  assert(response4.status === 200, 'Should handle negative page gracefully', 'Edge Cases');
  
  // Test zero limit
  const response5 = await makeRequest(`${BASE_URL}${API_PATH}?limit=0`, 'Zero limit test');
  assert(response5.status === 200, 'Should handle zero limit gracefully', 'Edge Cases');
}

async function testPerformance() {
  const iterations = 5;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const response = await makeRequest(`${BASE_URL}${API_PATH}`, `Performance test ${i + 1}`);
    times.push(response.responseTime);
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  
  assert(avgTime < 2000, `Average response time should be under 2s (was ${avgTime.toFixed(2)}ms)`, 'Performance');
  assert(maxTime < 5000, `Max response time should be under 5s (was ${maxTime}ms)`, 'Performance');
  
  console.log(`📊 Performance stats: Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime}ms`);
}

async function testDataStructure() {
  const response = await makeRequest(`${BASE_URL}${API_PATH}`, 'Data structure test');
  
  assert(response.data.data instanceof Array, 'Data should be an array', 'Data Structure');
  
  if (response.data.data.length > 0) {
    const firstGroup = response.data.data[0];
    
    // Check category group structure
    assert(firstGroup.hasOwnProperty('category'), 'Group should have category field', 'Data Structure');
    assert(firstGroup.hasOwnProperty('logos'), 'Group should have logos field', 'Data Structure');
    assert(firstGroup.logos instanceof Array, 'Logos should be an array', 'Data Structure');
    
    // Check category structure
    const category = firstGroup.category;
    assert(category.hasOwnProperty('id'), 'Category should have id field', 'Data Structure');
    assert(category.hasOwnProperty('name'), 'Category should have name field', 'Data Structure');
    
    // Check logo structure
    if (firstGroup.logos.length > 0) {
      const logo = firstGroup.logos[0];
      const requiredFields = ['id', 'title', 'description', 'thumbnailUrl', 'categoryId', 'categoryName', 'tags', 'createdAt', 'updatedAt'];
      
      requiredFields.forEach(field => {
        assert(logo.hasOwnProperty(field), `Logo should have ${field} field`, 'Data Structure');
      });
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Logo Thumbnails API Comprehensive Test Suite');
  console.log('=' .repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Path: ${API_PATH}`);
  console.log(`Gaming Category ID: ${GAMING_CATEGORY_ID}`);
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    await runTest('Basic Functionality', testBasicFunctionality);
    await runTest('English Language Support', testEnglishLanguage);
    await runTest('Arabic Language Support', testArabicLanguage);
    await runTest('Pagination', testPagination);
    await runTest('Category Filtering', testCategoryFiltering);
    await runTest('Combined Parameters', testCombinedParameters);
    await runTest('Edge Cases', testEdgeCases);
    await runTest('Performance', testPerformance);
    await runTest('Data Structure', testDataStructure);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(detail => detail.status === 'FAIL')
      .forEach(detail => {
        console.log(`  - ${detail.test}: ${detail.message}`);
      });
  }
  
  console.log('\n' + '=' .repeat(60));
  
  if (testResults.failed === 0) {
    console.log('🎉 All tests passed! The Logo Thumbnails API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the API implementation.');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
