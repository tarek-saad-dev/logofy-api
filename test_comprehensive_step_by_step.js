const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/logo';

async function testComprehensiveStepByStep() {
  console.log('🧪 Testing Comprehensive Logo Step by Step\n');
  
  // Start with basic structure
  const basicLogo = {
    "name": "Comprehensive Test Logo",
    "description": "A comprehensive logo for testing",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "solid",
        "solidColor": "#ffffff"
      }
    },
    "layers": [],
    "colorsUsed": []
  };
  
  try {
    console.log('1️⃣ Creating basic logo structure...');
    let response = await axios.post(`${BASE_URL}/mobile`, basicLogo);
    
    if (!response.data.success) {
      console.log('❌ Basic logo creation failed');
      console.log(`   Error: ${response.data.message}`);
      return;
    }
    
    console.log('✅ Basic logo created successfully!');
    const logoId = response.data.data.logoId;
    
    // Test 2: Add text layer
    console.log('\n2️⃣ Testing text layer...');
    const textLogo = {
      ...basicLogo,
      "layers": [
        {
          "type": "text",
          "visible": true,
          "order": 0,
          "position": { "x": 0.5, "y": 0.5 },
          "scaleFactor": 1.0,
          "rotation": 0,
          "opacity": 1.0,
          "flip": { "horizontal": false, "vertical": false },
          "text": {
            "value": "TEST TEXT",
            "font": "Arial",
            "fontSize": 48,
            "fontColor": "#000000",
            "fontWeight": "bold",
            "fontStyle": "normal",
            "alignment": "center",
            "baseline": "alphabetic",
            "lineHeight": 1.0,
            "letterSpacing": 0,
            "fillAlpha": 1.0,
            "strokeHex": null,
            "strokeAlpha": null,
            "strokeWidth": null,
            "strokeAlign": null,
            "gradient": null,
            "underline": false,
            "underlineDirection": "horizontal",
            "textCase": "normal",
            "textDecoration": "none",
            "textTransform": "none",
            "fontVariant": "normal"
          }
        }
      ],
      "colorsUsed": [
        { "role": "text", "color": "#000000" }
      ]
    };
    
    response = await axios.post(`${BASE_URL}/mobile`, textLogo);
    if (response.data.success) {
      console.log('✅ Text layer works!');
    } else {
      console.log('❌ Text layer failed');
      console.log(`   Error: ${response.data.message}`);
    }
    
    // Test 3: Add shape layer
    console.log('\n3️⃣ Testing shape layer...');
    const shapeLogo = {
      ...basicLogo,
      "layers": [
        {
          "type": "shape",
          "visible": true,
          "order": 0,
          "position": { "x": 0.5, "y": 0.5 },
          "scaleFactor": 1.0,
          "rotation": 0,
          "opacity": 1.0,
          "flip": { "horizontal": false, "vertical": false },
          "shape": {
            "src": null,
            "type": "rect",
            "color": "#ff0000",
            "strokeColor": "#cc0000",
            "strokeWidth": 2
          }
        }
      ],
      "colorsUsed": [
        { "role": "shape", "color": "#ff0000" }
      ]
    };
    
    response = await axios.post(`${BASE_URL}/mobile`, shapeLogo);
    if (response.data.success) {
      console.log('✅ Shape layer works!');
    } else {
      console.log('❌ Shape layer failed');
      console.log(`   Error: ${response.data.message}`);
    }
    
    // Test 4: Add icon layer
    console.log('\n4️⃣ Testing icon layer...');
    const iconLogo = {
      ...basicLogo,
      "layers": [
        {
          "type": "icon",
          "visible": true,
          "order": 0,
          "position": { "x": 0.5, "y": 0.5 },
          "scaleFactor": 1.0,
          "rotation": 0,
          "opacity": 1.0,
          "flip": { "horizontal": false, "vertical": false },
          "icon": {
            "src": "test-icon",
            "color": "#00ff00"
          }
        }
      ],
      "colorsUsed": [
        { "role": "icon", "color": "#00ff00" }
      ]
    };
    
    response = await axios.post(`${BASE_URL}/mobile`, iconLogo);
    if (response.data.success) {
      console.log('✅ Icon layer works!');
    } else {
      console.log('❌ Icon layer failed');
      console.log(`   Error: ${response.data.message}`);
    }
    
    // Test 5: Add image layer
    console.log('\n5️⃣ Testing image layer...');
    const imageLogo = {
      ...basicLogo,
      "layers": [
        {
          "type": "image",
          "visible": true,
          "order": 0,
          "position": { "x": 0.5, "y": 0.5 },
          "scaleFactor": 1.0,
          "rotation": 0,
          "opacity": 1.0,
          "flip": { "horizontal": false, "vertical": false },
          "image": {
            "type": "imported",
            "path": "https://example.com/test-image.jpg",
            "src": "test-image.jpg"
          }
        }
      ],
      "colorsUsed": []
    };
    
    response = await axios.post(`${BASE_URL}/mobile`, imageLogo);
    if (response.data.success) {
      console.log('✅ Image layer works!');
    } else {
      console.log('❌ Image layer failed');
      console.log(`   Error: ${response.data.message}`);
    }
    
    // Test 6: Add background layer
    console.log('\n6️⃣ Testing background layer...');
    const backgroundLogo = {
      ...basicLogo,
      "layers": [
        {
          "type": "background",
          "visible": true,
          "order": 0,
          "position": { "x": 0.5, "y": 0.5 },
          "scaleFactor": 1.0,
          "rotation": 0,
          "opacity": 1.0,
          "flip": { "horizontal": false, "vertical": false },
          "background": {
            "type": "solid",
            "color": "#f0f0f0",
            "image": null,
            "repeat": "no-repeat",
            "position": "center",
            "size": "cover"
          }
        }
      ],
      "colorsUsed": [
        { "role": "background", "color": "#f0f0f0" }
      ]
    };
    
    response = await axios.post(`${BASE_URL}/mobile`, backgroundLogo);
    if (response.data.success) {
      console.log('✅ Background layer works!');
    } else {
      console.log('❌ Background layer failed');
      console.log(`   Error: ${response.data.message}`);
    }
    
    // Test 7: Test gradient background
    console.log('\n7️⃣ Testing gradient background...');
    const gradientLogo = {
      ...basicLogo,
      "canvas": {
        "aspectRatio": 1.0,
        "background": {
          "type": "gradient",
          "solidColor": "#ffffff",
          "gradient": {
            "angle": 45.0,
            "stops": [
              { "color": "#ff6b6b", "position": 0.0 },
              { "color": "#4ecdc4", "position": 1.0 }
            ]
          }
        }
      }
    };
    
    response = await axios.post(`${BASE_URL}/mobile`, gradientLogo);
    if (response.data.success) {
      console.log('✅ Gradient background works!');
    } else {
      console.log('❌ Gradient background failed');
      console.log(`   Error: ${response.data.message}`);
    }
    
    console.log('\n🎉 Step-by-step testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

testComprehensiveStepByStep();
