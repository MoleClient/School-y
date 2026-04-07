@echo off
title School-y Tunnel
color 0A

echo ============================================
echo   School-y -- Cloudflare Tunnel Launcher
echo ============================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Download it from https://nodejs.org and try again.
  pause
  exit /b 1
)

:: Install packages if needed
if not exist "node_modules" (
  echo Installing packages (first time only)...
  call npm install
  echo.
)

:: Download cloudflared if missing
if not exist "cloudflared.exe" (
  echo Downloading Cloudflare Tunnel tool...
  powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe' }"
  if not exist "cloudflared.exe" (
    echo [ERROR] Could not download cloudflared. Check your internet connection.
    pause
    exit /b 1
  )
  echo Done.
  echo.
)

:: Start the School-y server in background
echo Starting School-y server...
start /b /min cmd /c "npm run dev > server.log 2>&1"
timeout /t 4 /nobreak >nul

:: Start Cloudflare tunnel and capture the URL
echo Starting Cloudflare tunnel...
echo.
echo ============================================
echo   SHARE THE URL BELOW WITH YOUR DEVICE
echo   (Look for the https://...trycloudflare.com line)
echo ============================================
echo.

cloudflared.exe tunnel --url http://localhost:5000
