const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/logo';

async function testSimpleLogo() {
  console.log('🧪 Testing Simple Logo Creation\n');
  
  const simpleLogo = {
    "name": "Simple Test Logo",
    "description": "A simple logo for testing",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "solid",
        "solidColor": "#ffffff"
      }
    },
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
          "value": "TEST",
          "font": "Arial",
          "fontSize": 48,
          "fontColor": "#000000"
        }
      }
    ],
    "colorsUsed": [
      { "role": "text", "color": "#000000" }
    ]
  };
  
  try {
    console.log('1️⃣ Creating simple logo...');
    const response = await axios.post(`${BASE_URL}/mobile`, simpleLogo);
    
    if (response.data.success) {
      console.log('✅ Simple logo created successfully!');
      console.log(`   Logo ID: ${response.data.data.logoId}`);
      console.log(`   Layers: ${response.data.data.layers.length}`);
    } else {
      console.log('❌ Failed to create simple logo');
      console.log(`   Error: ${response.data.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

testSimpleLogo();
