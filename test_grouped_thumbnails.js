const axios = require('axios');

// Test the modified thumbnails endpoint
async function testGroupedThumbnails() {
  try {
    console.log('Testing grouped thumbnails endpoint...\n');
    
    const baseUrl = 'http://localhost:3000'; // Adjust if your server runs on different port
    const endpoint = `${baseUrl}/api/logo/thumbnails`;
    
    console.log(`Making request to: ${endpoint}`);
    
    const response = await axios.get(endpoint, {
      params: {
        page: 1,
        limit: 10
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Data Structure:');
    console.log('- Success:', response.data.success);
    console.log('- Data Type:', Array.isArray(response.data.data) ? 'Array' : typeof response.data.data);
    console.log('- Data Length:', response.data.data.length);
    console.log('- Pagination:', response.data.pagination);
    
    console.log('\nSample Data Structure:');
    if (response.data.data.length > 0) {
      const firstGroup = response.data.data[0];
      console.log('First Category Group:');
      console.log('- Category ID:', firstGroup.category?.id);
      console.log('- Category Name:', firstGroup.category?.name);
      console.log('- Logos Count:', firstGroup.logos?.length);
      
      if (firstGroup.logos && firstGroup.logos.length > 0) {
        console.log('- First Logo Sample:');
        const firstLogo = firstGroup.logos[0];
        console.log('  - ID:', firstLogo.id);
        console.log('  - Title:', firstLogo.title);
        console.log('  - Thumbnail URL:', firstLogo.thumbnailUrl);
        console.log('  - Category ID:', firstLogo.categoryId);
        console.log('  - Category Name:', firstLogo.categoryName);
      }
    }
    
    console.log('\nFull Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing endpoint:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

// Test with category filter
async function testWithCategoryFilter() {
  try {
    console.log('\n\nTesting with category filter...\n');
    
    const baseUrl = 'http://localhost:3000';
    const endpoint = `${baseUrl}/api/logo/thumbnails`;
    
    const response = await axios.get(endpoint, {
      params: {
        page: 1,
        limit: 5,
        category_id: 1 // Test with a specific category ID
      }
    });
    
    console.log('Category Filter Test Response:');
    console.log('- Success:', response.data.success);
    console.log('- Data Length:', response.data.data.length);
    console.log('- Categories Count:', response.data.pagination.categoriesCount);
    
  } catch (error) {
    console.error('Error testing category filter:', error.message);
  }
}

// Run tests
async function runTests() {
  await testGroupedThumbnails();
  await testWithCategoryFilter();
}

runTests();
