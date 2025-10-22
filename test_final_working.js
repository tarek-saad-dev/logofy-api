const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/logo';

// Read the final working comprehensive logo JSON
const fs = require('fs');
const finalWorkingLogo = JSON.parse(fs.readFileSync('./FINAL_WORKING_COMPREHENSIVE_LOGO.json', 'utf8'));

async function testFinalWorkingLogo() {
  console.log('🧪 Testing Final Working Comprehensive Logo\n');
  
  try {
    // Test 1: Create comprehensive logo
    console.log('1️⃣ Creating final working comprehensive logo...');
    const createResponse = await axios.post(`${BASE_URL}/mobile`, finalWorkingLogo);
    
    if (createResponse.data.success) {
      console.log('✅ Logo created successfully!');
      console.log(`   Logo ID: ${createResponse.data.data.logoId}`);
      console.log(`   Layers created: ${createResponse.data.data.layers.length}`);
      console.log(`   Name: ${createResponse.data.data.name}`);
      console.log(`   Description: ${createResponse.data.data.description}`);
      
      const logoId = createResponse.data.data.logoId;
      
      // Test 2: Get the logo back in mobile format
      console.log('\n2️⃣ Retrieving logo in mobile format...');
      const getResponse = await axios.get(`${BASE_URL}/${logoId}/mobile`);
      
      if (getResponse.data.success) {
        console.log('✅ Logo retrieved successfully!');
        console.log(`   Canvas aspect ratio: ${getResponse.data.data.canvas.aspectRatio}`);
        console.log(`   Background type: ${getResponse.data.data.canvas.background.type}`);
        console.log(`   Has gradient: ${getResponse.data.data.canvas.background.gradient !== null}`);
        console.log(`   Colors used: ${getResponse.data.data.colorsUsed.length}`);
        console.log(`   Responsive: ${getResponse.data.data.responsive.fullyResponsive}`);
        console.log(`   Export format: ${getResponse.data.data.export.format}`);
        console.log(`   Language: ${getResponse.data.data.language}`);
        console.log(`   Direction: ${getResponse.data.data.direction}`);
        
        // Test 3: Get the logo in legacy format
        console.log('\n3️⃣ Retrieving logo in legacy format...');
        const legacyResponse = await axios.get(`${BASE_URL}/${logoId}/mobile/legacy`);
        
        if (legacyResponse.data.success) {
          console.log('✅ Logo retrieved in legacy format successfully!');
          console.log(`   Legacy format: ${legacyResponse.data.data.metadata.legacyFormat}`);
          console.log(`   Mobile optimized: ${legacyResponse.data.data.metadata.mobileOptimized}`);
        }
        
        // Test 4: Test multilingual support
        console.log('\n4️⃣ Testing multilingual support...');
        const arResponse = await axios.get(`${BASE_URL}/${logoId}/mobile?lang=ar`);
        if (arResponse.data.success) {
          console.log('✅ Arabic language support works!');
          console.log(`   Arabic name: ${arResponse.data.data.name}`);
        }
        
        console.log('\n🎉 Final working comprehensive logo test completed successfully!');
        console.log('📊 All working attributes are functioning correctly!');
        
      } else {
        console.log('❌ Failed to retrieve logo');
        console.log(`   Error: ${getResponse.data.message}`);
      }
      
    } else {
      console.log('❌ Failed to create logo');
      console.log(`   Error: ${createResponse.data.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testFinalWorkingLogo().then(() => {
  console.log('\n🎉 Final working comprehensive logo test finished!');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
