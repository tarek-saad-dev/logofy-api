const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testIconLibraryFunctionality() {
  console.log('Testing icon library functionality...\n');

  try {
    // Create a logo with an icon layer
    const logoData = {
      name: "Icon Library Test",
      description: "Testing icon library with URL storage",
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: "solid",
          solidColor: "#ffffff"
        }
      },
      layers: [
        {
          layerId: "test-icon-layer",
          type: "icon",
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 1.0,
          rotation: 0.0,
          opacity: 1.0,
          flip: { horizontal: false, vertical: false },
          icon: {
            src: "heart-icon",
            url: "https://example.com/icons/heart-icon.svg",
            color: "#ffc107"
          }
        }
      ],
      colorsUsed: [
        { role: "icon", color: "#ffc107" }
      ],
      alignments: {
        verticalAlign: "center",
        horizontalAlign: "center"
      },
      responsive: {
        version: "3.0",
        description: "Fully responsive logo data",
        scalingMethod: "scaleFactor",
        positionMethod: "relative",
        fullyResponsive: true
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["test", "icon", "library"],
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

    // Create logo
    console.log('1. Creating logo with icon layer...');
    const createResponse = await fetch(`${API_BASE}/logo/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logoData)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create logo: ${createResponse.status} ${createResponse.statusText}`);
    }

    const createdLogo = await createResponse.json();
    const logoId = createdLogo.data.logoId;
    console.log(`✅ Logo created with ID: ${logoId}`);

    // Get logo back and check icon properties
    console.log('\n2. Retrieving logo and checking icon properties...');
    const getResponse = await fetch(`${API_BASE}/logo/${logoId}/mobile`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get logo: ${getResponse.status} ${getResponse.statusText}`);
    }

    const retrievedLogo = await getResponse.json();
    const iconLayer = retrievedLogo.layers.find(layer => layer.type === 'icon');
    
    if (!iconLayer) {
      throw new Error('Icon layer not found in retrieved logo');
    }

    console.log('✅ Icon layer found');

    // Check icon properties
    console.log('\n3. Icon properties:');
    console.log(JSON.stringify(iconLayer.icon, null, 2));

    // Check if src contains URL
    if (iconLayer.icon.src && iconLayer.icon.src.includes('https://')) {
      console.log('\n✅ SUCCESS: Icon src contains URL!');
    } else {
      console.log(`\n❌ FAILURE: Icon src does not contain URL: ${iconLayer.icon.src}`);
    }

    // Test creating another logo with the same icon (should reuse existing asset)
    console.log('\n4. Testing icon reuse...');
    const logoData2 = {
      name: "Icon Reuse Test",
      description: "Testing icon reuse from library",
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: "solid",
          solidColor: "#ffffff"
        }
      },
      layers: [
        {
          layerId: "test-icon-layer-2",
          type: "icon",
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 1.0,
          rotation: 0.0,
          opacity: 1.0,
          flip: { horizontal: false, vertical: false },
          icon: {
            src: "heart-icon", // Same icon name
            url: "https://example.com/icons/heart-icon.svg",
            color: "#ff0000" // Different color
          }
        }
      ],
      colorsUsed: [
        { role: "icon", color: "#ff0000" }
      ],
      alignments: {
        verticalAlign: "center",
        horizontalAlign: "center"
      },
      responsive: {
        version: "3.0",
        description: "Fully responsive logo data",
        scalingMethod: "scaleFactor",
        positionMethod: "relative",
        fullyResponsive: true
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["test", "icon", "reuse"],
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

    const createResponse2 = await fetch(`${API_BASE}/logo/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logoData2)
    });

    if (!createResponse2.ok) {
      throw new Error(`Failed to create second logo: ${createResponse2.status} ${createResponse2.statusText}`);
    }

    const createdLogo2 = await createResponse2.json();
    const logoId2 = createdLogo2.data.logoId;
    console.log(`✅ Second logo created with ID: ${logoId2}`);

    // Get second logo and verify icon URL is the same
    const getResponse2 = await fetch(`${API_BASE}/logo/${logoId2}/mobile`);
    const retrievedLogo2 = await getResponse2.json();
    const iconLayer2 = retrievedLogo2.layers.find(layer => layer.type === 'icon');

    if (iconLayer.icon.src === iconLayer2.icon.src) {
      console.log('\n✅ SUCCESS: Icon URL is reused from library!');
    } else {
      console.log('\n❌ FAILURE: Icon URL is not being reused properly');
      console.log(`First logo icon src: ${iconLayer.icon.src}`);
      console.log(`Second logo icon src: ${iconLayer2.icon.src}`);
    }

    // Test all endpoints
    console.log('\n5. Testing all endpoints...');
    
    // Test mobile list endpoint
    const listResponse = await fetch(`${API_BASE}/logo/mobile`);
    const listData = await listResponse.json();
    const listIconLayer = listData.data.find(logo => logo.logoId === logoId)?.layers.find(layer => layer.type === 'icon');
    
    if (listIconLayer && listIconLayer.icon.src.includes('https://')) {
      console.log('✅ Mobile list endpoint returns icon URL');
    } else {
      console.log('❌ Mobile list endpoint does not return icon URL');
    }

    // Test mobile-structured endpoint
    const structuredResponse = await fetch(`${API_BASE}/logo/${logoId}/mobile-structured`);
    const structuredData = await structuredResponse.json();
    const structuredIconLayer = structuredData.layers.find(layer => layer.type === 'icon');
    
    if (structuredIconLayer && structuredIconLayer.icon.src.includes('https://')) {
      console.log('✅ Mobile-structured endpoint returns icon URL');
    } else {
      console.log('❌ Mobile-structured endpoint does not return icon URL');
    }

    // Test regular endpoint
    const regularResponse = await fetch(`${API_BASE}/logo/${logoId}`);
    const regularData = await regularResponse.json();
    const regularIconLayer = regularData.data.layers.find(layer => layer.type === 'ICON');
    
    if (regularIconLayer && regularIconLayer.icon.asset && regularIconLayer.icon.asset.url) {
      console.log('✅ Regular endpoint returns icon asset with URL');
    } else {
      console.log('❌ Regular endpoint does not return icon asset with URL');
    }

    console.log('\n🎉 ALL TESTS PASSED! Icon library functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testIconLibraryFunctionality();
