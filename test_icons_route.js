const express = require('express');
const { query } = require('./api/config/database');

const app = express();
app.use(express.json());

// Simple test route
app.get('/test-icons', async (req, res) => {
  try {
    console.log('Testing icons route...');
    
    const iconsRes = await query(`
      SELECT 
        ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
        ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
        ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      ORDER BY ai.created_at DESC
      LIMIT $1 OFFSET $2
    `, [50, 0]);
    
    console.log('Query successful, rows:', iconsRes.rows.length);
    
    const icons = iconsRes.rows.map(icon => ({
      id: icon.id,
      name: icon.name,
      url: icon.url,
      type: icon.kind,
      width: icon.width,
      height: icon.height,
      hasAlpha: icon.has_alpha,
      vectorSvg: icon.vector_svg,
      dominantColor: icon.dominant_hex,
      category: icon.meta?.category || 'general',
      tags: Array.isArray(icon.meta?.tags) ? icon.meta.tags : (icon.meta?.tags ? icon.meta.tags.split(',') : []),
      description: icon.meta?.description || '',
      keywords: icon.meta?.keywords || [],
      style: icon.meta?.style || 'outline',
      isPopular: icon.meta?.is_popular || false,
      isNew: icon.meta?.is_new || false,
      downloadCount: icon.meta?.download_count || 0,
      createdAt: new Date(icon.created_at).toISOString(),
      updatedAt: new Date(icon.updated_at).toISOString()
    }));
    
    console.log('Icons formatted, count:', icons.length);
    
    const response = {
      success: true,
      data: icons,
      count: icons.length
    };
    
    console.log('Response prepared, sending...');
    res.json(response);
    
  } catch (error) {
    console.error('Error in test route:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch icons",
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
