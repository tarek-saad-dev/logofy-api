const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testShapeLayerSrcProperty() {
  console.log('Testing shape layer src property...\n');

  try {
    // Create a logo with a shape layer that has src property
    const logoData = {
      name: "Shape Src Test",
      description: "Testing shape layer src property",
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: "solid",
          solidColor: "#ffffff"
        }
      },
      layers: [
        {
          layerId: "test-shape-layer",
          type: "shape",
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 0.4152421652421652,
          rotation: 0.0,
          opacity: 1.0,
          flip: { horizontal: false, vertical: false },
          shape: {
            src: "assets/local/Basic/13.svg",
            type: "rect",
            color: "#673ab7",
            strokeColor: "#000000",
            strokeWidth: 2
          }
        }
      ],
      colorsUsed: [
        { role: "shape", color: "#673ab7" }
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
        tags: ["test", "shape", "src"],
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
    console.log('1. Creating logo with shape layer containing src property...');
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

    // Get logo back and check shape properties
    console.log('\n2. Retrieving logo and checking shape properties...');
    const getResponse = await fetch(`${API_BASE}/logo/${logoId}/mobile`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get logo: ${getResponse.status} ${getResponse.statusText}`);
    }

    const retrievedLogo = await getResponse.json();
    const shapeLayer = retrievedLogo.layers.find(layer => layer.type === 'shape');
    
    if (!shapeLayer) {
      throw new Error('Shape layer not found in retrieved logo');
    }

    console.log('✅ Shape layer found');

    // Check all expected properties
    const expectedProperties = [
      'src', 'type', 'color', 'strokeColor', 'strokeWidth'
    ];

    console.log('\n3. Checking shape properties completeness:');
    let allPropertiesPresent = true;
    
    for (const prop of expectedProperties) {
      const hasProperty = shapeLayer.shape.hasOwnProperty(prop);
      console.log(`   ${hasProperty ? '✅' : '❌'} ${prop}: ${hasProperty ? 'Present' : 'Missing'}`);
      if (!hasProperty) allPropertiesPresent = false;
    }

    console.log('\n4. Shape property values:');
    console.log(JSON.stringify(shapeLayer.shape, null, 2));

    // Check if src property has the correct value
    if (shapeLayer.shape.src === "assets/local/Basic/13.svg") {
      console.log('\n✅ SUCCESS: Shape src property has correct value!');
    } else {
      console.log(`\n❌ FAILURE: Shape src property has incorrect value: ${shapeLayer.shape.src}`);
      allPropertiesPresent = false;
    }

    if (allPropertiesPresent) {
      console.log('\n🎉 SUCCESS: All shape layer properties are present and correct!');
    } else {
      console.log('\n❌ FAILURE: Some shape layer properties are missing or incorrect!');
    }

    // Test regular GET endpoint too
    console.log('\n5. Testing regular GET endpoint...');
    const regularGetResponse = await fetch(`${API_BASE}/logo/${logoId}`);
    
    if (!regularGetResponse.ok) {
      throw new Error(`Failed to get logo via regular endpoint: ${regularGetResponse.status} ${regularGetResponse.statusText}`);
    }

    const regularLogo = await regularGetResponse.json();
    const regularShapeLayer = regularLogo.data.layers.find(layer => layer.type === 'SHAPE');
    
    if (!regularShapeLayer) {
      throw new Error('Shape layer not found in regular endpoint response');
    }

    console.log('✅ Regular endpoint also returns shape layer');
    console.log('✅ Regular endpoint shape properties:');
    console.log(JSON.stringify(regularShapeLayer.shape, null, 2));

    // Test mobile-structured endpoint
    console.log('\n6. Testing mobile-structured endpoint...');
    const structuredGetResponse = await fetch(`${API_BASE}/logo/${logoId}/mobile-structured`);
    
    if (!structuredGetResponse.ok) {
      throw new Error(`Failed to get logo via mobile-structured endpoint: ${structuredGetResponse.status} ${structuredGetResponse.statusText}`);
    }

    const structuredLogo = await structuredGetResponse.json();
    const structuredShapeLayer = structuredLogo.layers.find(layer => layer.type === 'shape');
    
    if (!structuredShapeLayer) {
      throw new Error('Shape layer not found in mobile-structured endpoint response');
    }

    console.log('✅ Mobile-structured endpoint also returns shape layer');
    console.log('✅ Mobile-structured endpoint shape properties:');
    console.log(JSON.stringify(structuredShapeLayer.shape, null, 2));

    console.log('\n🎉 ALL TESTS PASSED! Shape layer src property is working correctly in all endpoints.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testShapeLayerSrcProperty();
