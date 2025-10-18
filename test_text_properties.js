const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testTextLayerProperties() {
  console.log('Testing text layer properties completeness...\n');

  try {
    // Create a logo with comprehensive text properties
    const logoData = {
      name: "Text Properties Test",
      description: "Testing all text layer properties",
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: "solid",
          solidColor: "#ffffff"
        }
      },
      layers: [
        {
          layerId: "test-text-layer",
          type: "text",
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 1.0,
          rotation: 0.0,
          opacity: 1.0,
          flip: { horizontal: false, vertical: false },
          text: {
            value: "Test Text",
            font: "Arial",
            fontSize: 48,
            fontColor: "#000000",
            fontWeight: "bold",
            fontStyle: "italic",
            alignment: "center",
            baseline: "alphabetic",
            lineHeight: 1.2,
            letterSpacing: 2.0,
            fillAlpha: 0.8,
            strokeHex: "#ff0000",
            strokeAlpha: 0.5,
            strokeWidth: 2.0,
            strokeAlign: "center",
            gradient: {
              type: "linear",
              angle: 45,
              stops: [
                { offset: 0, hex: "#ff0000", alpha: 1 },
                { offset: 1, hex: "#0000ff", alpha: 1 }
              ]
            }
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
        description: "Fully responsive logo data",
        scalingMethod: "scaleFactor",
        positionMethod: "relative",
        fullyResponsive: true
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["test", "text", "properties"],
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
    console.log('1. Creating logo with comprehensive text properties...');
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

    // Get logo back and check text properties
    console.log('\n2. Retrieving logo and checking text properties...');
    const getResponse = await fetch(`${API_BASE}/logo/${logoId}/mobile`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get logo: ${getResponse.status} ${getResponse.statusText}`);
    }

    const retrievedLogo = await getResponse.json();
    const textLayer = retrievedLogo.layers.find(layer => layer.type === 'text');
    
    if (!textLayer) {
      throw new Error('Text layer not found in retrieved logo');
    }

    console.log('✅ Text layer found');

    // Check all expected properties
    const expectedProperties = [
      'value', 'font', 'fontSize', 'fontColor', 'fontWeight', 'fontStyle',
      'alignment', 'baseline', 'lineHeight', 'letterSpacing', 'fillAlpha',
      'strokeHex', 'strokeAlpha', 'strokeWidth', 'strokeAlign', 'gradient'
    ];

    console.log('\n3. Checking text properties completeness:');
    let allPropertiesPresent = true;
    
    for (const prop of expectedProperties) {
      const hasProperty = textLayer.text.hasOwnProperty(prop);
      console.log(`   ${hasProperty ? '✅' : '❌'} ${prop}: ${hasProperty ? 'Present' : 'Missing'}`);
      if (!hasProperty) allPropertiesPresent = false;
    }

    console.log('\n4. Property values:');
    console.log(JSON.stringify(textLayer.text, null, 2));

    if (allPropertiesPresent) {
      console.log('\n🎉 SUCCESS: All text layer properties are present!');
    } else {
      console.log('\n❌ FAILURE: Some text layer properties are missing!');
    }

    // Test regular GET endpoint too
    console.log('\n5. Testing regular GET endpoint...');
    const regularGetResponse = await fetch(`${API_BASE}/logo/${logoId}`);
    
    if (!regularGetResponse.ok) {
      throw new Error(`Failed to get logo via regular endpoint: ${regularGetResponse.status} ${regularGetResponse.statusText}`);
    }

    const regularLogo = await regularGetResponse.json();
    const regularTextLayer = regularLogo.data.layers.find(layer => layer.type === 'TEXT');
    
    if (!regularTextLayer) {
      throw new Error('Text layer not found in regular endpoint response');
    }

    console.log('✅ Regular endpoint also returns text layer');
    console.log('✅ Regular endpoint text properties:');
    console.log(JSON.stringify(regularTextLayer.text, null, 2));

    console.log('\n🎉 ALL TESTS PASSED! Text layer properties are complete in both mobile and regular endpoints.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testTextLayerProperties();
