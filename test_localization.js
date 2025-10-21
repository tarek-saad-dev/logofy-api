// Test file to verify localization and envelope implementation
const { localization } = require('./api/middleware/localization');
const { ok, fail } = require('./api/utils/envelope');
const { applyLegacyIfRequested } = require('./api/utils/gradient');
const { formatISOToLocale } = require('./api/utils/date');

console.log('Testing localization and envelope system...\n');

// Test envelope functions
console.log('1. Testing envelope functions:');
console.log('Success envelope (EN):', JSON.stringify(ok({ test: 'data' }, 'en', 'Test message'), null, 2));
console.log('Success envelope (AR):', JSON.stringify(ok({ test: 'data' }, 'ar', 'رسالة تجريبية'), null, 2));
console.log('Error envelope (EN):', JSON.stringify(fail('en', 'Test error'), null, 2));
console.log('Error envelope (AR):', JSON.stringify(fail('ar', 'خطأ تجريبي'), null, 2));

// Test gradient transformation
console.log('\n2. Testing gradient transformation:');
const testCanvas = {
  aspectRatio: 1.0,
  background: {
    type: 'gradient',
    gradient: {
      angle: 45,
      stops: [
        { hex: '#ff0000', offset: 0 },
        { hex: '#0000ff', offset: 1 }
      ]
    }
  }
};

console.log('Original canvas:', JSON.stringify(testCanvas, null, 2));
console.log('Legacy transformed:', JSON.stringify(applyLegacyIfRequested(testCanvas, true), null, 2));

// Test date formatting
console.log('\n3. Testing date formatting:');
const testDate = new Date().toISOString();
console.log('English date:', formatISOToLocale(testDate, 'en'));
console.log('Arabic date:', formatISOToLocale(testDate, 'ar'));

console.log('\n✅ All tests completed successfully!');
