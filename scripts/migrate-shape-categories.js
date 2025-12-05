#!/usr/bin/env node

/**
 * Migration script to create shape_categories and shape_category_assignments tables
 * 
 * Usage:
 *   node scripts/migrate-shape-categories.js
 *   OR
 *   npm run migrate:shape-categories
 */

require('dotenv').config();
const path = require('path');

// Set the path to the api/config directory
process.chdir(path.join(__dirname, '..'));

const { migrateShapeCategories } = require('../api/config/migrate-shape-categories');
const { testConnection } = require('../api/config/database');

async function runMigration() {
    console.log('🚀 Starting shape categories migration...\n');

    try {
        // Test database connection first
        console.log('📡 Testing database connection...');
        const isConnected = await testConnection();
        
        if (!isConnected) {
            console.error('❌ Cannot connect to database.');
            console.error('Please check your DATABASE_URL in .env file');
            process.exit(1);
        }
        
        console.log('✅ Database connection successful\n');

        // Run the migration
        await migrateShapeCategories();

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   - shape_categories table created');
        console.log('   - shape_category_assignments table created');
        console.log('   - Indexes created for optimal performance');
        console.log('   - Foreign key constraints set up');
        console.log('   - Sample categories inserted');
        console.log('\n✨ You can now use the shapes library system!');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };




















