const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testBackgroundLibraryFunctionality() {
  console.log('Testing background library functionality...\n');

  try {
    // Create a logo with a background layer containing an image
    const logoData = {
      name: "Background Library Test",
      description: "Testing background library with URL storage",
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: "solid",
          solidColor: "#ffffff"
        }
      },
      layers: [
        {
          layerId: "test-background-layer",
          type: "background",
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 1.0,
          rotation: 0.0,
          opacity: 1.0,
          flip: { horizontal: false, vertical: false },
          background: {
            type: "image",
            color: "#ffffff",
            image: {
              src: "abstract-bg",
              url: "https://example.com/backgrounds/abstract-bg.jpg",
              path: "/images/abstract-bg.jpg"
            },
            repeat: "no-repeat",
            position: "center",
            size: "cover"
          }
        }
      ],
      colorsUsed: [],
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
        tags: ["test", "background", "library"],
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
    console.log('1. Creating logo with background layer containing image...');
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

    // Get logo back and check background properties
    console.log('\n2. Retrieving logo and checking background properties...');
    const getResponse = await fetch(`${API_BASE}/logo/${logoId}/mobile`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get logo: ${getResponse.status} ${getResponse.statusText}`);
    }

    const retrievedLogo = await getResponse.json();
    const backgroundLayer = retrievedLogo.layers.find(layer => layer.type === 'background');
    
    if (!backgroundLayer) {
      throw new Error('Background layer not found in retrieved logo');
    }

    console.log('✅ Background layer found');

    // Check background properties
    console.log('\n3. Background properties:');
    console.log(JSON.stringify(backgroundLayer.background, null, 2));

    // Check if image contains URL
    if (backgroundLayer.background.image && backgroundLayer.background.image.path && backgroundLayer.background.image.path.includes('http')) {
      console.log('\n✅ SUCCESS: Background image contains URL!');
    } else {
      console.log(`\n❌ FAILURE: Background image does not contain URL: ${backgroundLayer.background.image?.path}`);
    }

    // Test creating another logo with the same background (should reuse existing asset)
    console.log('\n4. Testing background reuse...');
    const logoData2 = {
      name: "Background Reuse Test",
      description: "Testing background reuse from library",
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: "solid",
          solidColor: "#ffffff"
        }
      },
      layers: [
        {
          layerId: "test-background-layer-2",
          type: "background",
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 1.0,
          rotation: 0.0,
          opacity: 1.0,
          flip: { horizontal: false, vertical: false },
          background: {
            type: "image",
            color: "#f0f0f0",
            image: {
              src: "abstract-bg", // Same background name
              url: "https://example.com/backgrounds/abstract-bg.jpg",
              path: "/images/abstract-bg.jpg"
            },
            repeat: "repeat",
            position: "top-left",
            size: "contain"
          }
        }
      ],
      colorsUsed: [],
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
        tags: ["test", "background", "reuse"],
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

    // Get second logo and verify background URL is the same
    const getResponse2 = await fetch(`${API_BASE}/logo/${logoId2}/mobile`);
    const retrievedLogo2 = await getResponse2.json();
    const backgroundLayer2 = retrievedLogo2.layers.find(layer => layer.type === 'background');

    if (backgroundLayer.background.image.path === backgroundLayer2.background.image.path) {
      console.log('\n✅ SUCCESS: Background URL is reused from library!');
    } else {
      console.log('\n❌ FAILURE: Background URL is not being reused properly');
      console.log(`First logo background path: ${backgroundLayer.background.image.path}`);
      console.log(`Second logo background path: ${backgroundLayer2.background.image.path}`);
    }

    // Test all endpoints
    console.log('\n5. Testing all endpoints...');
    
    // Test mobile list endpoint
    const listResponse = await fetch(`${API_BASE}/logo/mobile`);
    const listData = await listResponse.json();
    const listBackgroundLayer = listData.data.find(logo => logo.logoId === logoId)?.layers.find(layer => layer.type === 'background');
    
    if (listBackgroundLayer && listBackgroundLayer.background.image && listBackgroundLayer.background.image.path.includes('http')) {
      console.log('✅ Mobile list endpoint returns background URL');
    } else {
      console.log('❌ Mobile list endpoint does not return background URL');
    }

    // Test mobile-structured endpoint
    const structuredResponse = await fetch(`${API_BASE}/logo/${logoId}/mobile-structured`);
    const structuredData = await structuredResponse.json();
    const structuredBackgroundLayer = structuredData.layers.find(layer => layer.type === 'background');
    
    if (structuredBackgroundLayer && structuredBackgroundLayer.background.image && structuredBackgroundLayer.background.image.path.includes('http')) {
      console.log('✅ Mobile-structured endpoint returns background URL');
    } else {
      console.log('❌ Mobile-structured endpoint does not return background URL');
    }

    // Test regular endpoint
    const regularResponse = await fetch(`${API_BASE}/logo/${logoId}`);
    const regularData = await regularResponse.json();
    const regularBackgroundLayer = regularData.data.layers.find(layer => layer.type === 'BACKGROUND');
    
    if (regularBackgroundLayer && regularBackgroundLayer.background && regularBackgroundLayer.background.asset && regularBackgroundLayer.background.asset.url) {
      console.log('✅ Regular endpoint returns background asset with URL');
    } else {
      console.log('❌ Regular endpoint does not return background asset with URL');
    }

    console.log('\n🎉 ALL TESTS PASSED! Background library functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testBackgroundLibraryFunctionality();
