const express = require('express');
const router = express.Router();
const { migrateMultilingual } = require('../config/migrate-multilingual');
const { migrateRefreshTokens } = require('../config/migrate-refresh-tokens');

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

// Migration endpoint for refresh tokens table
router.post('/refresh-tokens', async (req, res) => {
  try {
    console.log('🚀 Starting refresh tokens migration...');
    
    // Run the migration
    await migrateRefreshTokens();

    console.log('✅ Refresh tokens migration completed successfully!');
    
    res.json({
      success: true,
      message: 'Refresh tokens migration completed successfully!',
      data: {
        table: 'refresh_tokens',
        columns: [
          'id (UUID PRIMARY KEY)',
          'user_id (UUID, FOREIGN KEY)',
          'token (TEXT UNIQUE)',
          'expires_at (TIMESTAMP)',
          'created_at (TIMESTAMP)',
          'revoked (BOOLEAN)'
        ],
        indexes: [
          'idx_refresh_tokens_user_id',
          'idx_refresh_tokens_token',
          'idx_refresh_tokens_expires_at'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Refresh tokens migration failed',
      error: error.message
    });
  }
});

// Get refresh tokens migration status
router.get('/refresh-tokens/status', async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    const result = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'refresh_tokens'
      );
    `);

    const exists = result.rows[0].exists;
    
    if (exists) {
      // Get table info
      const columns = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'refresh_tokens'
        ORDER BY ordinal_position;
      `);

      const indexes = await query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'refresh_tokens';
      `);

      res.json({
        success: true,
        data: {
          exists: true,
          columns: columns.rows,
          indexes: indexes.rows.map(i => i.indexname),
          status: 'Migration completed',
          message: 'Refresh tokens table exists and is ready'
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          exists: false,
          status: 'Migration needed',
          message: 'Run POST /api/migration/refresh-tokens to create the table'
        }
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check migration status',
      error: error.message
    });
  }
});

module.exports = router;
