/**
 * Simple Logo Thumbnails API Test
 * Uses the same approach as our working test_thumbnails_simple.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const API_PATH = '/api/logo/thumbnails';

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Simple assertion function
function assert(condition, message) {
  testResults.total++;
  
  if (condition) {
    testResults.passed++;
    console.log(`✅ ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${message}`);
  }
}

// Make HTTP request using the same pattern as our working test
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`HTTP error: ${error.message}`));
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log('🚀 Starting Simple Logo Thumbnails API Test');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Basic functionality
    console.log('\n1️⃣ Testing basic functionality...');
    const response1 = await makeRequest(`${BASE_URL}${API_PATH}`);
    assert(response1.status === 200, 'Status code should be 200');
    assert(response1.data.success === true, 'Response should have success: true');
    assert(response1.data.hasOwnProperty('data'), 'Response should have data field');
    assert(response1.data.hasOwnProperty('pagination'), 'Response should have pagination field');
    
    // Test 2: English language
    console.log('\n2️⃣ Testing English language...');
    const response2 = await makeRequest(`${BASE_URL}${API_PATH}?lang=en`);
    assert(response2.status === 200, 'Status code should be 200');
    assert(response2.data.language === 'en', 'Language should be "en"');
    assert(response2.data.direction === 'ltr', 'Direction should be "ltr"');
    
    // Test 3: Arabic language
    console.log('\n3️⃣ Testing Arabic language...');
    const response3 = await makeRequest(`${BASE_URL}${API_PATH}?lang=ar`);
    assert(response3.status === 200, 'Status code should be 200');
    assert(response3.data.language === 'ar', 'Language should be "ar"');
    assert(response3.data.direction === 'rtl', 'Direction should be "rtl"');
    
    // Test 4: Pagination
    console.log('\n4️⃣ Testing pagination...');
    const response4 = await makeRequest(`${BASE_URL}${API_PATH}?page=1&limit=5`);
    assert(response4.status === 200, 'Status code should be 200');
    assert(response4.data.pagination.page === 1, 'Page should be 1');
    assert(response4.data.pagination.limit === 5, 'Limit should be 5');
    
    // Test 5: Category filtering
    console.log('\n5️⃣ Testing category filtering...');
    const gamingCategoryId = 'e8a45f2f-0c09-43dd-9741-fca53a074be8';
    const response5 = await makeRequest(`${BASE_URL}${API_PATH}?category_id=${gamingCategoryId}`);
    assert(response5.status === 200, 'Status code should be 200');
    
    // Test 6: Combined parameters
    console.log('\n6️⃣ Testing combined parameters...');
    const response6 = await makeRequest(`${BASE_URL}${API_PATH}?lang=ar&page=1&limit=3&category_id=${gamingCategoryId}`);
    assert(response6.status === 200, 'Status code should be 200');
    assert(response6.data.language === 'ar', 'Language should be Arabic');
    assert(response6.data.pagination.page === 1, 'Page should be 1');
    assert(response6.data.pagination.limit === 3, 'Limit should be 3');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    testResults.failed++;
    testResults.total++;
  }
  
  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! The Logo Thumbnails API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the API implementation.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
