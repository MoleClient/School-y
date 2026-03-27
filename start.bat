@echo off
title School-y Launcher
color 0A
cls

echo.
echo  ==========================================
echo   School-y - Local Setup
echo  ==========================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo.
    echo  Please download and install Node.js from:
    echo  https://nodejs.org  (choose the LTS version)
    echo.
    echo  After installing Node.js, run this file again.
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  Node.js found: %NODE_VER%

:: Check for .env file
if not exist ".env" (
    echo.
    echo  ==========================================
    echo   Database Setup Required
    echo  ==========================================
    echo.
    echo  School-y needs a free PostgreSQL database.
    echo  Get one free at: https://neon.tech
    echo.
    echo  Steps:
    echo    1. Go to https://neon.tech and sign up free
    echo    2. Create a new project
    echo    3. Copy the "Connection string" (starts with postgres://)
    echo    4. Paste it below
    echo.
    set /p DB_URL="  Paste your database URL here: "
    echo DATABASE_URL=%DB_URL%> .env
    echo.
    echo  Saved! You won't need to do this again.
    echo.
)

:: Install dependencies
echo  Installing dependencies (first time may take a minute)...
call npm install --silent
if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo  Dependencies ready.

:: Push database schema
echo  Setting up database tables...
call npx drizzle-kit push --config=drizzle.config.ts >nul 2>&1
echo  Database ready.

:: Start server in background
echo.
echo  Starting School-y server...
start /b cmd /c "npm run dev > server.log 2>&1"

:: Wait for server to start
echo  Waiting for server to start...
timeout /t 4 /nobreak >nul

:: Open browser
echo  Opening browser...
start http://localhost:5000

echo.
echo  ==========================================
echo   School-y is running at localhost:5000
echo  ==========================================
echo.
echo  Keep this window open while using School-y.
echo  Press Ctrl+C or close this window to stop.
echo.

:: Keep window alive and show server output
type server.log 2>nul
echo  Watching for server output...
:loop
timeout /t 2 /nobreak >nul
goto loop
