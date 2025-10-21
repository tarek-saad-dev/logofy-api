const express = require('express');
const router = express.Router();
const { migrateMultilingual } = require('../config/migrate-multilingual');

// Migration endpoint to add multilingual columns
router.post('/multilingual', async (req, res) => {
  try {
    console.log('🚀 Starting database migration to add multilingual columns...');
    
    // Run the existing migration
    await migrateMultilingual();

    console.log('✅ Migration completed successfully!');
    
    res.json({
      success: true,
      message: 'Multilingual migration completed successfully!',
      data: {
        migrationDetails: {
          title_en: 'English title (TEXT)',
          title_ar: 'Arabic title (TEXT)',
          description_en: 'English description (TEXT)',
          description_ar: 'Arabic description (TEXT)',
          tags_en: 'English tags (JSONB)',
          tags_ar: 'Arabic tags (JSONB)'
        },
        features: [
          'Full multilingual support (English & Arabic)',
          'RTL support for Arabic content',
          'Backward compatibility maintained',
          'Performance optimized with indexes',
          'Localized views and functions created',
          'Constraints added for data integrity'
        ],
        tables: ['logos', 'categories', 'assets', 'templates'],
        views: ['localized_logos', 'localized_categories', 'localized_assets', 'localized_templates'],
        functions: ['get_localized_text', 'get_localized_tags']
      },
      language: 'en',
      direction: 'ltr'
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message,
      language: 'en',
      direction: 'ltr'
    });
  }
});

// Get migration status
router.get('/status', async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    const result = await query(`
      SELECT 
          column_name, 
          data_type, 
          is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'logos' 
      AND column_name IN ('title_en', 'title_ar', 'description_en', 'description_ar', 'tags_en', 'tags_ar')
      ORDER BY column_name;
    `);

    const isMigrated = result.rows.length === 6;
    
    res.json({
      success: true,
      data: {
        isMigrated,
        columns: result.rows,
        status: isMigrated ? 'Migration completed' : 'Migration needed',
        message: isMigrated ? 
          'Multilingual support is enabled' : 
          'Run POST /api/migration/multilingual to enable multilingual support'
      },
      language: 'en',
      direction: 'ltr'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check migration status',
      error: error.message,
      language: 'en',
      direction: 'ltr'
    });
  }
});

module.exports = router;
