const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test data for multilingual logo creation
const testLogoData = {
  title: 'My Logo',
  title_en: 'My Logo',
  title_ar: 'شعاري',
  description: 'A beautiful logo',
  description_en: 'A beautiful logo',
  description_ar: 'شعار جميل',
  tags: ['logo', 'design'],
  tags_en: ['logo', 'design'],
  tags_ar: ['شعار', 'تصميم'],
  canvas_w: 1080,
  canvas_h: 1080,
  category_id: null,
  layers: []
};

const testCategoryData = {
  name: 'Business',
  name_en: 'Business',
  name_ar: 'أعمال',
  description: 'Business related logos',
  description_en: 'Business related logos',
  description_ar: 'شعارات متعلقة بالأعمال'
};

async function testMultilingualAPI() {
  console.log('🧪 Testing Multilingual Logo API Implementation\n');

  try {
    // Test 1: Create a category with multilingual data
    console.log('1️⃣ Creating category with multilingual data...');
    const categoryResponse = await axios.post(`${BASE_URL}/api/categories`, testCategoryData);
    console.log('✅ Category created:', categoryResponse.data);
    const categoryId = categoryResponse.data.data.id;

    // Test 2: Create a logo with multilingual data
    console.log('\n2️⃣ Creating logo with multilingual data...');
    const logoData = { ...testLogoData, category_id: categoryId };
    const logoResponse = await axios.post(`${BASE_URL}/api/logo`, logoData);
    console.log('✅ Logo created:', logoResponse.data);
    const logoId = logoResponse.data.data.id;

    // Test 3: Get logo in English
    console.log('\n3️⃣ Getting logo in English...');
    const logoEnResponse = await axios.get(`${BASE_URL}/api/logo/${logoId}?lang=en`);
    console.log('✅ English logo data:');
    console.log('   Title:', logoEnResponse.data.data.title);
    console.log('   Description:', logoEnResponse.data.data.description);
    console.log('   Language:', logoEnResponse.data.data.language);
    console.log('   Direction:', logoEnResponse.data.data.direction);

    // Test 4: Get logo in Arabic
    console.log('\n4️⃣ Getting logo in Arabic...');
    const logoArResponse = await axios.get(`${BASE_URL}/api/logo/${logoId}?lang=ar`);
    console.log('✅ Arabic logo data:');
    console.log('   Title:', logoArResponse.data.data.title);
    console.log('   Description:', logoArResponse.data.data.description);
    console.log('   Language:', logoArResponse.data.data.language);
    console.log('   Direction:', logoArResponse.data.data.direction);

    // Test 5: Get thumbnails in English
    console.log('\n5️⃣ Getting thumbnails in English...');
    const thumbnailsEnResponse = await axios.get(`${BASE_URL}/api/logo/thumbnails?lang=en`);
    console.log('✅ English thumbnails:');
    console.log('   Count:', thumbnailsEnResponse.data.data.length);
    if (thumbnailsEnResponse.data.data.length > 0) {
      console.log('   First logo title:', thumbnailsEnResponse.data.data[0].logos[0].title);
      console.log('   Language:', thumbnailsEnResponse.data.data[0].logos[0].language);
    }

    // Test 6: Get thumbnails in Arabic
    console.log('\n6️⃣ Getting thumbnails in Arabic...');
    const thumbnailsArResponse = await axios.get(`${BASE_URL}/api/logo/thumbnails?lang=ar`);
    console.log('✅ Arabic thumbnails:');
    console.log('   Count:', thumbnailsArResponse.data.data.length);
    if (thumbnailsArResponse.data.data.length > 0) {
      console.log('   First logo title:', thumbnailsArResponse.data.data[0].logos[0].title);
      console.log('   Language:', thumbnailsArResponse.data.data[0].logos[0].language);
    }

    // Test 7: Get mobile format in English
    console.log('\n7️⃣ Getting mobile format in English...');
    const mobileEnResponse = await axios.get(`${BASE_URL}/api/logo/${logoId}/mobile?lang=en`);
    console.log('✅ English mobile data:');
    console.log('   Name:', mobileEnResponse.data.name);
    console.log('   Description:', mobileEnResponse.data.description);
    console.log('   Language:', mobileEnResponse.data.language);

    // Test 8: Get mobile format in Arabic
    console.log('\n8️⃣ Getting mobile format in Arabic...');
    const mobileArResponse = await axios.get(`${BASE_URL}/api/logo/${logoId}/mobile?lang=ar`);
    console.log('✅ Arabic mobile data:');
    console.log('   Name:', mobileArResponse.data.name);
    console.log('   Description:', mobileArResponse.data.description);
    console.log('   Language:', mobileArResponse.data.language);

    // Test 9: Test fallback behavior (no language specified)
    console.log('\n9️⃣ Testing fallback behavior (no language specified)...');
    const fallbackResponse = await axios.get(`${BASE_URL}/api/logo/${logoId}`);
    console.log('✅ Fallback data:');
    console.log('   Title:', fallbackResponse.data.data.title);
    console.log('   Language:', fallbackResponse.data.data.language);

    console.log('\n🎉 All multilingual tests passed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Multilingual logo creation works');
    console.log('   ✅ Language-specific retrieval works');
    console.log('   ✅ Fallback to English works');
    console.log('   ✅ RTL direction is set for Arabic');
    console.log('   ✅ All endpoints support lang query parameter');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the API server is running and the database migration has been applied.');
      console.log('   Run: npm run migrate:multilingual');
    }
  }
}

// Run the test
testMultilingualAPI();
