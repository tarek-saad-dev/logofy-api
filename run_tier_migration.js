const { query } = require('./api/config/database');
const fs = require('fs');
const path = require('path');

async function runTierMigration() {
  try {
    console.log('🔄 Running tier columns migration...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'add_tier_columns_to_users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute statements in order, handling comments separately
    const lines = sql.split('\n');
    let currentStatement = '';
    const statements = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and standalone comments
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }

      currentStatement += (currentStatement ? ' ' : '') + trimmed;

      // If line ends with semicolon, it's a complete statement
      if (trimmed.endsWith(';')) {
        statements.push(currentStatement.replace(/;$/g, '').trim());
        currentStatement = '';
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    // Execute statements in order
    for (const statement of statements) {
      if (!statement) continue;

      try {
        await query(statement);
        const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
        console.log('✅ Executed:', preview + '...');
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('does not exist') && error.message.includes('COMMENT')) {
          const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
          console.log('⚠️  Skipped:', preview + '...');
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Tier columns migration completed successfully!');
    console.log('\n📋 Added columns:');
    console.log('   - users.tier (TEXT, nullable)');
    console.log('   - users.tier_expires_at (TIMESTAMPTZ, nullable)');
    console.log('   - Index on (tier, tier_expires_at)');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTierMigration()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runTierMigration };

