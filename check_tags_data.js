const { query } = require('./api/config/database');

async function checkTagsData() {
  try {
    console.log('Checking tags data in database...');
    
    // Check a few assets to see how tags are stored
    const result = await query(`
      SELECT id, name, meta->>'tags' as tags_raw, meta->'tags' as tags_json
      FROM assets 
      WHERE meta->>'library_type' = 'icon' 
      LIMIT 5
    `);
    
    console.log('Sample tags data:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Name: ${row.name}`);
      console.log(`Tags raw: ${row.tags_raw}`);
      console.log(`Tags JSON: ${JSON.stringify(row.tags_json)}`);
      console.log('---');
    });
    
    // Test the tags filter query
    console.log('\nTesting tags filter query...');
    const tagArray = ['arrow'];
    const testResult = await query(`
      SELECT COUNT(*) as count
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') 
      AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      AND (ai.meta->>'tags')::text[] ?| $1
    `, [tagArray]);
    
    console.log('Tags filter test result:', testResult.rows[0]);
    
  } catch (error) {
    console.error('Error checking tags data:', error);
  }
  
  process.exit(0);
}

checkTagsData();
