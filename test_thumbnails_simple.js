// Simple test for the thumbnails API endpoint
// This test uses the built-in fetch (Node.js 18+) or provides instructions

console.log('🧪 Testing Thumbnails API Endpoint...\n');

// Check if we're running Node.js 18+ with built-in fetch
if (typeof fetch === 'undefined') {
  console.log('❌ This test requires Node.js 18+ with built-in fetch, or you can:');
  console.log('1. Install node-fetch: npm install node-fetch');
  console.log('2. Or test manually with curl commands:');
  console.log('');
  console.log('curl -s http://localhost:3000/api/logo/thumbnails | jq');
  console.log('curl -s "http://localhost:3000/api/logo/thumbnails?page=1&limit=5" | jq');
  console.log('curl -s "http://localhost:3000/api/logo/thumbnails?category_id=test-category" | jq');
  console.log('');
  console.log('📋 API Endpoint Details:');
  console.log('GET /api/logo/thumbnails');
  console.log('Query Parameters:');
  console.log('  - page (number, default 1)');
  console.log('  - limit (number, default 20, max 100)');
  console.log('  - category_id (string, optional)');
  console.log('');
  console.log('Response Format:');
  console.log(JSON.stringify({
    success: true,
    data: [{
      id: "<uuid>",
      title: "Logo Name",
      thumbnailUrl: "https://...",
      categoryId: "<uuid|null>",
      categoryName: "Category Name",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    }],
    pagination: { page: 1, limit: 20, total: 123, pages: 7 }
  }, null, 2));
  process.exit(1);
}

async function testThumbnailsAPI() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('1️⃣ Testing GET /api/logo/thumbnails');
    const response = await fetch(`${baseUrl}/api/logo/thumbnails`);
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Thumbnails API is working!');
      console.log(`📊 Found ${result.data.data.length} logos`);
      console.log(`📄 Pagination: page ${result.data.pagination.page} of ${result.data.pagination.pages}, total: ${result.data.pagination.total}`);
      
      if (result.data.data.length > 0) {
        console.log('📝 Sample logo:', {
          id: result.data.data[0].logos[0].id,
          title: result.data.data[0].logos[0].title,
          thumbnailUrl: result.data.data[0].logos[0].thumbnailUrl,
          categoryName: result.data.data[0].logos[0].categoryName
        });
      }
    } else {
      console.log('❌ FAILED: API returned error');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ ERROR: Failed to test API');
    console.log('Error:', error.message);
    console.log('Make sure your server is running on http://localhost:3000');
  }
}

// Run the test
testThumbnailsAPI();
