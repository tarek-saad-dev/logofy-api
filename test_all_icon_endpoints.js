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
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
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
      timeout: 10000 // 10 second timeout
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

// Test data storage
let testData = {
  iconId: null,
  categoryId: null,
  categoryId2: null,
  iconIds: []
};

// ============================================
// ICON ENDPOINTS TESTS
// ============================================

async function testGetAllIcons() {
  logTest('GET /api/logo/icons - Get all icons');

  const result = await makeRequest('GET', '/logo/icons', null, { page: 1, limit: 10 });
  
  if (result.success && result.data.success) {
    logSuccess('Get all icons endpoint works');
    const icons = result.data.data;
    const iconCount = Array.isArray(icons) ? icons.length : (icons?.icons?.length || 0);
    log(`  Found ${iconCount} icons`);
    
    // Store first icon ID for later tests
    if (Array.isArray(icons) && icons.length > 0) {
      testData.iconId = icons[0].id;
      log(`  Stored icon ID: ${testData.iconId}`);
    } else if (icons?.icons?.length > 0) {
      testData.iconId = icons.icons[0].id;
      log(`  Stored icon ID: ${testData.iconId}`);
    }
    
    return true;
  } else {
    const errorMsg = typeof result.error === 'object' ? JSON.stringify(result.error, null, 2) : result.error;
    logError('Get all icons endpoint failed', errorMsg);
    log(`  Status: ${result.status}`, 'yellow');
    return false;
  }
}

async function testGetAllIconsWithFilters() {
  logTest('GET /api/logo/icons - With filters (type, search, icon_category_id)');

  // Test with type filter
  let result = await makeRequest('GET', '/logo/icons', null, { type: 'vector', limit: 5 });
  if (result.success && result.data.success) {
    logSuccess('Filter by type=vector works');
  } else {
    logError('Filter by type failed', result.error);
  }

  // Test with search
  result = await makeRequest('GET', '/logo/icons', null, { search: 'icon', limit: 5 });
  if (result.success && result.data.success) {
    logSuccess('Search filter works');
  } else {
    logError('Search filter failed', result.error);
  }

  // Test with icon_category_id (if we have a category)
  if (testData.categoryId) {
    result = await makeRequest('GET', '/logo/icons', null, { icon_category_id: testData.categoryId, limit: 5 });
    if (result.success && result.data.success) {
      logSuccess('Filter by icon_category_id works');
    } else {
      logError('Filter by icon_category_id failed', result.error);
    }
  }

  return true;
}

async function testGetIconsLibrary() {
  logTest('GET /api/logo/icons/library - Icon library endpoint');

  const result = await makeRequest('GET', '/logo/icons/library', null, { page: 1, limit: 10 });
  
  if (result.success && result.data.success) {
    logSuccess('Icon library endpoint works');
    log(`  Found ${result.data.data?.icons?.length || result.data.data?.length || 0} icons`);
    return true;
  } else {
    logError('Icon library endpoint failed', result.error);
    return false;
  }
}

async function testGetIconById() {
  logTest('GET /api/logo/icons/:id - Get icon by ID');

  // Try to get icon ID from create test first, otherwise use stored one
  const iconIdToTest = testData.createdIconId || testData.iconId;
  
  if (!iconIdToTest) {
    logError('No icon ID available for testing');
    log('  Tip: This test requires an icon to exist. Create icon test should run first.', 'yellow');
    return false;
  }

  const result = await makeRequest('GET', `/logo/icons/${iconIdToTest}`, null, { include_categories: 'true' });
  
  if (result.success && result.data.success) {
    logSuccess('Get icon by ID works');
    log(`  Icon: ${result.data.data?.name || result.data.data?.kind || 'N/A'}`);
    // Store for other tests
    if (!testData.iconId) {
      testData.iconId = iconIdToTest;
    }
    return true;
  } else {
    logError('Get icon by ID failed', result.error);
    return false;
  }
}

async function testGetIconByIdNotFound() {
  logTest('GET /api/logo/icons/:id - Not found test');

  const fakeId = '00000000-0000-0000-0000-000000000000';
  const result = await makeRequest('GET', `/logo/icons/${fakeId}`);
  
  if (!result.success && result.status === 404) {
    logSuccess('404 handling works for non-existent icon');
    return true;
  } else {
    logError('404 handling failed', result.error);
    return false;
  }
}

async function testCreateIcon() {
  logTest('POST /api/logo/icons - Create new icon');

  const iconData = {
    name: `Test Icon ${Date.now()}`,
    url: 'https://example.com/test-icon.svg',
    type: 'vector',
    width: 100,
    height: 100,
    hasAlpha: true,
    category: 'test',
    tags: ['test', 'automated'],
    description: 'Test icon created by automated test'
  };

  const result = await makeRequest('POST', '/logo/icons', iconData);
  
  if (result.success && result.data.success && result.data.data?.id) {
    logSuccess('Create icon works');
    testData.createdIconId = result.data.data.id;
    log(`  Created icon ID: ${testData.createdIconId}`);
    return true;
  } else {
    logError('Create icon failed', result.error);
    return false;
  }
}

async function testUpdateIcon() {
  logTest('PATCH /api/logo/icons/:id - Update icon');

  if (!testData.createdIconId) {
    logError('No created icon ID available for testing');
    return false;
  }

  const updateData = {
    name: `Updated Test Icon ${Date.now()}`
  };

  const result = await makeRequest('PATCH', `/logo/icons/${testData.createdIconId}`, updateData);
  
  if (result.success && result.data.success) {
    logSuccess('Update icon works');
    return true;
  } else {
    logError('Update icon failed', result.error);
    return false;
  }
}

async function testDeleteIcon() {
  logTest('DELETE /api/logo/icons/:id - Delete icon');

  if (!testData.createdIconId) {
    logError('No created icon ID available for testing');
    return false;
  }

  const result = await makeRequest('DELETE', `/logo/icons/${testData.createdIconId}`);
  
  if (result.success && result.data.success) {
    logSuccess('Delete icon works');
    testData.createdIconId = null;
    return true;
  } else {
    logError('Delete icon failed', result.error);
    return false;
  }
}

// ============================================
// ICON CATEGORY ENDPOINTS TESTS
// ============================================

async function testGetAllCategories() {
  logTest('GET /api/icon-categories - Get all categories');

  const result = await makeRequest('GET', '/icon-categories', null, { include_counts: 'true', lang: 'en' });
  
  if (result.success && result.data.success !== false) {
    logSuccess('Get all categories endpoint works');
    const categories = result.data.data?.categories || result.data.data || [];
    log(`  Found ${categories.length} categories`);
    
    // Store first category ID for later tests
    if (categories.length > 0) {
      testData.categoryId = categories[0].id;
      log(`  Stored category ID: ${testData.categoryId}`);
    }
    
    return true;
  } else {
    const errorMsg = typeof result.error === 'object' ? JSON.stringify(result.error, null, 2) : result.error;
    logError('Get all categories endpoint failed', errorMsg);
    log(`  Status: ${result.status}`, 'yellow');
    return false;
  }
}

async function testGetCategoryById() {
  logTest('GET /api/icon-categories/:id - Get category by ID');

  if (!testData.categoryId) {
    logError('No category ID available for testing');
    return false;
  }

  const result = await makeRequest('GET', `/icon-categories/${testData.categoryId}`, null, { lang: 'en' });
  
  if (result.success && result.data.success !== false) {
    logSuccess('Get category by ID works');
    log(`  Category: ${result.data.data?.name || result.data.data?.categoryName || 'N/A'}`);
    return true;
  } else {
    logError('Get category by ID failed', result.error);
    return false;
  }
}

async function testCreateCategory() {
  logTest('POST /api/icon-categories - Create new category');

  const categoryData = {
    name: `Test Category ${Date.now()}`,
    name_en: `Test Category ${Date.now()}`,
    name_ar: `فئة تجريبية ${Date.now()}`,
    description: 'Test category created by automated test',
    description_en: 'Test category created by automated test',
    description_ar: 'فئة تجريبية تم إنشاؤها بواسطة اختبار تلقائي',
    slug: `test-category-${Date.now()}`,
    is_active: true,
    sort_order: 0
  };

  const result = await makeRequest('POST', '/icon-categories', categoryData);
  
  if (result.success && (result.data.success !== false || result.data.data?.id)) {
    logSuccess('Create category works');
    testData.createdCategoryId = result.data.data?.id || result.data.id;
    log(`  Created category ID: ${testData.createdCategoryId}`);
    return true;
  } else {
    const errorMsg = typeof result.error === 'object' ? JSON.stringify(result.error, null, 2) : result.error;
    logError('Create category failed', errorMsg);
    log(`  Status: ${result.status}`, 'yellow');
    return false;
  }
}

async function testUpdateCategory() {
  logTest('PATCH /api/icon-categories/:id - Update category');

  if (!testData.createdCategoryId) {
    logError('No created category ID available for testing');
    return false;
  }

  const updateData = {
    name: `Updated Test Category ${Date.now()}`,
    description: 'Updated description'
  };

  const result = await makeRequest('PATCH', `/icon-categories/${testData.createdCategoryId}`, updateData);
  
  if (result.success && (result.data.success !== false || result.data.data)) {
    logSuccess('Update category works');
    return true;
  } else {
    logError('Update category failed', result.error);
    return false;
  }
}

async function testGetIconsInCategory() {
  logTest('GET /api/icon-categories/:id/icons - Get icons in category');

  if (!testData.categoryId) {
    logError('No category ID available for testing');
    return false;
  }

  const result = await makeRequest('GET', `/icon-categories/${testData.categoryId}/icons`, null, { page: 1, limit: 10 });
  
  if (result.success && result.data.success !== false) {
    logSuccess('Get icons in category works');
    const icons = result.data.data?.icons || [];
    log(`  Found ${icons.length} icons in category`);
    
    // Store icon IDs for assignment tests
    if (icons.length > 0) {
      testData.iconIds = icons.slice(0, 3).map(i => i.id);
    }
    
    return true;
  } else {
    logError('Get icons in category failed', result.error);
    return false;
  }
}

async function testAssignIconsToCategory() {
  logTest('POST /api/icon-categories/:id/icons - Assign icons to category');

  const categoryId = testData.createdCategoryId || testData.categoryId;
  const iconId = testData.createdIconId || testData.iconId;

  if (!categoryId || !iconId) {
    logError('Missing category ID or icon ID for testing');
    log(`  Category ID: ${categoryId ? 'available' : 'missing'}`);
    log(`  Icon ID: ${iconId ? 'available' : 'missing'}`, 'yellow');
    return false;
  }

  const assignData = {
    icon_ids: [iconId]
  };

  const result = await makeRequest('POST', `/icon-categories/${categoryId}/icons`, assignData);
  
  if (result.success && (result.data.success !== false || result.data.data)) {
    logSuccess('Assign icons to category works');
    return true;
  } else {
    logError('Assign icons to category failed', result.error);
    return false;
  }
}

async function testGetCategoriesByIcon() {
  logTest('GET /api/icon-categories/by-icon/:iconId - Get categories for icon');

  const iconId = testData.createdIconId || testData.iconId;
  
  if (!iconId) {
    logError('No icon ID available for testing');
    log('  Tip: This test requires an icon to exist.', 'yellow');
    return false;
  }

  const result = await makeRequest('GET', `/icon-categories/by-icon/${iconId}`, null, { lang: 'en' });
  
  if (result.success && result.data.success !== false) {
    logSuccess('Get categories by icon works');
    const categories = result.data.data?.categories || [];
    log(`  Icon belongs to ${categories.length} categories`);
    return true;
  } else {
    logError('Get categories by icon failed', result.error);
    return false;
  }
}

async function testRemoveIconFromCategory() {
  logTest('DELETE /api/icon-categories/:categoryId/icons/:iconId - Remove icon from category');

  const categoryId = testData.createdCategoryId || testData.categoryId;
  const iconId = testData.createdIconId || testData.iconId;

  if (!categoryId || !iconId) {
    logError('Missing category ID or icon ID for testing');
    log(`  Category ID: ${categoryId ? 'available' : 'missing'}`);
    log(`  Icon ID: ${iconId ? 'available' : 'missing'}`, 'yellow');
    return false;
  }

  const result = await makeRequest('DELETE', `/icon-categories/${categoryId}/icons/${iconId}`);
  
  if (result.success && (result.data.success !== false || result.status === 200)) {
    logSuccess('Remove icon from category works');
    return true;
  } else {
    // This might fail if icon wasn't assigned, which is okay
    if (result.status === 404) {
      log(`  Icon not assigned to category (expected)`, 'yellow');
      return true;
    }
    logError('Remove icon from category failed', result.error);
    return false;
  }
}

async function testDeleteCategory() {
  logTest('DELETE /api/icon-categories/:id - Delete category');

  if (!testData.createdCategoryId) {
    logError('No created category ID available for testing');
    return false;
  }

  const result = await makeRequest('DELETE', `/icon-categories/${testData.createdCategoryId}`);
  
  if (result.success && (result.data.success !== false || result.status === 200)) {
    logSuccess('Delete category works');
    testData.createdCategoryId = null;
    return true;
  } else {
    logError('Delete category failed', result.error);
    return false;
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('ICON & ICON CATEGORY ENDPOINTS TEST SUITE', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  log(`Testing against: ${BASE_URL}\n`, 'cyan');

  try {
    // Test icon endpoints
    await testGetAllIcons();
    await testGetAllIconsWithFilters();
    await testGetIconsLibrary();
    
    // Create icon for testing - must create before testing by ID
    await testCreateIcon();
    await testGetIconById(); // Now we have an icon ID
    await testGetIconByIdNotFound();
    await testUpdateIcon();
    
    // Test category endpoints
    await testGetAllCategories();
    await testGetCategoryById();
    await testCreateCategory();
    await testUpdateCategory();
    await testGetIconsInCategory();
    
    // Test icon-category relationships (need both icon and category)
    await testAssignIconsToCategory();
    await testGetCategoriesByIcon();
    await testRemoveIconFromCategory();
    
    // Clean up
    await testDeleteCategory();
    await testDeleteIcon();

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

    log('\n' + '='.repeat(60) + '\n', 'bright');

    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    logError('Test suite failed with unexpected error', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();

