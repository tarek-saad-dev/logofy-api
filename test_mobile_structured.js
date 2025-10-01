const axios = require('axios');

async function run() {
  try {
    console.log('Creating logo via POST /api/logo/mobile ...');
    const createRes = await axios.post('http://localhost:3000/api/logo/mobile', {
      name: 'Test Mobile Structured',
      userId: 'tester@example.com',
      canvas: { aspectRatio: 1.0, background: { type: 'solid', solidColor: '#ffffff' } },
      layers: [
        {
          layerId: 'tmp_text_1',
          type: 'text',
          visible: true,
          order: 0,
          position: { x: 0.5, y: 0.5 },
          scaleFactor: 0.1,
          rotation: 0,
          opacity: 1,
          flip: { horizontal: false, vertical: false },
          text: {
            value: 'hello',
            font: 'Arial',
            fontColor: '#e91e63',
            fontWeight: '900',
            fontStyle: 'normal',
            alignment: 'center',
            lineHeight: 1.0,
            letterSpacing: -2.5
          }
        }
      ],
      colorsUsed: [{ role: 'text', color: '#e91e63' }]
    });
    const logoId = createRes.data?.data?.logoId;
    console.log('Created logoId:', logoId);
    if (!logoId) throw new Error('No logoId returned');

    console.log('Fetching /api/logo/:id/mobile-structured ...');
    const getRes = await axios.get(`http://localhost:3000/api/logo/${logoId}/mobile-structured`);
    console.log('Response OK. Keys:', Object.keys(getRes.data));
    console.log('Sample:', JSON.stringify(getRes.data, null, 2).slice(0, 500) + '...');
  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

run();


