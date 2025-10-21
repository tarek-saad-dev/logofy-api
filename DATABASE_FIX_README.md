# Database Fix Migration

This migration resolves all the database issues identified in the error logs from your logo maker API.

## Issues Fixed

### 1. Layer Type Enum Issue
**Problem**: The API was sending `'text'` (lowercase) but the database enum only accepted `'TEXT'` (uppercase).

**Solution**: 
- Added `'text'` as a valid value to the `layer_type` enum
- Updated the API code to normalize type values to uppercase before database insertion

### 2. Missing Underline Column
**Problem**: The `layer_text` table was missing the `underline` column and related text formatting columns.

**Solution**: Added the following columns to `layer_text`:
- `underline` (BOOLEAN)
- `underline_direction` (VARCHAR)
- `text_case` (VARCHAR)
- `font_style` (VARCHAR)
- `font_weight` (VARCHAR)
- `text_decoration` (VARCHAR)
- `text_transform` (VARCHAR)
- `font_variant` (VARCHAR)

### 3. Missing Multilingual Columns
**Problem**: The `categories`, `logos`, `assets`, and `templates` tables were missing multilingual columns.

**Solution**: Added multilingual columns to all relevant tables:
- `name_en`, `name_ar` (TEXT)
- `description_en`, `description_ar` (TEXT)
- `tags_en`, `tags_ar` (JSONB) - for logos and assets
- `title_en`, `title_ar` (TEXT) - for logos and templates

## Files Created

1. **`fix_database_issues.sql`** - The main migration SQL file
2. **`execute_fix_migration.ps1`** - PowerShell script to run the migration
3. **`run_fix_migration.js`** - Node.js script to run the migration
4. **`test_database_fixes.js`** - Test script to verify the fixes work

## How to Run the Migration

### Option 1: Using PowerShell (Recommended for Windows)
```powershell
.\execute_fix_migration.ps1
```

### Option 2: Using Node.js
```bash
node run_fix_migration.js
```

### Option 3: Using psql directly
```bash
psql $DATABASE_URL -f fix_database_issues.sql
```

## Prerequisites

- PostgreSQL database connection
- Node.js (for Node.js script)
- PowerShell (for PowerShell script)
- psql client (for direct SQL execution)

## Environment Setup

Make sure your `.env` file contains:
```
DATABASE_URL=postgresql://username:password@host:port/database
```

## Testing the Fixes

After running the migration, test the fixes:

```bash
node test_database_fixes.js
```

This will verify:
- Layer type enum accepts 'text' values
- Text formatting columns exist in layer_text table
- Multilingual columns exist in all tables
- Layer creation works with 'text' type
- Text layer creation works with underline support

## What the Migration Does

1. **Adds 'text' to layer_type enum** - Allows lowercase 'text' values
2. **Adds text formatting columns** - Supports underline, font styles, text cases, etc.
3. **Adds multilingual columns** - Supports English and Arabic localization
4. **Creates performance indexes** - Improves query performance
5. **Updates existing data** - Populates new columns with default values
6. **Creates helper functions** - Provides localization utilities
7. **Adds documentation** - Comments on all new columns and functions

## Backward Compatibility

The migration maintains backward compatibility by:
- Adding new columns with default values
- Populating multilingual fields from existing data
- Not removing any existing columns or data
- Supporting both old and new API formats

## Error Resolution

This migration fixes the following specific errors:

1. `error: invalid input value for enum layer_type: "text"`
2. `error: column "underline" of relation "layer_text" does not exist`
3. `error: column c.name_en does not exist`

## Next Steps

After running this migration:

1. **Test your API endpoints** to ensure they work correctly
2. **Check application logs** for any remaining issues
3. **Update your application code** if needed to use the new multilingual features
4. **Consider implementing** the localization helper functions in your API

## Support

If you encounter any issues with this migration:

1. Check the database connection string in your `.env` file
2. Ensure you have the necessary permissions to modify the database schema
3. Run the test script to identify any remaining issues
4. Check the PostgreSQL logs for detailed error messages

## Migration Safety

This migration is designed to be safe and non-destructive:
- Uses `IF NOT EXISTS` clauses to prevent errors on re-runs
- Preserves all existing data
- Adds new functionality without breaking existing features
- Can be run multiple times safely

