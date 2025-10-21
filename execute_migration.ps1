# PowerShell script to execute the multilingual migration
# This script will run the SQL migration directly

Write-Host "🚀 Starting database migration to add multilingual columns..." -ForegroundColor Green

# Database connection parameters (update these if needed)
$hostname = "localhost"
$port = "5432"
$database = "logo_maker"
$username = "postgres"
$password = "password"  # Update this with your actual password

# Read the SQL migration file
$sqlFile = "database_migration_add_multilingual_columns.sql"
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "📊 Reading migration SQL file..." -ForegroundColor Yellow

try {
    # Try to use psql if available
    Write-Host "🔧 Attempting to execute migration with psql..." -ForegroundColor Yellow
    
    # Set PGPASSWORD environment variable
    $env:PGPASSWORD = $password
    
    # Execute the migration
    $result = & psql -h $hostname -p $port -U $username -d $database -c $sqlContent 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Added columns:" -ForegroundColor Cyan
        Write-Host "   - title_en (VARCHAR)" -ForegroundColor White
        Write-Host "   - title_ar (VARCHAR)" -ForegroundColor White
        Write-Host "   - description_en (TEXT)" -ForegroundColor White
        Write-Host "   - description_ar (TEXT)" -ForegroundColor White
        Write-Host "   - tags_en (JSONB)" -ForegroundColor White
        Write-Host "   - tags_ar (JSONB)" -ForegroundColor White
        Write-Host ""
        Write-Host "🎯 The API now supports full multilingual functionality!" -ForegroundColor Green
        Write-Host "   - English and Arabic titles" -ForegroundColor White
        Write-Host "   - English and Arabic descriptions" -ForegroundColor White
        Write-Host "   - English and Arabic tags" -ForegroundColor White
        Write-Host "   - RTL support for Arabic content" -ForegroundColor White
        
        # Show verification results
        Write-Host ""
        Write-Host "🧪 Migration verification:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor White
        
    } else {
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        Write-Host ""
        Write-Host "Please check:" -ForegroundColor Yellow
        Write-Host "1. PostgreSQL is running" -ForegroundColor White
        Write-Host "2. Database '$database' exists" -ForegroundColor White
        Write-Host "3. User '$username' has proper permissions" -ForegroundColor White
        Write-Host "4. Update the password in this script if needed" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ psql command not found!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative methods:" -ForegroundColor Yellow
    Write-Host "1. Install PostgreSQL client tools" -ForegroundColor White
    Write-Host "2. Use the API migration endpoint: POST /api/migration/multilingual" -ForegroundColor White
    Write-Host "3. Use pgAdmin or another PostgreSQL client" -ForegroundColor White
}

Write-Host ""
Write-Host "Migration script completed!" -ForegroundColor Green
