@echo off
SETLOCAL EnableDelayedExpansion

:: SentryCircle Startup Script
:: This script starts all components of the SentryCircle application
:: and ensures they continue running.

:: Set the base directory to the location of this script
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

:: Create a log directory if it doesn't exist
if not exist logs mkdir logs

:: Set log file with timestamp
set "LOG_FILE=logs\startup_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log"
set "LOG_FILE=%LOG_FILE: =0%"

:: Function to log messages
:log
echo %date% %time% - %* >> "%LOG_FILE%"
echo %*
goto :eof

:: Start logging
call :log "SentryCircle startup script initiated"
call :log "Base directory: %BASE_DIR%"

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    call :log "ERROR: Node.js is not installed or not in PATH. Please install Node.js and try again."
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
call :log "Node.js version: %NODE_VERSION%"

:: Check if required directories exist
if not exist "cloudflare-worker" (
    call :log "ERROR: cloudflare-worker directory not found. Please run setup.bat first."
    pause
    exit /b 1
)

if not exist "web-dashboard" (
    call :log "ERROR: web-dashboard directory not found. Please run setup.bat first."
    pause
    exit /b 1
)

:: Check if configuration files exist
if not exist "cloudflare-worker\wrangler.toml.configured" (
    call :log "ERROR: Cloudflare Worker not configured. Please run setup.bat first."
    pause
    exit /b 1
)

:: Start Cloudflare Worker in development mode
call :log "Starting Cloudflare Worker in development mode..."
start "SentryCircle - Cloudflare Worker" cmd /c "cd cloudflare-worker && npx wrangler dev --local > ..\logs\worker.log 2>&1"
if %ERRORLEVEL% NEQ 0 (
    call :log "WARNING: Failed to start Cloudflare Worker. Check logs\worker.log for details."
) else (
    call :log "Cloudflare Worker started successfully."
)

:: Wait for the worker to initialize
call :log "Waiting for Cloudflare Worker to initialize (5 seconds)..."
timeout /t 5 /nobreak > nul

:: Start Web Dashboard
call :log "Starting Web Dashboard..."
start "SentryCircle - Web Dashboard" cmd /c "cd web-dashboard && npm start > ..\logs\dashboard.log 2>&1"
if %ERRORLEVEL% NEQ 0 (
    call :log "WARNING: Failed to start Web Dashboard. Check logs\dashboard.log for details."
) else (
    call :log "Web Dashboard started successfully."
)

:: Wait for the dashboard to initialize
call :log "Waiting for Web Dashboard to initialize (10 seconds)..."
timeout /t 10 /nobreak > nul

:: Open the dashboard in the default browser
call :log "Opening Web Dashboard in default browser..."
start http://localhost:3000

:: Check if mobile app development is requested
set /p MOBILE_DEV="Do you want to start the mobile app development server? (y/n): "
if /i "%MOBILE_DEV%"=="y" (
    call :log "Starting React Native development server..."
    start "SentryCircle - Mobile App" cmd /c "cd mobile-app && npx react-native start > ..\logs\mobile.log 2>&1"
    if %ERRORLEVEL% NEQ 0 (
        call :log "WARNING: Failed to start React Native server. Check logs\mobile.log for details."
    ) else (
        call :log "React Native development server started successfully."
    )
    
    :: Ask if user wants to run on Android
    set /p ANDROID_DEV="Do you want to run the app on an Android device/emulator? (y/n): "
    if /i "%ANDROID_DEV%"=="y" (
        call :log "Starting Android app..."
        start "SentryCircle - Android" cmd /c "cd mobile-app && npx react-native run-android > ..\logs\android.log 2>&1"
    )
    
    :: Ask if user wants to run on iOS (only if on macOS)
    ver | findstr /i "Windows" > nul
    if %ERRORLEVEL% NEQ 0 (
        set /p IOS_DEV="Do you want to run the app on an iOS device/simulator? (y/n): "
        if /i "%IOS_DEV%"=="y" (
            call :log "Starting iOS app..."
            start "SentryCircle - iOS" cmd /c "cd mobile-app && npx react-native run-ios > ..\logs\ios.log 2>&1"
        )
    )
)

:: Create a watchdog process to ensure services stay running
call :log "Starting watchdog process..."
start "SentryCircle - Watchdog" cmd /c "cd %BASE_DIR% && watchdog.bat"

call :log "SentryCircle startup complete. The application is now running."
call :log "Web Dashboard: http://localhost:3000"
call :log "Cloudflare Worker: http://localhost:8787"
call :log "Log files are available in the logs directory."

:: Keep the window open if run directly
if "%1"=="" pause
exit /b 0
