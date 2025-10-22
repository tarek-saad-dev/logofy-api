const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/logo';

async function testMinimalWorking() {
  console.log('🧪 Testing Minimal Working Logo\n');
  
  const minimalLogo = {
    "name": "Minimal Test Logo",
    "description": "A minimal logo for testing",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "solid",
        "solidColor": "#ffffff"
      }
    },
    "layers": []
  };
  
  try {
    console.log('1️⃣ Creating minimal logo...');
    const response = await axios.post(`${BASE_URL}/mobile`, minimalLogo);
    
    if (response.data.success) {
      console.log('✅ Minimal logo created successfully!');
      console.log(`   Logo ID: ${response.data.data.logoId}`);
    } else {
      console.log('❌ Failed to create minimal logo');
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

testMinimalWorking();
