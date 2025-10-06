const fetch = require('node-fetch');

async function testMobileAPI() {
  const baseUrl = 'http://localhost:3000';
  
  // Test data that should trigger the user creation issue
  const testData = {
    name: "Test Mobile Logo",
    userId: "test@example.com", // This will trigger user creation logic
    canvas: {
      aspectRatio: 1.0,
      background: {
        type: "solid",
        solidColor: "#ffffff"
      }
    },
    layers: [
      {
        type: "text",
        position: { x: 0.5, y: 0.5 },
        scaleFactor: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: {
          value: "Hello World",
          font: "Arial",
          fontColor: "#000000"
        }
      }
    ]
  };

  try {
    console.log('Testing mobile API POST endpoint...');
    const response = await fetch(`${baseUrl}/api/logo/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Mobile API is working!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ FAILED: Mobile API returned error');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ ERROR: Failed to test mobile API');
    console.log('Error:', error.message);
  }
}

// Run the test
testMobileAPI();
