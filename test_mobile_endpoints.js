const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data matching the expected JSON structure
const testLogoData = {
  logoId: "1759094821977",
  templateId: null,
  userId: "current_user",
  name: "My Logo 1759094821974",
  description: "Logo created on 2025-09-29 00:27:01.974384",
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "image",
      solidColor: null,
      gradient: null,
      image: {
        type: "imported",
        path: "/data/user/0/com.example.onlyledger/cache/scaled_1000337156.jpg"
      }
    }
  },
  layers: [
    {
      layerId: "1759074588677",
      type: "icon",
      visible: true,
      order: 0,
      position: {
        x: 0.25,
        y: 0.5
      },
      scaleFactor: 0.15,
      rotation: -25.090909090909083,
      opacity: 1.0,
      flip: {
        horizontal: true,
        vertical: true
      },
      icon: {
        src: "icon_58873",
        color: "#ffc107"
      }
    },
    {
      layerId: "1759074588679",
      type: "icon",
      visible: true,
      order: 1,
      position: {
        x: 0.75,
        y: 0.5
      },
      scaleFactor: 0.28,
      rotation: 0.0,
      opacity: 1.0,
      flip: {
        horizontal: false,
        vertical: false
      },
      icon: {
        src: "icon_57947",
        color: "#f44336"
      }
    },
    {
      layerId: "1759094733799",
      type: "text",
      visible: true,
      order: 2,
      position: {
        x: 0.3324074074074073,
        y: 0.2518518518518518
      },
      scaleFactor: 0.04074074074074074,
      rotation: 46.90909090909093,
      opacity: 0.6485260770975056,
      flip: {
        horizontal: false,
        vertical: false
      },
      text: {
        value: "hassan",
        font: "Courier New",
        fontColor: "#e91e63",
        fontWeight: "900",
        fontStyle: "normal",
        alignment: "center",
        lineHeight: 1.0,
        letterSpacing: -2.5
      }
    }
  ],
  colorsUsed: [
    {
      role: "icon",
      color: "#ffc107"
    },
    {
      role: "icon",
      color: "#f44336"
    },
    {
      role: "text",
      color: "#e91e63"
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
    createdAt: "2025-09-29T00:27:01.974384",
    updatedAt: "2025-09-29T00:27:01.974384",
    tags: [
      "logo",
      "design",
      "responsive"
    ],
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

async function testEndpoints() {
  try {
    console.log('🧪 Testing Logo Maker API Endpoints...\n');

    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check passed:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return;
    }

    // Test 2: Create logo via mobile endpoint
    console.log('\n2. Testing POST /api/logo/mobile...');
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/logo/mobile`, testLogoData);
      console.log('✅ Logo created successfully');
      console.log('Response structure matches expected format:', 
        createResponse.data.data.logoId && 
        createResponse.data.data.canvas && 
        createResponse.data.data.layers && 
        createResponse.data.data.colorsUsed &&
        createResponse.data.data.alignments &&
        createResponse.data.data.responsive &&
        createResponse.data.data.metadata &&
        createResponse.data.data.export
      );
      
      const logoId = createResponse.data.data.logoId;
      console.log('Created logo ID:', logoId);

      // Test 3: Get logo via mobile endpoint
      console.log('\n3. Testing GET /api/logo/:id/mobile...');
      const getResponse = await axios.get(`${BASE_URL}/api/logo/${logoId}/mobile`);
      console.log('✅ Logo retrieved successfully');
      console.log('Response structure matches expected format:', 
        getResponse.data.logoId && 
        getResponse.data.canvas && 
        getResponse.data.layers && 
        getResponse.data.colorsUsed &&
        getResponse.data.alignments &&
        getResponse.data.responsive &&
        getResponse.data.metadata &&
        getResponse.data.export
      );

      // Test 4: Get logo via regular endpoint
      console.log('\n4. Testing GET /api/logo/:id...');
      const getRegularResponse = await axios.get(`${BASE_URL}/api/logo/${logoId}`);
      console.log('✅ Regular logo endpoint works');
      console.log('Response has success field:', getRegularResponse.data.success);
      console.log('Response has data field:', !!getRegularResponse.data.data);

      // Test 5: Verify JSON structure matches expected format
      console.log('\n5. Verifying JSON structure...');
      const mobileData = getResponse.data;
      
      const requiredFields = [
        'logoId', 'templateId', 'userId', 'name', 'description',
        'canvas', 'layers', 'colorsUsed', 'alignments', 'responsive', 'metadata', 'export'
      ];
      
      const canvasFields = ['aspectRatio', 'background'];
      const backgroundFields = ['type', 'solidColor', 'gradient', 'image'];
      const layerFields = ['layerId', 'type', 'visible', 'order', 'position', 'scaleFactor', 'rotation', 'opacity', 'flip'];
      const alignmentFields = ['verticalAlign', 'horizontalAlign'];
      const responsiveFields = ['version', 'description', 'scalingMethod', 'positionMethod', 'fullyResponsive'];
      const metadataFields = ['createdAt', 'updatedAt', 'tags', 'version', 'responsive'];
      const exportFields = ['format', 'transparentBackground', 'quality', 'responsive'];

      let allFieldsPresent = true;
      
      // Check main fields
      for (const field of requiredFields) {
        if (!(field in mobileData)) {
          console.log(`❌ Missing main field: ${field}`);
          allFieldsPresent = false;
        }
      }

      // Check canvas structure
      if (mobileData.canvas) {
        for (const field of canvasFields) {
          if (!(field in mobileData.canvas)) {
            console.log(`❌ Missing canvas field: ${field}`);
            allFieldsPresent = false;
          }
        }
      }

      // Check background structure
      if (mobileData.canvas && mobileData.canvas.background) {
        for (const field of backgroundFields) {
          if (!(field in mobileData.canvas.background)) {
            console.log(`❌ Missing background field: ${field}`);
            allFieldsPresent = false;
          }
        }
      }

      // Check layers structure
      if (mobileData.layers && mobileData.layers.length > 0) {
        for (const field of layerFields) {
          if (!(field in mobileData.layers[0])) {
            console.log(`❌ Missing layer field: ${field}`);
            allFieldsPresent = false;
          }
        }
      }

      // Check other structures
      [alignmentFields, responsiveFields, metadataFields, exportFields].forEach((fields, index) => {
        const structureNames = ['alignments', 'responsive', 'metadata', 'export'];
        const structure = mobileData[structureNames[index]];
        if (structure) {
          for (const field of fields) {
            if (!(field in structure)) {
              console.log(`❌ Missing ${structureNames[index]} field: ${field}`);
              allFieldsPresent = false;
            }
          }
        }
      });

      if (allFieldsPresent) {
        console.log('✅ All required fields are present in the response');
        console.log('✅ JSON structure matches the expected format from mobile team');
      } else {
        console.log('❌ Some required fields are missing');
      }

    } catch (error) {
      console.log('❌ Mobile endpoint test failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testEndpoints();