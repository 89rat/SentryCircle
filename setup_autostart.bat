@echo off
SETLOCAL EnableDelayedExpansion

:: SentryCircle Auto-Start Setup Script
:: This script configures SentryCircle to start automatically when Windows starts

echo ===================================================
echo SentryCircle - Auto-Start Setup
echo ===================================================
echo.
echo This script will configure SentryCircle to start automatically
echo when Windows starts.
echo.
echo Options:
echo 1. Create a startup shortcut (recommended)
echo 2. Add to Windows Task Scheduler
echo 3. Add to Windows Registry
echo 4. Remove auto-start configuration
echo 5. Exit
echo.

set /p CHOICE="Enter your choice (1-5): "

:: Set the base directory to the location of this script
set "BASE_DIR=%~dp0"
cd /d "%BASE_DIR%"

:: Get the full path to startup.bat
set "STARTUP_SCRIPT=%BASE_DIR%startup.bat"

:: Ensure the startup script exists
if not exist "%STARTUP_SCRIPT%" (
    echo.
    echo ERROR: startup.bat not found at %STARTUP_SCRIPT%
    echo Please ensure you're running this script from the SentryCircle directory.
    echo.
    pause
    exit /b 1
)

if "%CHOICE%"=="1" goto create_shortcut
if "%CHOICE%"=="2" goto create_task
if "%CHOICE%"=="3" goto add_registry
if "%CHOICE%"=="4" goto remove_autostart
if "%CHOICE%"=="5" goto end

echo Invalid choice. Please try again.
goto end

:create_shortcut
echo.
echo Creating startup shortcut...

:: Get the Windows Startup folder
for /f "tokens=3* delims= " %%a in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders" /v Startup ^| findstr /i "Startup"') do set "STARTUP_FOLDER=%%a %%b"

:: Create a shortcut in the Startup folder
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%STARTUP_FOLDER%\SentryCircle.lnk" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "%STARTUP_SCRIPT%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%BASE_DIR%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "Start SentryCircle" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.IconLocation = "%SystemRoot%\System32\SHELL32.dll,21" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WindowStyle = 1 >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"
cscript //nologo "%TEMP%\CreateShortcut.vbs"
del "%TEMP%\CreateShortcut.vbs"

echo.
echo Startup shortcut created successfully!
echo SentryCircle will start automatically when you log in to Windows.
echo.
goto end

:create_task
echo.
echo Creating scheduled task...

:: Create a scheduled task to run at logon
schtasks /create /tn "SentryCircle" /tr "\"%STARTUP_SCRIPT%\" silent" /sc onlogon /ru "%USERNAME%" /rl highest /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Scheduled task created successfully!
    echo SentryCircle will start automatically when you log in to Windows.
    echo.
) else (
    echo.
    echo Failed to create scheduled task. Error code: %ERRORLEVEL%
    echo Please try running this script as administrator.
    echo.
)
goto end

:add_registry
echo.
echo Adding to Windows Registry...

:: Add to the registry
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "SentryCircle" /t REG_SZ /d "\"%STARTUP_SCRIPT%\" silent" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Registry entry added successfully!
    echo SentryCircle will start automatically when you log in to Windows.
    echo.
) else (
    echo.
    echo Failed to add registry entry. Error code: %ERRORLEVEL%
    echo Please try running this script as administrator.
    echo.
)
goto end

:remove_autostart
echo.
echo Removing auto-start configuration...

:: Remove startup shortcut
for /f "tokens=3* delims= " %%a in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders" /v Startup ^| findstr /i "Startup"') do set "STARTUP_FOLDER=%%a %%b"
if exist "%STARTUP_FOLDER%\SentryCircle.lnk" (
    del "%STARTUP_FOLDER%\SentryCircle.lnk"
    echo Removed startup shortcut.
)

:: Remove scheduled task
schtasks /query /tn "SentryCircle" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    schtasks /delete /tn "SentryCircle" /f
    echo Removed scheduled task.
)

:: Remove registry entry
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "SentryCircle" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "SentryCircle" /f
    echo Removed registry entry.
)

echo.
echo Auto-start configuration removed successfully!
echo.
goto end

:end
pause
