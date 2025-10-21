const axios = require('axios');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/logo`;

// Test data for creating sample icons
const sampleIcons = [
  {
    name: 'home-icon',
    url: 'https://example.com/icons/home.svg',
    type: 'vector',
    width: 24,
    height: 24,
    hasAlpha: true,
    meta: {
      library_type: 'icon',
      category: 'navigation',
      tags: ['home', 'house', 'navigation'],
      description: 'Home icon for navigation',
      style: 'outline',
      is_featured: true,
      download_count: 150
    }
  },
  {
    name: 'user-icon',
    url: 'https://example.com/icons/user.svg',
    type: 'vector',
    width: 24,
    height: 24,
    hasAlpha: true,
    meta: {
      library_type: 'icon',
      category: 'user',
      tags: ['user', 'person', 'profile'],
      description: 'User profile icon',
      style: 'outline',
      is_popular: true,
      download_count: 200
    }
  },
  {
    name: 'settings-icon',
    url: 'https://example.com/icons/settings.svg',
    type: 'vector',
    width: 24,
    height: 24,
    hasAlpha: true,
    meta: {
      library_type: 'icon',
      category: 'system',
      tags: ['settings', 'gear', 'configuration'],
      description: 'Settings configuration icon',
      style: 'outline',
      download_count: 75
    }
  }
];

async function testIconEndpoints() {
  console.log('🧪 Testing Icon Library Endpoints...\n');

  try {
    // Test 1: Create sample icons
    console.log('1. Creating sample icons...');
    for (const iconData of sampleIcons) {
      try {
        const response = await axios.post(`${API_BASE}/icons`, iconData);
        console.log(`   ✅ Created icon: ${iconData.name} (ID: ${response.data.data.id})`);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
          console.log(`   ⚠️  Icon ${iconData.name} already exists, skipping...`);
        } else {
          console.log(`   ❌ Failed to create icon ${iconData.name}:`, error.response?.data?.message || error.message);
        }
      }
    }

    // Test 2: Get all icons (basic endpoint)
    console.log('\n2. Testing GET /api/logo/icons...');
    try {
      const response = await axios.get(`${API_BASE}/icons`);
      console.log(`   ✅ Retrieved ${response.data.data.length} icons`);
      console.log(`   📊 Pagination: Page ${response.data.pagination.page} of ${response.data.pagination.pages}`);
    } catch (error) {
      console.log('   ❌ Failed to get icons:', error.response?.data?.message || error.message);
    }

    // Test 3: Get icon library (enhanced endpoint)
    console.log('\n3. Testing GET /api/logo/icons/library...');
    try {
      const response = await axios.get(`${API_BASE}/icons/library`);
      console.log(`   ✅ Retrieved ${response.data.data.icons.length} icons from library`);
      console.log(`   📊 Total icons: ${response.data.data.totalIcons}`);
      console.log(`   🏷️  Categories: ${response.data.data.categories.length}`);
      console.log(`   🔍 Available filters:`, Object.keys(response.data.filters));
    } catch (error) {
      console.log('   ❌ Failed to get icon library:', error.response?.data?.message || error.message);
    }

    // Test 4: Test filtering by category
    console.log('\n4. Testing category filtering...');
    try {
      const response = await axios.get(`${API_BASE}/icons/library?category=navigation`);
      console.log(`   ✅ Found ${response.data.data.icons.length} navigation icons`);
    } catch (error) {
      console.log('   ❌ Failed to filter by category:', error.response?.data?.message || error.message);
    }

    // Test 5: Test search functionality
    console.log('\n5. Testing search functionality...');
    try {
      const response = await axios.get(`${API_BASE}/icons/library?search=user`);
      console.log(`   ✅ Found ${response.data.data.icons.length} icons matching "user"`);
    } catch (error) {
      console.log('   ❌ Failed to search icons:', error.response?.data?.message || error.message);
    }

    // Test 6: Test featured icons
    console.log('\n6. Testing featured icons...');
    try {
      const response = await axios.get(`${API_BASE}/icons/featured`);
      console.log(`   ✅ Found ${response.data.data.length} featured icons`);
    } catch (error) {
      console.log('   ❌ Failed to get featured icons:', error.response?.data?.message || error.message);
    }

    // Test 7: Test categories endpoint
    console.log('\n7. Testing categories endpoint...');
    try {
      const response = await axios.get(`${API_BASE}/icons/categories`);
      console.log(`   ✅ Found ${response.data.data.length} categories`);
      response.data.data.forEach(cat => {
        console.log(`   📁 ${cat.name}: ${cat.totalCount} icons (${cat.featuredCount} featured)`);
      });
    } catch (error) {
      console.log('   ❌ Failed to get categories:', error.response?.data?.message || error.message);
    }

    // Test 8: Test pagination
    console.log('\n8. Testing pagination...');
    try {
      const response = await axios.get(`${API_BASE}/icons/library?page=1&limit=2`);
      console.log(`   ✅ Page 1: ${response.data.data.icons.length} icons`);
      console.log(`   📊 Pagination info:`, response.data.pagination);
    } catch (error) {
      console.log('   ❌ Failed to test pagination:', error.response?.data?.message || error.message);
    }

    // Test 9: Test sorting
    console.log('\n9. Testing sorting...');
    try {
      const response = await axios.get(`${API_BASE}/icons/library?sort=name&order=asc`);
      console.log(`   ✅ Sorted by name (ASC): ${response.data.data.icons.length} icons`);
      if (response.data.data.icons.length > 0) {
        console.log(`   📝 First icon: ${response.data.data.icons[0].name}`);
      }
    } catch (error) {
      console.log('   ❌ Failed to test sorting:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Icon library endpoint testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  testIconEndpoints();
}

module.exports = { testIconEndpoints };