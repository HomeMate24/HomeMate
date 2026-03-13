@echo off
echo Creating HomeMate Hub Database...
echo.

REM Prompt for PostgreSQL password
set /p PGPASSWORD="Enter your PostgreSQL password: "

echo.
echo Connecting to PostgreSQL...

REM Create database
psql -U postgres -c "CREATE DATABASE homemate_hub;"

if %errorlevel% equ 0 (
    echo.
    echo ✓ Database 'homemate_hub' created successfully!
    echo.
) else (
    echo.
    echo Note: If you see "database already exists" error, that's fine!
    echo The database is already created.
    echo.
)

echo Press any key to close...
pause >nul
