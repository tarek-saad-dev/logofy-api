const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGO_ID = process.env.LOGO_ID || 'bdd8c50a-383c-44c4-a212-ede3c06e6102';

async function testUpdateLogo() {
    console.log('🧪 Testing PATCH /api/logo/:id/mobile/legacy endpoint\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Logo ID: ${LOGO_ID}\n`);

    // Test server connection first
    try {
        const healthCheck = await axios.get(`${BASE_URL}/health`, { timeout: 2000, validateStatus: () => true });
        console.log(`Server health check: ${healthCheck.status === 200 ? '✅ Connected' : '⚠️  Server responded but may have issues'}\n`);
    } catch (error) {
        console.error('❌ Cannot connect to server. Please make sure the server is running on', BASE_URL);
        console.error('   Start the server with: npm run dev\n');
        process.exit(1);
    }

    const tests = [{
            name: '1. Basic Update (Name and Description)',
            data: {
                name: 'Updated Logo Name',
                description: 'Updated description for the logo'
            }
        },
        {
            name: '2. Update with Null Values',
            data: {
                name: 'Test Logo with Nulls',
                tags_en: null,
                tags_ar: null,
                categoryId: null
            }
        },
        {
            name: '3. Update with Canvas Background (Gradient)',
            data: {
                name: 'Logo with Gradient',
                canvas: {
                    aspectRatio: 1.0,
                    background: {
                        type: 'gradient',
                        solidColor: null,
                        gradient: {
                            angle: 90,
                            stops: [
                                { color: '#ff0000', position: 0 },
                                { color: '#0000ff', position: 1 }
                            ]
                        },
                        image: null
                    }
                }
            }
        },
        {
            name: '4. Update with All Fields',
            data: {
                name: 'Complete Update Test',
                description: 'Testing all fields',
                name_en: 'Complete Update Test EN',
                name_ar: 'اختبار التحديث الكامل',
                description_en: 'Testing all fields EN',
                description_ar: 'اختبار جميع الحقول',
                tags_en: ['test', 'update'],
                tags_ar: ['اختبار', 'تحديث'],
                colorsUsed: ['#ff0000', '#00ff00', '#0000ff'],
                alignments: {
                    verticalAlign: 'center',
                    horizontalAlign: 'center'
                },
                responsive: {
                    version: '3.0',
                    description: 'Fully responsive logo',
                    scalingMethod: 'scaleFactor',
                    positionMethod: 'relative',
                    fullyResponsive: true
                },
                metadata: {
                    tags: ['logo', 'design', 'responsive'],
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
            }
        },
        {
            name: '5. Update with Empty Arrays',
            data: {
                name: 'Logo with Empty Arrays',
                colorsUsed: [],
                tags_en: []
            }
        }
    ];

    for (const test of tests) {
        try {
            console.log(`\n${test.name}`);
            console.log('Request data:', JSON.stringify(test.data, null, 2));

            const response = await axios.patch(
                `${BASE_URL}/api/logo/${LOGO_ID}/mobile/legacy`,
                test.data, {
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: () => true // Don't throw on any status
                }
            );

            console.log(`Status: ${response.status}`);

            if (response.status === 200 || response.status === 201) {
                console.log('✅ Success!');
                if (response.data.success) {
                    console.log(`   Logo ID: ${response.data.data?.logoId || 'N/A'}`);
                    console.log(`   Name: ${response.data.data?.name || 'N/A'}`);
                } else {
                    console.log('   Response:', JSON.stringify(response.data, null, 2));
                }
            } else {
                console.log('❌ Error!');
                console.log('   Response:', JSON.stringify(response.data, null, 2));
            }
        } catch (error) {
            console.log('❌ Exception!');
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log('   Response:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.log('   Error:', error.message);
            }
        }

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ All tests completed!');
}

// Run tests
testUpdateLogo().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});