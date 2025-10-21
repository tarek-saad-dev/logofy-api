const { query } = require('./api/config/database');

async function testDatabase() {
  try {
    console.log('🧪 Testing database connection and data...\n');
    
    // Test basic connection
    console.log('1️⃣ Testing database connection...');
    const testResult = await query('SELECT 1 as test');
    console.log('✅ Database connected successfully');
    
    // Check if logos table exists and has data
    console.log('\n2️⃣ Checking logos table...');
    const logosCount = await query('SELECT COUNT(*) as count FROM logos');
    console.log(`📊 Total logos in database: ${logosCount.rows[0].count}`);
    
    // Check logos table structure
    console.log('\n3️⃣ Checking logos table structure...');
    const columns = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'logos' 
      ORDER BY column_name
    `);
    console.log('📋 Logos table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if there are any logos with required fields
    console.log('\n4️⃣ Checking for logos with required fields...');
    const logosWithData = await query(`
      SELECT id, title, title_en, title_ar, thumbnail_url, category_id, created_at, updated_at
      FROM logos 
      LIMIT 5
    `);
    
    if (logosWithData.rows.length > 0) {
      console.log('📝 Sample logos:');
      logosWithData.rows.forEach((logo, index) => {
        console.log(`  ${index + 1}. ID: ${logo.id}`);
        console.log(`     Title: ${logo.title || 'NULL'}`);
        console.log(`     Title EN: ${logo.title_en || 'NULL'}`);
        console.log(`     Title AR: ${logo.title_ar || 'NULL'}`);
        console.log(`     Thumbnail URL: ${logo.thumbnail_url || 'NULL'}`);
        console.log(`     Category ID: ${logo.category_id || 'NULL'}`);
        console.log(`     Created: ${logo.created_at}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No logos found in database');
    }
    
    // Check categories table
    console.log('5️⃣ Checking categories table...');
    const categoriesCount = await query('SELECT COUNT(*) as count FROM categories');
    console.log(`📊 Total categories in database: ${categoriesCount.rows[0].count}`);
    
    if (categoriesCount.rows[0].count > 0) {
      const categories = await query('SELECT id, name, name_en, name_ar FROM categories LIMIT 3');
      console.log('📝 Sample categories:');
      categories.rows.forEach((cat, index) => {
        console.log(`  ${index + 1}. ID: ${cat.id}`);
        console.log(`     Name: ${cat.name || 'NULL'}`);
        console.log(`     Name EN: ${cat.name_en || 'NULL'}`);
        console.log(`     Name AR: ${cat.name_ar || 'NULL'}`);
        console.log('');
      });
    }
    
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testDatabase();
