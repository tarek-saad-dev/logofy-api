const axios = require('axios');

async function testWithManualUUID() {
  try {
    console.log('Testing POST /api/logo/mobile with manual UUID...');
    
    const testData = {
      logoId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test Logo with Manual UUID",
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: "solid",
          solidColor: "#ffffff"
        }
      },
      layers: [
        {
          layerId: "test_layer_1",
          type: "text",
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 1.0,
          rotation: 0,
          opacity: 1.0,
          flip: { horizontal: false, vertical: false },
          text: {
            value: "Test Text",
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
        { role: "text", color: "#000000" }
      ],
      alignments: {
        verticalAlign: "center",
        horizontalAlign: "center"
      },
      responsive: {
        version: "3.0",
        description: "Test responsive",
        scalingMethod: "scaleFactor",
        positionMethod: "relative",
        fullyResponsive: true
      },
      metadata: {
        tags: ["test"],
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

    const response = await axios.post('http://localhost:3000/api/logo/mobile', testData);
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Test getting the logo back
    if (response.data.data && response.data.data.logoId) {
      console.log('\nTesting GET /api/logo/:id/mobile...');
      const getResponse = await axios.get(`http://localhost:3000/api/logo/${response.data.data.logoId}/mobile`);
      console.log('✅ GET Success!');
      console.log('Retrieved logo structure matches expected format:', 
        getResponse.data.logoId && 
        getResponse.data.canvas && 
        getResponse.data.layers && 
        getResponse.data.colorsUsed &&
        getResponse.data.alignments &&
        getResponse.data.responsive &&
        getResponse.data.metadata &&
        getResponse.data.export
      );
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testWithManualUUID();







