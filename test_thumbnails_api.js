const fetch = require('node-fetch');

async function testThumbnailsAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Thumbnails API Endpoint...\n');

  try {
    // Test 1: Get all thumbnails (no category filter)
    console.log('1️⃣ Testing GET /api/logo/thumbnails (all logos)');
    const response1 = await fetch(`${baseUrl}/api/logo/thumbnails`);
    const result1 = await response1.json();
    
    if (response1.ok) {
      console.log('✅ SUCCESS: Got all logo thumbnails');
      console.log(`📊 Found ${result1.data.length} logos (page ${result1.pagination.page} of ${result1.pagination.pages})`);
      if (result1.data.length > 0) {
        console.log('📝 Sample logo:', {
          id: result1.data[0].id,
          title: result1.data[0].title,
          thumbnailUrl: result1.data[0].thumbnailUrl,
          categoryName: result1.data[0].categoryName
        });
      }
    } else {
      console.log('❌ FAILED: Could not get thumbnails');
      console.log('Response:', JSON.stringify(result1, null, 2));
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Get thumbnails with pagination
    console.log('2️⃣ Testing GET /api/logo/thumbnails?page=1&limit=5');
    const response2 = await fetch(`${baseUrl}/api/logo/thumbnails?page=1&limit=5`);
    const result2 = await response2.json();
    
    if (response2.ok) {
      console.log('✅ SUCCESS: Got paginated thumbnails');
      console.log(`📊 Found ${result2.data.length} logos (limit: 5)`);
      console.log(`📄 Pagination: page ${result2.pagination.page} of ${result2.pagination.pages}, total: ${result2.pagination.total}`);
    } else {
      console.log('❌ FAILED: Could not get paginated thumbnails');
      console.log('Response:', JSON.stringify(result2, null, 2));
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Get thumbnails with category filter (if we have categories)
    console.log('3️⃣ Testing GET /api/logo/thumbnails?category_id=test-category');
    const response3 = await fetch(`${baseUrl}/api/logo/thumbnails?category_id=test-category`);
    const result3 = await response3.json();
    
    if (response3.ok) {
      console.log('✅ SUCCESS: Got category-filtered thumbnails');
      console.log(`📊 Found ${result3.data.length} logos in category`);
      if (result3.data.length > 0) {
        console.log('📝 Sample filtered logo:', {
          id: result3.data[0].id,
          title: result3.data[0].title,
          categoryName: result3.data[0].categoryName
        });
      }
    } else {
      console.log('❌ FAILED: Could not get category-filtered thumbnails');
      console.log('Response:', JSON.stringify(result3, null, 2));
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Test with invalid category
    console.log('4️⃣ Testing GET /api/logo/thumbnails?category_id=invalid-category');
    const response4 = await fetch(`${baseUrl}/api/logo/thumbnails?category_id=invalid-category`);
    const result4 = await response4.json();
    
    if (response4.ok) {
      console.log('✅ SUCCESS: Handled invalid category gracefully');
      console.log(`📊 Found ${result4.data.length} logos (should be 0 for invalid category)`);
    } else {
      console.log('❌ FAILED: Could not handle invalid category');
      console.log('Response:', JSON.stringify(result4, null, 2));
    }

  } catch (error) {
    console.log('❌ ERROR: Failed to test thumbnails API');
    console.log('Error:', error.message);
  }
}

// Run the test
testThumbnailsAPI();
