# 🌍 Multilingual Database Migration

This migration adds full multilingual support to the Logo Maker API by adding English and Arabic columns to the database schema.

## 📋 What This Migration Adds

### New Database Columns:
- `title_en` (VARCHAR) - English title
- `title_ar` (VARCHAR) - Arabic title  
- `description_en` (TEXT) - English description
- `description_ar` (TEXT) - Arabic description
- `tags_en` (JSONB) - English tags array
- `tags_ar` (JSONB) - Arabic tags array

### Features Enabled:
- ✅ **Full Multilingual Support** - Store content in both English and Arabic
- ✅ **RTL Support** - Right-to-left text direction for Arabic
- ✅ **Backward Compatibility** - Existing logos continue to work
- ✅ **Performance Optimized** - Indexes added for fast multilingual searches
- ✅ **Data Migration** - Existing data automatically populated in new columns

## 🚀 How to Run the Migration

### Option 1: Using the Batch File (Windows)
```bash
run_migration.bat
```

### Option 2: Using the Shell Script (Linux/Mac)
```bash
chmod +x run_migration.sh
./run_migration.sh
```

### Option 3: Manual SQL Execution
```bash
psql -h localhost -U postgres -d logo_maker -f database_migration_add_multilingual_columns.sql
```

## 🧪 Testing the Migration

After running the migration, test with these Postman requests:

### 1. Simple Test
Use **"Create Logo - Simple Test"** to verify basic functionality.

### 2. Multilingual Test  
Use **"Create Logo - Multilingual Example"** to test:
- English and Arabic titles
- English and Arabic descriptions  
- English and Arabic tags
- RTL support

### 3. Advanced Features Test
Use **"Create Logo - All Features"** to test:
- Gradient backgrounds
- Shape src properties
- Text gradients
- All advanced styling options

## 📊 Verification

The migration script will automatically verify the new columns exist:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'logos' 
AND column_name IN ('title_en', 'title_ar', 'description_en', 'description_ar', 'tags_en', 'tags_ar')
ORDER BY column_name;
```

## 🔧 API Usage Examples

### Creating Multilingual Logos

```json
{
  "title": "Multilingual Logo",
  "title_en": "Multilingual Logo", 
  "title_ar": "شعار متعدد اللغات",
  "description": "A logo with multilingual support",
  "description_en": "A logo with multilingual support",
  "description_ar": "شعار مع دعم متعدد اللغات",
  "tags": ["logo", "multilingual"],
  "tags_en": ["logo", "multilingual"],
  "tags_ar": ["شعار", "متعدد اللغات"],
  "canvas_w": 1080,
  "canvas_h": 1080,
  "layers": [...]
}
```

### Retrieving with Localization

```bash
# English
GET /api/logo/123?lang=en

# Arabic  
GET /api/logo/123?lang=ar
```

## 🎯 Benefits

1. **Full Localization** - Complete English/Arabic support
2. **RTL Support** - Proper right-to-left text handling
3. **Backward Compatible** - Existing logos continue working
4. **Performance** - Optimized with proper indexes
5. **Future Ready** - Easy to add more languages later

## ⚠️ Important Notes

- **Backup First** - Always backup your database before running migrations
- **Test Environment** - Test the migration in a development environment first
- **Rollback Plan** - Keep the original schema for rollback if needed
- **Data Integrity** - Existing data is automatically migrated to new columns

## 🆘 Troubleshooting

### Common Issues:

1. **Permission Denied**
   ```bash
   # Ensure PostgreSQL user has proper permissions
   GRANT ALL PRIVILEGES ON DATABASE logo_maker TO your_user;
   ```

2. **Connection Failed**
   ```bash
   # Check PostgreSQL is running
   sudo service postgresql status
   ```

3. **Column Already Exists**
   ```bash
   # The migration uses IF NOT EXISTS, so it's safe to run multiple times
   ```

## 🎉 Success!

Once the migration completes successfully, your Logo Maker API will support:

- ✅ **Complete Multilingual Functionality**
- ✅ **All Advanced Features** (gradients, shape src, etc.)
- ✅ **RTL Support for Arabic**
- ✅ **Backward Compatibility**
- ✅ **Performance Optimized**

Your API is now ready for international users! 🌍
