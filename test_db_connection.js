const { query } = require('./api/config/database');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', result.rows[0]);
    
    // Check if assets table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assets'
      );
    `);
    console.log('✅ Assets table exists:', tableCheck.rows[0].exists);
    
    // Check assets count
    const countResult = await query('SELECT COUNT(*) as count FROM assets');
    console.log('✅ Assets count:', countResult.rows[0].count);
    
    // Check if there are any icons
    const iconsResult = await query(`
      SELECT COUNT(*) as count 
      FROM assets 
      WHERE kind IN ('vector', 'raster') 
      AND (meta->>'library_type' = 'icon' OR meta->>'library_type' IS NULL)
    `);
    console.log('✅ Icons count:', iconsResult.rows[0].count);
    
    // Check if there are any backgrounds
    const backgroundsResult = await query(`
      SELECT COUNT(*) as count 
      FROM assets 
      WHERE kind IN ('raster', 'vector') 
      AND meta->>'library_type' = 'background'
    `);
    console.log('✅ Backgrounds count:', backgroundsResult.rows[0].count);
    
    // Test the exact query from the icons route
    console.log('\nTesting icons query...');
    const iconsQuery = await query(`
      SELECT 
        ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
        ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
        ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      ORDER BY ai.created_at DESC
      LIMIT $1 OFFSET $2
    `, [50, 0]);
    console.log('✅ Icons query successful, returned:', iconsQuery.rows.length, 'rows');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
  
  process.exit(0);
}

testDatabase();
