# Database Fix Migration Script
# This script executes the comprehensive database fix migration
# Date: 2025-01-21

Write-Host "🚀 Starting Database Fix Migration..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

# Get database URL
$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) {
    Write-Host "❌ Error: DATABASE_URL not found in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables loaded" -ForegroundColor Green
Write-Host "📊 Database URL: $($databaseUrl.Substring(0, [Math]::Min(50, $databaseUrl.Length)))..." -ForegroundColor Cyan

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js to run this migration" -ForegroundColor Yellow
    exit 1
}

# Check if psql is available
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL client version: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: psql not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools" -ForegroundColor Yellow
    exit 1
}

# Execute the migration
Write-Host "🔄 Executing database fix migration..." -ForegroundColor Yellow

try {
    # Use psql to execute the migration
    $migrationFile = "fix_database_issues.sql"
    if (-not (Test-Path $migrationFile)) {
        Write-Host "❌ Error: Migration file $migrationFile not found!" -ForegroundColor Red
        exit 1
    }

    # Execute the migration
    psql $databaseUrl -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database fix migration completed successfully!" -ForegroundColor Green
        Write-Host "" -ForegroundColor White
        Write-Host "🎉 All database issues have been resolved:" -ForegroundColor Green
        Write-Host "   • Fixed layer_type enum to accept 'text' values" -ForegroundColor White
        Write-Host "   • Added missing underline column to layer_text table" -ForegroundColor White
        Write-Host "   • Added multilingual columns to all tables" -ForegroundColor White
        Write-Host "   • Created performance indexes" -ForegroundColor White
        Write-Host "   • Updated existing data for backward compatibility" -ForegroundColor White
        Write-Host "   • Created localization helper functions" -ForegroundColor White
        Write-Host "" -ForegroundColor White
        Write-Host "🚀 Your logo maker API should now work without database errors!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error executing migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor White
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test your API endpoints to ensure they work correctly" -ForegroundColor White
Write-Host "   2. Check the application logs for any remaining issues" -ForegroundColor White
Write-Host "   3. Update your application code if needed to use the new multilingual features" -ForegroundColor White

