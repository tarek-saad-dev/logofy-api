const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/logo';

// Read the comprehensive logo JSON with all layers
const fs = require('fs');
const comprehensiveLogo = JSON.parse(fs.readFileSync('./comprehensive_logo_all_layers.json', 'utf8'));

async function testAllLayersLogo() {
  console.log('🧪 Testing Complete Logo with All Layer Types\n');
  
  try {
    // Test 1: Create comprehensive logo
    console.log('1️⃣ Creating complete logo with all layer types...');
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
        const uniqueTypes = [...new Set(layerTypes)];
        console.log(`   Layer types: ${uniqueTypes.join(', ')}`);
        console.log(`   Total layers: ${layerTypes.length}`);
        
        // Count each layer type
        const layerCounts = {};
        layerTypes.forEach(type => {
          layerCounts[type] = (layerCounts[type] || 0) + 1;
        });
        console.log('   Layer counts:');
        Object.entries(layerCounts).forEach(([type, count]) => {
          console.log(`     ${type}: ${count}`);
        });
        
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
        let layerIssues = [];
        
        getResponse.data.data.layers.forEach((layer, index) => {
          const requiredProps = ['layerId', 'type', 'visible', 'order', 'position', 'scaleFactor', 'rotation', 'opacity', 'flip'];
          const missingProps = requiredProps.filter(prop => !(prop in layer));
          
          if (missingProps.length > 0) {
            layerIssues.push(`Layer ${index + 1} (${layer.type}) missing properties: ${missingProps.join(', ')}`);
            allPropertiesValid = false;
          }
          
          // Check type-specific properties
          if (layer.type === 'text' && !layer.text) {
            layerIssues.push(`Layer ${index + 1} (text) missing text property`);
            allPropertiesValid = false;
          }
          if (layer.type === 'icon' && !layer.icon) {
            layerIssues.push(`Layer ${index + 1} (icon) missing icon property`);
            allPropertiesValid = false;
          }
          if (layer.type === 'image' && !layer.image) {
            layerIssues.push(`Layer ${index + 1} (image) missing image property`);
            allPropertiesValid = false;
          }
          if (layer.type === 'shape' && !layer.shape) {
            layerIssues.push(`Layer ${index + 1} (shape) missing shape property`);
            allPropertiesValid = false;
          }
          if (layer.type === 'background' && !layer.background) {
            layerIssues.push(`Layer ${index + 1} (background) missing background property`);
            allPropertiesValid = false;
          }
        });
        
        if (allPropertiesValid) {
          console.log('✅ All layer properties are valid!');
        } else {
          console.log('❌ Layer property issues found:');
          layerIssues.forEach(issue => console.log(`   ${issue}`));
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
        
        // Test 7: Test multilingual support
        console.log('\n7️⃣ Testing multilingual support...');
        const arResponse = await axios.get(`${BASE_URL}/${logoId}/mobile?lang=ar`);
        if (arResponse.data.success) {
          console.log('✅ Arabic language support works!');
          console.log(`   Arabic name: ${arResponse.data.data.name}`);
        } else {
          console.log('❌ Arabic language support failed');
        }
        
        // Test 8: Test flip properties
        console.log('\n8️⃣ Testing flip properties...');
        const flippedLayers = getResponse.data.data.layers.filter(layer => 
          layer.flip.horizontal || layer.flip.vertical
        );
        console.log(`   Layers with flip: ${flippedLayers.length}`);
        
        // Test 9: Test rotation properties
        console.log('\n9️⃣ Testing rotation properties...');
        const rotatedLayers = getResponse.data.data.layers.filter(layer => 
          layer.rotation !== 0
        );
        console.log(`   Layers with rotation: ${rotatedLayers.length}`);
        
        // Test 10: Test opacity properties
        console.log('\n🔟 Testing opacity properties...');
        const semiTransparentLayers = getResponse.data.data.layers.filter(layer => 
          layer.opacity < 1.0
        );
        console.log(`   Semi-transparent layers: ${semiTransparentLayers.length}`);
        
        console.log('\n🎉 All tests completed successfully!');
        console.log(`📊 Summary: ${getResponse.data.data.layers.length} layers with ${uniqueTypes.length} different types`);
        
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
testAllLayersLogo().then(() => {
  console.log('\n🎉 Complete logo test finished!');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
