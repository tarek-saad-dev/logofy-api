const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test data for multilingual category creation
const testCategoryData = {
  name: 'Technology',
  name_en: 'Technology',
  name_ar: 'تقنية',
  description: 'Technology related logos',
  description_en: 'Technology related logos',
  description_ar: 'شعارات متعلقة بالتقنية'
};

async function testMultilingualCategories() {
  console.log('🧪 Testing Multilingual Categories API\n');

  try {
    // Test 1: Create a category with multilingual data
    console.log('1️⃣ Creating category with multilingual data...');
    const categoryResponse = await axios.post(`${BASE_URL}/api/categories`, testCategoryData);
    console.log('✅ Category created:', categoryResponse.data);
    const categoryId = categoryResponse.data.data.id;

    // Test 2: Get category in English
    console.log('\n2️⃣ Getting category in English...');
    const categoryEnResponse = await axios.get(`${BASE_URL}/api/categories/${categoryId}?lang=en`);
    console.log('✅ English category data:');
    console.log('   Name:', categoryEnResponse.data.data.name);
    console.log('   Description:', categoryEnResponse.data.data.description);
    console.log('   Language:', categoryEnResponse.data.data.language);

    // Test 3: Get category in Arabic
    console.log('\n3️⃣ Getting category in Arabic...');
    const categoryArResponse = await axios.get(`${BASE_URL}/api/categories/${categoryId}?lang=ar`);
    console.log('✅ Arabic category data:');
    console.log('   Name:', categoryArResponse.data.data.name);
    console.log('   Description:', categoryArResponse.data.data.description);
    console.log('   Language:', categoryArResponse.data.data.language);

    // Test 4: List all categories in English
    console.log('\n4️⃣ Listing categories in English...');
    const categoriesEnResponse = await axios.get(`${BASE_URL}/api/categories?lang=en`);
    console.log('✅ English categories:');
    console.log('   Count:', categoriesEnResponse.data.data.length);
    if (categoriesEnResponse.data.data.length > 0) {
      console.log('   First category name:', categoriesEnResponse.data.data[0].name);
    }

    // Test 5: List all categories in Arabic
    console.log('\n5️⃣ Listing categories in Arabic...');
    const categoriesArResponse = await axios.get(`${BASE_URL}/api/categories?lang=ar`);
    console.log('✅ Arabic categories:');
    console.log('   Count:', categoriesArResponse.data.data.length);
    if (categoriesArResponse.data.data.length > 0) {
      console.log('   First category name:', categoriesArResponse.data.data[0].name);
    }

    console.log('\n🎉 All multilingual category tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the API server is running and the database migration has been applied.');
      console.log('   Run: npm run migrate:multilingual');
    }
  }
}

// Run the test
testMultilingualCategories();
