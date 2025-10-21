@echo off
echo 🚀 Starting database migration to add multilingual columns...
echo.

REM Try to find Node.js in common locations
set NODE_PATH=""
if exist "C:\Program Files\nodejs\node.exe" set NODE_PATH="C:\Program Files\nodejs\node.exe"
if exist "C:\Program Files (x86)\nodejs\node.exe" set NODE_PATH="C:\Program Files (x86)\nodejs\node.exe"
if exist "%APPDATA%\npm\node.exe" set NODE_PATH="%APPDATA%\npm\node.exe"

if "%NODE_PATH%"=="" (
    echo ❌ Node.js not found in common locations
    echo Please install Node.js or add it to your PATH
    echo.
    echo Alternative: Use Postman to call POST /api/migration/multilingual
    pause
    exit /b 1
)

echo 📊 Found Node.js at: %NODE_PATH%
echo 🔧 Running migration script...
echo.

%NODE_PATH% run_migration_direct.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Migration completed successfully!
    echo 🎯 Your API now supports full multilingual functionality!
) else (
    echo.
    echo ❌ Migration failed!
    echo Please check the error messages above.
)

echo.
pause
