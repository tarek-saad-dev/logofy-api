const axios = require('axios');

async function testMinimalEndpoint() {
  try {
    console.log('Testing POST /api/logo/mobile with minimal data...');
    
    const minimalData = {
      name: "Test Logo"
    };

    const response = await axios.post('http://localhost:3000/api/logo/mobile', minimalData);
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMinimalEndpoint();






