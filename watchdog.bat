@echo off
SETLOCAL EnableDelayedExpansion

:: SentryCircle Watchdog Script
:: This script monitors the running services and restarts them if they crash

:: Set the base directory to the location of this script
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

:: Create a log directory if it doesn't exist
if not exist logs mkdir logs

:: Set log file with timestamp
set "LOG_FILE=logs\watchdog_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log"
set "LOG_FILE=%LOG_FILE: =0%"

:: Function to log messages
:log
echo %date% %time% - %* >> "%LOG_FILE%"
echo %*
goto :eof

:: Start logging
call :log "SentryCircle watchdog started"

:: Set check interval (in seconds)
set CHECK_INTERVAL=30

:: Main watchdog loop
:watchdog_loop
    :: Check if Cloudflare Worker is running
    tasklist /FI "WINDOWTITLE eq SentryCircle - Cloudflare Worker" | findstr /i "cmd.exe" > nul
    if %ERRORLEVEL% NEQ 0 (
        call :log "Cloudflare Worker is not running. Restarting..."
        start "SentryCircle - Cloudflare Worker" cmd /c "cd cloudflare-worker && npx wrangler dev --local > ..\logs\worker_restarted.log 2>&1"
    )
    
    :: Check if Web Dashboard is running
    tasklist /FI "WINDOWTITLE eq SentryCircle - Web Dashboard" | findstr /i "cmd.exe" > nul
    if %ERRORLEVEL% NEQ 0 (
        call :log "Web Dashboard is not running. Restarting..."
        start "SentryCircle - Web Dashboard" cmd /c "cd web-dashboard && npm start > ..\logs\dashboard_restarted.log 2>&1"
    )
    
    :: Check if React Native server is running (if it was started)
    tasklist /FI "WINDOWTITLE eq SentryCircle - Mobile App" | findstr /i "cmd.exe" > nul
    if %ERRORLEVEL% EQU 0 (
        :: React Native server was started, check if it's still running
        tasklist /FI "WINDOWTITLE eq SentryCircle - Mobile App" | findstr /i "cmd.exe" > nul
        if %ERRORLEVEL% NEQ 0 (
            call :log "React Native server is not running. Restarting..."
            start "SentryCircle - Mobile App" cmd /c "cd mobile-app && npx react-native start > ..\logs\mobile_restarted.log 2>&1"
        )
    )
    
    :: Wait for the next check
    timeout /t %CHECK_INTERVAL% /nobreak > nul
    
    :: Loop back
    goto watchdog_loop
