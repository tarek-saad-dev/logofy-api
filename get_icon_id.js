const { query } = require('./api/config/database');

async function getIconId() {
  try {
    const result = await query(`
      SELECT id, name
      FROM assets 
      WHERE meta->>'library_type' = 'icon' 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      console.log('Icon ID:', result.rows[0].id);
      console.log('Icon Name:', result.rows[0].name);
    } else {
      console.log('No icons found');
    }
    
  } catch (error) {
    console.error('Error getting icon ID:', error);
  }
  
  process.exit(0);
}

getIconId();
