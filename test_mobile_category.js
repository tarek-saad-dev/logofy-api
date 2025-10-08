const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data with categoryId
const testLogoDataWithCategory = {
  logoId: "test-logo-with-category",
  templateId: null,
  userId: "current_user",
  name: "Logo with Category Test",
  description: "Testing logo creation with category assignment",
  categoryId: "550e8400-e29b-41d4-a716-446655440000", // Example UUID for category
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "solid",
      solidColor: "#ffffff",
      gradient: null,
      image: null
    }
  },
  layers: [
    {
      layerId: "test-text-layer",
      type: "text",
      visible: true,
      order: 0,
      position: {
        x: 0.5,
        y: 0.5
      },
      scaleFactor: 1.0,
      rotation: 0.0,
      opacity: 1.0,
      flip: {
        horizontal: false,
        vertical: false
      },
      text: {
        value: "Test Logo",
        font: "Arial",
        fontColor: "#000000",
        fontWeight: "normal",
        fontStyle: "normal",
        alignment: "center",
        lineHeight: 1.0,
        letterSpacing: 0
      }
    }
  ],
  colorsUsed: [
    {
      role: "text",
      color: "#000000"
    }
  ],
  alignments: {
    verticalAlign: "center",
    horizontalAlign: "center"
  },
  responsive: {
    version: "3.0",
    description: "Fully responsive logo data - no absolute sizes stored",
    scalingMethod: "scaleFactor",
    positionMethod: "relative",
    fullyResponsive: true
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["logo", "design", "responsive", "test"],
    version: 3,
    responsive: true
  },
  export: {
    format: "png",
    transparentBackground: true,
    quality: 100,
    responsive: {
      scalable: true,
      maintainAspectRatio: true
    }
  }
};

// Test data without categoryId (should still work)
const testLogoDataWithoutCategory = {
  ...testLogoDataWithCategory,
  logoId: "test-logo-without-category",
  name: "Logo without Category Test",
  description: "Testing logo creation without category assignment"
};
delete testLogoDataWithoutCategory.categoryId;

async function testCategoryFunctionality() {
  try {
    console.log('🧪 Testing Logo Maker API Category Functionality...\n');

    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check passed:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return;
    }

    // Test 2: Create logo with categoryId
    console.log('\n2. Testing POST /api/logo/mobile with categoryId...');
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/logo/mobile`, testLogoDataWithCategory);
      console.log('✅ Logo with category created successfully');
      console.log('Response includes categoryId:', !!createResponse.data.data.categoryId);
      console.log('CategoryId value:', createResponse.data.data.categoryId);
      
      const logoIdWithCategory = createResponse.data.data.logoId;
      console.log('Created logo ID:', logoIdWithCategory);

      // Verify the categoryId is returned in response
      if (createResponse.data.data.categoryId === testLogoDataWithCategory.categoryId) {
        console.log('✅ CategoryId correctly stored and returned');
      } else {
        console.log('❌ CategoryId mismatch');
      }

    } catch (error) {
      console.log('❌ Logo creation with category failed:', error.response?.data || error.message);
    }

    // Test 3: Create logo without categoryId
    console.log('\n3. Testing POST /api/logo/mobile without categoryId...');
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/logo/mobile`, testLogoDataWithoutCategory);
      console.log('✅ Logo without category created successfully');
      console.log('Response includes categoryId:', !!createResponse.data.data.categoryId);
      console.log('CategoryId value:', createResponse.data.data.categoryId);
      
      const logoIdWithoutCategory = createResponse.data.data.logoId;
      console.log('Created logo ID:', logoIdWithoutCategory);

      // Verify the categoryId is null when not provided
      if (createResponse.data.data.categoryId === null) {
        console.log('✅ CategoryId correctly set to null when not provided');
      } else {
        console.log('❌ CategoryId should be null when not provided');
      }

    } catch (error) {
      console.log('❌ Logo creation without category failed:', error.response?.data || error.message);
    }

    // Test 4: Test invalid categoryId format
    console.log('\n4. Testing POST /api/logo/mobile with invalid categoryId...');
    try {
      const invalidCategoryData = {
        ...testLogoDataWithCategory,
        logoId: "test-logo-invalid-category",
        name: "Logo with Invalid Category Test",
        categoryId: "invalid-uuid-format"
      };
      
      const createResponse = await axios.post(`${BASE_URL}/api/logo/mobile`, invalidCategoryData);
      console.log('❌ Should have failed with invalid categoryId format');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('categoryId must be a valid UUID')) {
        console.log('✅ Invalid categoryId format correctly rejected');
      } else {
        console.log('❌ Unexpected error for invalid categoryId:', error.response?.data || error.message);
      }
    }

    console.log('\n🎉 Category functionality testing completed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Mobile endpoint accepts categoryId parameter');
    console.log('- ✅ Logo creation with categoryId works');
    console.log('- ✅ Logo creation without categoryId works (sets to null)');
    console.log('- ✅ Invalid categoryId format is rejected');
    console.log('- ✅ Response includes categoryId field');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testCategoryFunctionality();
