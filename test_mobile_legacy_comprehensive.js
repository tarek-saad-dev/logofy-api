// test_mobile_legacy_comprehensive.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_LOGO_ID = 'bdd8c50a-383c-44c4-a212-ede3c06e6102';

// Test configuration
const tests = [
  // Health Check
  {
    name: 'API Health Check',
    url: `${BASE_URL.replace('/api', '')}/health`,
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (data) => {
      console.log('✓ API is healthy:', data.status === 'healthy');
      console.log('✓ Uptime is present:', typeof data.uptime === 'number');
      console.log('✓ Timestamp is present:', !!data.timestamp);
    }
  },

  // GET All Logos (Legacy Format) - English
  {
    name: 'Get All Logos (Legacy Format) - English',
    url: `${BASE_URL}/logo/mobile/legacy?page=1&limit=5&lang=en`,
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Response has data field:', !!data.data);
      console.log('✓ Response has pagination:', !!data.data.pagination);
      console.log('✓ Language is English:', data.language === 'en');
      console.log('✓ Direction is LTR:', data.direction === 'ltr');
      
      if (data.data.data && data.data.data.length > 0) {
        const logo = data.data.data[0];
        console.log('✓ Logo has required fields:', {
          logoId: !!logo.logoId,
          canvas: !!logo.canvas,
          layers: Array.isArray(logo.layers),
          colorsUsed: Array.isArray(logo.colorsUsed),
          alignments: !!logo.alignments,
          responsive: !!logo.responsive,
          metadata: !!logo.metadata,
          export: !!logo.export
        });
        
        console.log('✓ Metadata has legacy format flags:', {
          legacyFormat: logo.metadata.legacyFormat === true,
          legacyVersion: !!logo.metadata.legacyVersion,
          mobileOptimized: logo.metadata.mobileOptimized === true
        });
      }
    }
  },

  // GET All Logos (Legacy Format) - Arabic
  {
    name: 'Get All Logos (Legacy Format) - Arabic',
    url: `${BASE_URL}/logo/mobile/legacy?page=1&limit=5&lang=ar`,
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Language is Arabic:', data.language === 'ar');
      console.log('✓ Direction is RTL:', data.direction === 'rtl');
    }
  },

  // GET Single Logo (Legacy Format) - English
  {
    name: 'Get Single Logo (Legacy Format) - English',
    url: `${BASE_URL}/logo/${TEST_LOGO_ID}/mobile/legacy?lang=en`,
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Response has data field:', !!data.data);
      console.log('✓ Logo ID matches:', data.data.logoId === TEST_LOGO_ID);
      console.log('✓ Language is English:', data.language === 'en');
      console.log('✓ Direction is LTR:', data.direction === 'ltr');
      
      console.log('✓ Logo has required fields:', {
        logoId: !!data.data.logoId,
        canvas: !!data.data.canvas,
        layers: Array.isArray(data.data.layers),
        colorsUsed: Array.isArray(data.data.colorsUsed),
        alignments: !!data.data.alignments,
        responsive: !!data.data.responsive,
        metadata: !!data.data.metadata,
        export: !!data.data.export
      });
      
      console.log('✓ Metadata has legacy format flags:', {
        legacyFormat: data.data.metadata.legacyFormat === true,
        legacyVersion: !!data.data.metadata.legacyVersion,
        mobileOptimized: data.data.metadata.mobileOptimized === true
      });
      
      // Validate canvas structure
      if (data.data.canvas) {
        console.log('✓ Canvas has required structure:', {
          aspectRatio: typeof data.data.canvas.aspectRatio === 'number',
          background: !!data.data.canvas.background
        });
        
        if (data.data.canvas.background) {
          console.log('✓ Background has legacy format:', {
            type: !!data.data.canvas.background.type,
            solidColor: data.data.canvas.background.solidColor !== undefined,
            gradient: data.data.canvas.background.gradient === null || typeof data.data.canvas.background.gradient === 'object'
          });
        }
      }
      
      // Validate layers structure
      if (data.data.layers && data.data.layers.length > 0) {
        const layer = data.data.layers[0];
        console.log('✓ Layer has required structure:', {
          layerId: !!layer.layerId,
          type: !!layer.type,
          visible: typeof layer.visible === 'boolean',
          order: typeof layer.order === 'number',
          position: !!layer.position && typeof layer.position.x === 'number' && typeof layer.position.y === 'number',
          scaleFactor: typeof layer.scaleFactor === 'number',
          rotation: typeof layer.rotation === 'number',
          opacity: typeof layer.opacity === 'number',
          flip: !!layer.flip && typeof layer.flip.horizontal === 'boolean' && typeof layer.flip.vertical === 'boolean'
        });
      }
    }
  },

  // GET Single Logo (Legacy Format) - Arabic
  {
    name: 'Get Single Logo (Legacy Format) - Arabic',
    url: `${BASE_URL}/logo/${TEST_LOGO_ID}/mobile/legacy?lang=ar`,
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Language is Arabic:', data.language === 'ar');
      console.log('✓ Direction is RTL:', data.direction === 'rtl');
    }
  },

  // POST Create Logo - Basic
  {
    name: 'Create Logo (Mobile Format) - Basic',
    url: `${BASE_URL}/logo/mobile`,
    method: 'POST',
    expectedStatus: 201,
    data: {
      name: 'Test Logo - Basic',
      description: 'A basic test logo created via mobile API',
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: 'solid',
          solidColor: '#ffffff',
          gradient: null,
          image: null
        }
      },
      layers: [],
      colorsUsed: [],
      alignments: {
        verticalAlign: 'center',
        horizontalAlign: 'center'
      },
      responsive: {
        version: '3.0',
        description: 'Fully responsive logo data - no absolute sizes stored',
        scalingMethod: 'scaleFactor',
        positionMethod: 'relative',
        fullyResponsive: true
      },
      metadata: {
        tags: ['test', 'basic', 'mobile'],
        version: 3,
        responsive: true
      },
      export: {
        format: 'png',
        transparentBackground: true,
        quality: 100,
        responsive: {
          scalable: true,
          maintainAspectRatio: true
        }
      }
    },
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Response has data field:', !!data.data);
      console.log('✓ Logo ID is valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.data.logoId));
      console.log('✓ Logo has required fields:', {
        logoId: !!data.data.logoId,
        canvas: !!data.data.canvas,
        layers: Array.isArray(data.data.layers),
        colorsUsed: Array.isArray(data.data.colorsUsed),
        alignments: !!data.data.alignments,
        responsive: !!data.data.responsive,
        metadata: !!data.data.metadata,
        export: !!data.data.export
      });
    }
  },

  // POST Create Logo - With Text Layer
  {
    name: 'Create Logo (Mobile Format) - With Text Layer',
    url: `${BASE_URL}/logo/mobile`,
    method: 'POST',
    expectedStatus: 201,
    data: {
      name: 'Test Logo - With Text',
      description: 'A test logo with text layer created via mobile API',
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: 'solid',
          solidColor: '#f0f0f0',
          gradient: null,
          image: null
        }
      },
      layers: [
        {
          layerId: 'text-layer-1',
          type: 'text',
          visible: true,
          order: 0,
          position: {
            x: 0.5,
            y: 0.5
          },
          scaleFactor: 1.0,
          rotation: 0,
          opacity: 1.0,
          flip: {
            horizontal: false,
            vertical: false
          },
          text: {
            value: 'Hello World',
            font: 'Arial',
            fontSize: 48,
            fontColor: '#333333',
            fontWeight: 'bold',
            fontStyle: 'normal',
            alignment: 'center',
            baseline: 'alphabetic',
            lineHeight: 1.2,
            letterSpacing: 0,
            fillAlpha: 1.0,
            strokeHex: null,
            strokeAlpha: null,
            strokeWidth: null,
            strokeAlign: null,
            gradient: null,
            underline: false,
            underlineDirection: 'horizontal',
            textCase: 'normal',
            textDecoration: 'none',
            textTransform: 'none',
            fontVariant: 'normal'
          }
        }
      ],
      colorsUsed: [
        {
          role: 'text',
          color: '#333333'
        }
      ],
      alignments: {
        verticalAlign: 'center',
        horizontalAlign: 'center'
      },
      responsive: {
        version: '3.0',
        description: 'Fully responsive logo data - no absolute sizes stored',
        scalingMethod: 'scaleFactor',
        positionMethod: 'relative',
        fullyResponsive: true
      },
      metadata: {
        tags: ['test', 'text', 'mobile'],
        version: 3,
        responsive: true
      },
      export: {
        format: 'png',
        transparentBackground: true,
        quality: 100,
        responsive: {
          scalable: true,
          maintainAspectRatio: true
        }
      }
    },
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Logo has text layer:', data.data.layers.length > 0);
      if (data.data.layers.length > 0 && data.data.layers[0].text) {
        console.log('✓ Text layer has required properties:', {
          type: data.data.layers[0].type === 'text',
          text: !!data.data.layers[0].text,
          value: !!data.data.layers[0].text.value,
          font: !!data.data.layers[0].text.font,
          fontSize: typeof data.data.layers[0].text.fontSize === 'number',
          fontColor: !!data.data.layers[0].text.fontColor
        });
      } else {
        console.log('✓ Text layer validation skipped (no text layer found)');
      }
    }
  },

  // POST Create Logo - With Gradient Background
  {
    name: 'Create Logo (Mobile Format) - With Gradient Background',
    url: `${BASE_URL}/logo/mobile`,
    method: 'POST',
    expectedStatus: 201,
    data: {
      name: 'Test Logo - With Gradient',
      description: 'A test logo with gradient background created via mobile API',
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: 'gradient',
          solidColor: null,
          gradient: {
            angle: 45,
            stops: [
              {
                color: '#ff6b6b',
                position: 0.0
              },
              {
                color: '#4ecdc4',
                position: 1.0
              }
            ]
          },
          image: null
        }
      },
      layers: [],
      colorsUsed: [
        {
          role: 'background',
          color: '#ff6b6b'
        },
        {
          role: 'background',
          color: '#4ecdc4'
        }
      ],
      alignments: {
        verticalAlign: 'center',
        horizontalAlign: 'center'
      },
      responsive: {
        version: '3.0',
        description: 'Fully responsive logo data - no absolute sizes stored',
        scalingMethod: 'scaleFactor',
        positionMethod: 'relative',
        fullyResponsive: true
      },
      metadata: {
        tags: ['test', 'gradient', 'mobile'],
        version: 3,
        responsive: true
      },
      export: {
        format: 'png',
        transparentBackground: false,
        quality: 100,
        responsive: {
          scalable: true,
          maintainAspectRatio: true
        }
      }
    },
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Canvas has gradient background:', data.data.canvas.background.type === 'gradient');
      console.log('✓ Gradient has required structure:', {
        angle: typeof data.data.canvas.background.gradient.angle === 'number',
        stops: Array.isArray(data.data.canvas.background.gradient.stops),
        stopsLength: data.data.canvas.background.gradient.stops.length > 0
      });
    }
  },

  // Error Handling Tests
  {
    name: 'Invalid Logo ID Format',
    url: `${BASE_URL}/logo/invalid-id/mobile/legacy`,
    method: 'GET',
    expectedStatus: 400,
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === false);
      console.log('✓ Error message is correct:', data.message === 'Invalid logo ID format');
    }
  },

  {
    name: 'Non-existent Logo ID',
    url: `${BASE_URL}/logo/00000000-0000-0000-0000-000000000000/mobile/legacy`,
    method: 'GET',
    expectedStatus: 404,
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === false);
      console.log('✓ Error message is correct:', data.message === 'Logo not found');
    }
  },

  {
    name: 'Create Logo - Missing Required Fields',
    url: `${BASE_URL}/logo/mobile`,
    method: 'POST',
    expectedStatus: 400,
    data: {
      description: 'Logo without name field'
    },
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === false);
      console.log('✓ Error message mentions required fields:', data.message.includes('required'));
    }
  },

  // Pagination Tests
  {
    name: 'Pagination Test - Page 2',
    url: `${BASE_URL}/logo/mobile/legacy?page=2&limit=3&lang=en`,
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Pagination is correct:', {
        page: data.data.pagination.page === 2,
        limit: data.data.pagination.limit === 3,
        total: typeof data.data.pagination.total === 'number',
        pages: typeof data.data.pagination.pages === 'number'
      });
    }
  },

  {
    name: 'Large Page Size Test',
    url: `${BASE_URL}/logo/mobile/legacy?page=1&limit=100&lang=en`,
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (data) => {
      console.log('✓ Response has success field:', data.success === true);
      console.log('✓ Page size is correct:', data.data.pagination.limit === 100);
      console.log('✓ Data length is within limit:', data.data.data.length <= 100);
    }
  }
];

// Performance test configuration
const performanceTests = [
  {
    name: 'Response Time Test - Single Logo',
    url: `${BASE_URL}/logo/${TEST_LOGO_ID}/mobile/legacy?lang=en`,
    method: 'GET',
    maxResponseTime: 2000
  },
  {
    name: 'Response Time Test - All Logos',
    url: `${BASE_URL}/logo/mobile/legacy?page=1&limit=20&lang=en`,
    method: 'GET',
    maxResponseTime: 3000
  },
  {
    name: 'Response Time Test - Create Logo',
    url: `${BASE_URL}/logo/mobile`,
    method: 'POST',
    maxResponseTime: 5000,
    data: {
      name: 'Performance Test Logo',
      canvas: {
        aspectRatio: 1.0,
        background: {
          type: 'solid',
          solidColor: '#ffffff'
        }
      },
      layers: []
    }
  }
];

async function runTest(test) {
  try {
    console.log(`\n🧪 Running test: ${test.name}`);
    console.log(`📡 ${test.method} ${test.url}`);
    
    const startTime = Date.now();
    const config = {
      method: test.method,
      url: test.url,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': test.url.includes('lang=ar') ? 'ar' : 'en'
      },
      timeout: 15000
    };

    if (test.data) {
      config.data = test.data;
    }

    const response = await axios(config);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📊 Status code: ${response.status}`);
    
    if (response.status === test.expectedStatus) {
      console.log('✅ Status code is correct');
    } else {
      console.log(`❌ Expected status ${test.expectedStatus}, got ${response.status}`);
    }
    
    if (test.validateResponse) {
      test.validateResponse(response.data);
    }
    
    return { success: true, responseTime, status: response.status };
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    
    if (error.response) {
      console.log(`📊 Status code: ${error.response.status}`);
      console.log(`📄 Response:`, JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === test.expectedStatus) {
        console.log('✅ Status code is correct (expected error)');
        if (test.validateResponse) {
          test.validateResponse(error.response.data);
        }
        return { success: true, responseTime: 0, status: error.response.status };
      }
    }
    
    return { success: false, responseTime: 0, status: error.response?.status || 0 };
  }
}

async function runPerformanceTest(test) {
  try {
    console.log(`\n⚡ Running performance test: ${test.name}`);
    console.log(`📡 ${test.method} ${test.url}`);
    
    const startTime = Date.now();
    const config = {
      method: test.method,
      url: test.url,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 20000
    };

    if (test.data) {
      config.data = test.data;
    }

    const response = await axios(config);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📊 Status code: ${response.status}`);
    
    if (responseTime <= test.maxResponseTime) {
      console.log(`✅ Response time is within limit (${test.maxResponseTime}ms)`);
    } else {
      console.log(`❌ Response time exceeds limit (${test.maxResponseTime}ms)`);
    }
    
    return { success: responseTime <= test.maxResponseTime, responseTime, status: response.status };
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
    return { success: false, responseTime: 0, status: error.response?.status || 0 };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Mobile Legacy Format API Tests');
  console.log('=' .repeat(60));
  
  const results = [];
  
  // Run main tests
  for (const test of tests) {
    const result = await runTest(test);
    results.push({ ...test, result });
  }
  
  // Run performance tests
  console.log('\n⚡ Running Performance Tests');
  console.log('=' .repeat(30));
  
  for (const test of performanceTests) {
    const result = await runPerformanceTest(test);
    results.push({ ...test, result });
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(20));
  
  const successful = results.filter(r => r.result.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  // Performance summary
  const performanceResults = results.filter(r => performanceTests.includes(r));
  if (performanceResults.length > 0) {
    const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.result.responseTime, 0) / performanceResults.length;
    console.log(`⚡ Average response time: ${Math.round(avgResponseTime)}ms`);
  }
  
  // Failed tests
  const failedTests = results.filter(r => !r.result.success);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`  - ${test.name}`);
    });
  }
  
  console.log('\n🎉 Comprehensive test run completed!');
  
  return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, runTest, runPerformanceTest };
