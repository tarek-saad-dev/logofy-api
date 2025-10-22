const { query } = require('./api/config/database');

async function testTagsFilter() {
  try {
    console.log('Testing new tags filter approach...');
    
    const tagArray = ['arrow'];
    const jsonArray = JSON.stringify(tagArray);
    console.log('Tag array:', tagArray);
    console.log('JSON string:', jsonArray);
    
    // Test the new approach
    const testResult = await query(`
      SELECT COUNT(*) as count
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') 
      AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      AND ai.meta->'tags' @> $1
    `, [jsonArray]);
    
    console.log('New approach result:', testResult.rows[0]);
    
    // Test with individual tag
    const singleTagResult = await query(`
      SELECT COUNT(*) as count
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') 
      AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      AND ai.meta->'tags' @> $1
    `, ['["arrow"]']);
    
    console.log('Single tag result:', singleTagResult.rows[0]);
    
  } catch (error) {
    console.error('Error testing tags filter:', error);
  }
  
  process.exit(0);
}

testTagsFilter();
