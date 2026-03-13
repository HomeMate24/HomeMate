@echo off
echo ================================================
echo HomeMate Hub - Automated Backend Setup
echo ================================================
echo.

REM Navigate to backend directory
cd /d "%~dp0"

echo [1/8] Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm is not available!
    pause
    exit /b 1
)
echo ✓ Node.js and npm are installed
echo.

echo [2/8] Installing backend dependencies...
echo This may take 1-2 minutes...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

echo [3/8] Checking PostgreSQL installation...
psql --version
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL CLI (psql) not found in PATH
    echo PostgreSQL might be installed but not added to PATH
    echo You may need to create the database manually
    echo.
) else (
    echo ✓ PostgreSQL is installed
    echo.
)

echo [4/8] Checking .env configuration...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please copy .env.example to .env and configure it
    pause
    exit /b 1
)
echo ✓ .env file exists
echo.

echo ================================================
echo IMPORTANT: Database Setup Required
echo ================================================
echo.
echo Before continuing, make sure you have:
echo 1. PostgreSQL installed and running
echo 2. Created the database with:
echo    psql -U postgres
echo    CREATE DATABASE homemate_hub;
echo    \q
echo 3. Updated .env file with your PostgreSQL password
echo.
echo Press any key to continue setup...
pause >nul
echo.

echo [5/8] Generating Prisma Client...
npm run prisma:generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma Client!
    pause
    exit /b 1
)
echo ✓ Prisma Client generated
echo.

echo [6/8] Running database migrations...
echo This will create all tables in the database...
npm run prisma:migrate
if %errorlevel% neq 0 (
    echo ERROR: Database migration failed!
    echo.
    echo Common causes:
    echo - Database 'homemate_hub' doesn't exist
    echo - Wrong PostgreSQL password in .env file
    echo - PostgreSQL server not running
    echo.
    pause
    exit /b 1
)
echo ✓ Database migrations completed
echo.

echo [7/8] Seeding database with initial data...
echo This will add test users, areas, and services...
npm run prisma:seed
if %errorlevel% neq 0 (
    echo WARNING: Database seeding failed
    echo You can continue but there won't be test data
    echo.
) else (
    echo ✓ Database seeded successfully
    echo.
)

echo [8/8] Starting development server...
echo.
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Backend will start at: http://localhost:5000
echo.
echo Test accounts:
echo - Client: client@test.com / password123
echo - Worker1: worker1@test.com / password123
echo - Worker2: worker2@test.com / password123
echo - Worker3: worker3@test.com / password123
echo.
echo Press Ctrl+C to stop the server
echo ================================================
echo.

npm run dev
