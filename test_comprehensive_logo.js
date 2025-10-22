const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/logo';

// Read the comprehensive logo JSON
const fs = require('fs');
const comprehensiveLogo = JSON.parse(fs.readFileSync('./comprehensive_logo_example.json', 'utf8'));

async function testComprehensiveLogo() {
  console.log('🧪 Testing Comprehensive Logo with All Layer Types\n');
  
  try {
    // Test 1: Create comprehensive logo
    console.log('1️⃣ Creating comprehensive logo with all layer types...');
    const createResponse = await axios.post(`${BASE_URL}/mobile`, comprehensiveLogo);
    
    if (createResponse.data.success) {
      console.log('✅ Logo created successfully!');
      console.log(`   Logo ID: ${createResponse.data.data.logoId}`);
      console.log(`   Layers created: ${createResponse.data.data.layers.length}`);
      
      const logoId = createResponse.data.data.logoId;
      
      // Test 2: Get the logo back in mobile format
      console.log('\n2️⃣ Retrieving logo in mobile format...');
      const getResponse = await axios.get(`${BASE_URL}/${logoId}/mobile`);
      
      if (getResponse.data.success) {
        console.log('✅ Logo retrieved successfully!');
        console.log(`   Name: ${getResponse.data.data.name}`);
        console.log(`   Layers: ${getResponse.data.data.layers.length}`);
        console.log(`   Canvas aspect ratio: ${getResponse.data.data.canvas.aspectRatio}`);
        
        // Verify layer types
        const layerTypes = getResponse.data.data.layers.map(layer => layer.type);
        console.log(`   Layer types: ${layerTypes.join(', ')}`);
        
        // Test 3: Get the logo in legacy format
        console.log('\n3️⃣ Retrieving logo in legacy format...');
        const legacyResponse = await axios.get(`${BASE_URL}/${logoId}/mobile/legacy`);
        
        if (legacyResponse.data.success) {
          console.log('✅ Logo retrieved in legacy format successfully!');
          console.log(`   Legacy format: ${legacyResponse.data.data.metadata.legacyFormat}`);
          console.log(`   Mobile optimized: ${legacyResponse.data.data.metadata.mobileOptimized}`);
          console.log(`   Legacy version: ${legacyResponse.data.data.metadata.legacyVersion}`);
          
          // Verify gradient transformation
          const hasGradient = legacyResponse.data.data.canvas.background.gradient !== null;
          console.log(`   Has gradient background: ${hasGradient}`);
          
          if (hasGradient) {
            console.log(`   Gradient stops: ${legacyResponse.data.data.canvas.background.gradient.stops.length}`);
          }
        } else {
          console.log('❌ Failed to retrieve logo in legacy format');
          console.log(`   Error: ${legacyResponse.data.message}`);
        }
        
        // Test 4: Verify all layer types are present
        console.log('\n4️⃣ Verifying all layer types...');
        const expectedTypes = ['background', 'shape', 'text', 'icon', 'image'];
        const actualTypes = [...new Set(getResponse.data.data.layers.map(layer => layer.type))];
        
        const missingTypes = expectedTypes.filter(type => !actualTypes.includes(type));
        const extraTypes = actualTypes.filter(type => !expectedTypes.includes(type));
        
        if (missingTypes.length === 0 && extraTypes.length === 0) {
          console.log('✅ All expected layer types present!');
        } else {
          if (missingTypes.length > 0) {
            console.log(`❌ Missing layer types: ${missingTypes.join(', ')}`);
          }
          if (extraTypes.length > 0) {
            console.log(`⚠️  Extra layer types: ${extraTypes.join(', ')}`);
          }
        }
        
        // Test 5: Verify layer properties
        console.log('\n5️⃣ Verifying layer properties...');
        let allPropertiesValid = true;
        
        getResponse.data.data.layers.forEach((layer, index) => {
          const requiredProps = ['layerId', 'type', 'visible', 'order', 'position', 'scaleFactor', 'rotation', 'opacity', 'flip'];
          const missingProps = requiredProps.filter(prop => !(prop in layer));
          
          if (missingProps.length > 0) {
            console.log(`❌ Layer ${index + 1} (${layer.type}) missing properties: ${missingProps.join(', ')}`);
            allPropertiesValid = false;
          }
          
          // Check type-specific properties
          if (layer.type === 'text' && !layer.text) {
            console.log(`❌ Layer ${index + 1} (text) missing text property`);
            allPropertiesValid = false;
          }
          if (layer.type === 'icon' && !layer.icon) {
            console.log(`❌ Layer ${index + 1} (icon) missing icon property`);
            allPropertiesValid = false;
          }
          if (layer.type === 'image' && !layer.image) {
            console.log(`❌ Layer ${index + 1} (image) missing image property`);
            allPropertiesValid = false;
          }
          if (layer.type === 'shape' && !layer.shape) {
            console.log(`❌ Layer ${index + 1} (shape) missing shape property`);
            allPropertiesValid = false;
          }
          if (layer.type === 'background' && !layer.background) {
            console.log(`❌ Layer ${index + 1} (background) missing background property`);
            allPropertiesValid = false;
          }
        });
        
        if (allPropertiesValid) {
          console.log('✅ All layer properties are valid!');
        }
        
        // Test 6: Performance test
        console.log('\n6️⃣ Performance test...');
        const startTime = Date.now();
        await axios.get(`${BASE_URL}/${logoId}/mobile`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`✅ Response time: ${responseTime}ms`);
        if (responseTime < 1000) {
          console.log('✅ Performance is good (< 1s)');
        } else if (responseTime < 2000) {
          console.log('⚠️  Performance is acceptable (< 2s)');
        } else {
          console.log('❌ Performance is slow (> 2s)');
        }
        
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
testComprehensiveLogo().then(() => {
  console.log('\n🎉 Comprehensive logo test completed!');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
