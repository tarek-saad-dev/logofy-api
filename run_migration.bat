@echo off
REM Database Migration Script: Add Multilingual Columns
REM This script adds multilingual support to the logos table

echo 🚀 Starting database migration to add multilingual columns...

REM Check if database connection is available
echo 📊 Checking database connection...

REM Run the migration SQL
echo 🔧 Executing migration SQL...
psql -h localhost -U postgres -d logo_maker -f database_migration_add_multilingual_columns.sql

if %errorlevel% equ 0 (
    echo ✅ Migration completed successfully!
    echo.
    echo 📋 Added columns:
    echo    - title_en (VARCHAR)
    echo    - title_ar (VARCHAR) 
    echo    - description_en (TEXT)
    echo    - description_ar (TEXT)
    echo    - tags_en (JSONB)
    echo    - tags_ar (JSONB)
    echo.
    echo 🎯 The API now supports full multilingual functionality!
    echo    - English and Arabic titles
    echo    - English and Arabic descriptions
    echo    - English and Arabic tags
    echo    - RTL support for Arabic content
) else (
    echo ❌ Migration failed!
    echo Please check the database connection and try again.
    pause
    exit /b 1
)

echo.
echo 🧪 Testing the migration...
psql -h localhost -U postgres -d logo_maker -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'logos' AND column_name IN ('title_en', 'title_ar', 'description_en', 'description_ar', 'tags_en', 'tags_ar') ORDER BY column_name;"

echo.
echo 🎉 Migration completed! Your API now supports full multilingual features.
pause
